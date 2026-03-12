import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return new NextResponse("UID do usuário é obrigatório", { status: 400 });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return new NextResponse("Usuário não encontrado", { status: 404 });
    }

    const userData = userDoc.data();
    const subscriptionId = userData?.subscriptionId;

    if (!subscriptionId) {
      return new NextResponse("Nenhuma assinatura ativa encontrada para este usuário", { status: 400 });
    }

    // Cancela a assinatura ao final do período atual
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    }) as any;

    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    // Atualiza o Firestore imediatamente
    await userRef.update({
      cancelAtPeriodEnd: true,
      subscriptionStatus: "Cancelando",
      updatedAt: new Date().toISOString(),
    });

    console.log(`Assinatura ${subscriptionId} marcada para cancelamento (UID: ${uid})`);

    return NextResponse.json({
      success: true,
      currentPeriodEnd,
    });
  } catch (error: any) {
    console.error("Erro ao processar cancelamento:", error);
    return new NextResponse(error.message || "Erro interno ao cancelar assinatura", { status: 500 });
  }
}
