export const dynamic = "force-dynamic";

import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) return new NextResponse("Sem assinatura", { status: 400 });

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET não configurada.");
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Erro na assinatura do webhook:", err.message);
    return new NextResponse(`Erro: ${err.message}`, { status: 400 });
  }

  console.log("Evento Stripe recebido:", event.type, event.id);

  try {
    // 1. Evitar execução duplicada
    const eventRef = adminDb.collection("stripeEvents").doc(event.id);
    const eventDoc = await eventRef.get();

    if (eventDoc.exists) {
      console.log("Evento já processado anteriormente:", event.id);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Processamento dos eventos
    switch (event.type) {
      case "checkout.session.completed": {
        // Apenas log conforme solicitado, ativação agora é via invoice.payment_succeeded
        console.log("Checkout concluído (aguardando confirmação de pagamento):", event.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        
        // Tenta extrair o UID de vários caminhos possíveis nos metadados
        const uid = 
          invoice.subscription_details?.metadata?.firebaseUID || 
          invoice.metadata?.firebaseUID ||
          invoice.lines?.data?.[0]?.metadata?.firebaseUID;

        const subscriptionId = invoice.subscription;

        if (!subscriptionId) break;

        // Recuperar a assinatura para obter dados atualizados (como current_period_end)
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        
        // Se o UID não estiver na fatura, tentamos pegar da assinatura
        const finalUid = uid || (subscription.metadata as any).firebaseUID;

        if (!finalUid) {
          console.warn("UID não encontrado para ativação da fatura:", subscriptionId);
          break;
        }

        await adminDb.collection("users").doc(finalUid).set({
          subscriptionStatus: "Ativo",
          subscriptionId: subscription.id,
          stripeCustomerId: invoice.customer as string,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          plan: "pro",
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        console.log("Assinatura ativada/renovada com sucesso:", finalUid);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const usersSnapshot = await adminDb
            .collection("users")
            .where("subscriptionId", "==", subscriptionId)
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            await usersSnapshot.docs[0].ref.update({
              subscriptionStatus: "Pendente",
              updatedAt: new Date().toISOString(),
            });
            console.log("Pagamento falhou, status alterado para Pendente:", subscriptionId);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const usersSnapshot = await adminDb
          .collection("users")
          .where("subscriptionId", "==", subscription.id)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          await usersSnapshot.docs[0].ref.update({
            subscriptionStatus: "Cancelado",
            updatedAt: new Date().toISOString(),
          });
          console.log("Assinatura cancelada no banco de dados:", subscription.id);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        
        if (subscription.status === "past_due") {
          const usersSnapshot = await adminDb
            .collection("users")
            .where("subscriptionId", "==", subscription.id)
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            await usersSnapshot.docs[0].ref.update({
              subscriptionStatus: "Pendente",
              updatedAt: new Date().toISOString(),
            });
            console.log("Assinatura em atraso (past_due), status alterado para Pendente:", subscription.id);
          }
        }
        break;
      }
    }

    // 2. Salvar evento como processado
    await eventRef.set({
      createdAt: new Date().toISOString(),
      eventType: event.type,
    });

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Erro ao processar dados do webhook:", error);
    return new NextResponse("Erro interno ao processar o webhook", { status: 500 });
  }
}
