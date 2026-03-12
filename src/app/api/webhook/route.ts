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

    switch (event.type) {
      case "checkout.session.completed": {
        console.log("Checkout concluído (log apenas):", event.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const uid = subscription.metadata?.firebaseUID;

        if (uid) {
          await adminDb.collection("users").doc(uid).set({
            subscriptionStatus: "Ativo",
            subscriptionId: subscription.id,
            stripeCustomerId: invoice.customer,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            plan: "pro",
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          console.log("Assinatura ativada/paga via invoice.paid:", uid);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        
        const usersSnapshot = await adminDb
          .collection("users")
          .where("subscriptionId", "==", subscription.id)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          let subscriptionStatus = "Ativo";
          
          if (subscription.cancel_at_period_end) {
            subscriptionStatus = "Cancelando";
          } else if (subscription.status === "past_due") {
            subscriptionStatus = "Pendente";
          } else if (subscription.status === "unpaid") {
            subscriptionStatus = "Inadimplente";
          }

          await usersSnapshot.docs[0].ref.update({
            subscriptionStatus,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
          });
          console.log(`Assinatura ${subscription.id} atualizada para status: ${subscriptionStatus}`);
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
            cancelAtPeriodEnd: false,
            updatedAt: new Date().toISOString(),
          });
          console.log("Assinatura cancelada definitivamente:", subscription.id);
        }
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
