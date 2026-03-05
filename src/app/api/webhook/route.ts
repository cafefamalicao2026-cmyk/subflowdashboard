import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature") as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object as any;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const uid = session.metadata.firebaseUID;

        if (uid) {
          await adminDb.collection("users").doc(uid).set({
            subscriptionStatus: "Ativo",
            subscriptionId: subscription.id,
            stripeCustomerId: session.customer as string,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            plan: "pro",
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscriptionId = session.id;
        const usersSnapshot = await adminDb.collection("users")
          .where("subscriptionId", "==", subscriptionId)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          await userDoc.ref.update({
            subscriptionStatus: "Cancelado",
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const subscriptionId = session.subscription as string;
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
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing failed:", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
