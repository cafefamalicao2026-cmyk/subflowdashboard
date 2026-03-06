export const dynamic = "force-dynamic";

import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new NextResponse("Assinatura do Stripe ausente", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET não configurada.");
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  } catch (err: any) {
    console.error("Erro na verificação do webhook:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.firebaseUID;

        if (!uid) {
          console.error("UID do Firebase não encontrado no metadata da sessão.");
          break;
        }

        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentPeriodEnd = (subscription as any).current_period_end;

        await adminDb.collection("users").doc(uid).set({
          subscriptionStatus: "Ativo",
          subscriptionId,
          stripeCustomerId: session.customer as string,
          currentPeriodEnd: new Date(currentPeriodEnd * 1000).toISOString(),
          plan: "pro",
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        console.log("Assinatura ativada via checkout:", uid);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) {
          console.log("Evento invoice.payment_succeeded ignorado: Nenhuma assinatura vinculada.");
          break;
        }

        // Buscar usuário pela assinatura
        const usersSnapshot = await adminDb
          .collection("users")
          .where("subscriptionId", "==", subscriptionId)
          .limit(1)
          .get();

        if (usersSnapshot.empty) {
          console.warn(`Aviso: Usuário não encontrado para a assinatura ${subscriptionId}`);
          break;
        }

        const userDoc = usersSnapshot.docs[0];
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentPeriodEnd = (subscription as any).current_period_end;

        await userDoc.ref.update({
          subscriptionStatus: "Ativo",
          currentPeriodEnd: new Date(currentPeriodEnd * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        });

        console.log(`Pagamento confirmado e status 'Ativo' garantido para usuário: ${userDoc.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const usersSnapshot = await adminDb
          .collection("users")
          .where("subscriptionId", "==", subscriptionId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          await userDoc.ref.update({
            subscriptionStatus: "Pendente",
            updatedAt: new Date().toISOString(),
          });
          console.log("Pagamento falhou, status alterado para Pendente:", userDoc.id);
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
          const userDoc = usersSnapshot.docs[0];
          await userDoc.ref.update({
            subscriptionStatus: "Cancelado",
            updatedAt: new Date().toISOString(),
          });
          console.log("Assinatura cancelada no Stripe, atualizado no Firestore:", subscription.id);
        }
        break;
      }

      default:
        console.log("Evento não tratado explicitamente:", event.type);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return new NextResponse("Erro ao processar webhook", { status: 500 });
  }
}