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
    console.error("Erro no webhook:", err.message);
    return new NextResponse(`Erro: ${err.message}`, { status: 400 });
  }

  console.log("Evento recebido:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.firebaseUID;

        if (!uid) {
          console.error("UID não encontrado nos metadados da sessão.");
          break;
        }

        const subscriptionId = session.subscription as string;
        // Recupera a assinatura para obter a data de expiração (current_period_end)
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const currentPeriodEnd = subscription.current_period_end;

        // Atualiza o documento do usuário no Firestore com status Ativo
        await adminDb.collection("users").doc(uid).set({
          subscriptionStatus: "Ativo",
          subscriptionId,
          stripeCustomerId: session.customer as string,
          currentPeriodEnd: new Date(currentPeriodEnd * 1000).toISOString(),
          plan: "pro",
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        console.log("Usuário ativado via checkout com sucesso:", uid);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) {
          console.log("Fatura sem assinatura associada.");
          break;
        }

        // Busca o usuário pelo subscriptionId no Firestore
        const usersSnapshot = await adminDb
          .collection("users")
          .where("subscriptionId", "==", subscriptionId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
          
          await userDoc.ref.update({
            subscriptionStatus: "Ativo",
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
          });
          console.log("Renovação confirmada para usuário:", userDoc.id);
        } else {
          console.warn("Usuário não encontrado para a assinatura:", subscriptionId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
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

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

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
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro ao processar dados do webhook:", error);
    return new NextResponse("Erro interno ao processar o webhook", { status: 500 });
  }
}