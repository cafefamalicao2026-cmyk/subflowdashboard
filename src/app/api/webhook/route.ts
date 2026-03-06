export const dynamic = "force-dynamic";

import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

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
    console.error(`Falha na verificação do Webhook: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.firebaseUID;

        if (!uid) {
          console.error("Firebase UID não encontrado no metadata da sessão.");
          break;
        }

        const subscriptionId = session.subscription as string;
        // Forçamos a tipagem para Stripe.Subscription para evitar erros de interseção com Stripe.Response
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;

        console.log(`Ativando assinatura via Webhook para usuário: ${uid}`);

        await adminDb.collection("users").doc(uid).set({
          subscriptionStatus: "Ativo",
          subscriptionId: subscriptionId,
          stripeCustomerId: session.customer as string,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          plan: "pro",
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const usersSnapshot = await adminDb.collection("users")
          .where("subscriptionId", "==", subscription.id)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          await userDoc.ref.update({
            subscriptionStatus: "Cancelado",
            updatedAt: new Date().toISOString(),
          });
          console.log(`Assinatura cancelada para o usuário associado a: ${subscription.id}`);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const usersSnapshot = await adminDb.collection("users")
            .where("subscriptionId", "==", subscriptionId)
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            await userDoc.ref.update({
              subscriptionStatus: "Pendente",
              updatedAt: new Date().toISOString(),
            });
            console.log(`Pagamento falhou para a assinatura: ${subscriptionId}`);
          }
        }
        break;
      }

      default:
        // Outros eventos ignorados
        break;
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error("Erro ao processar evento do webhook no Firestore:", error);
    return new NextResponse("Erro ao processar dados do webhook", { status: 500 });
  }
}
