import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, email } = body;

    if (!process.env.STRIPE_SECRET_KEY) {
      return new NextResponse("Erro de configuração do servidor", { status: 500 });
    }

    if (!uid || !email) {
      return new NextResponse("Parâmetros ausentes", { status: 400 });
    }

    const priceId = process.env.STRIPE_PRICE_30_DAYS;

    if (!priceId) {
      console.error("STRIPE_PRICE_30_DAYS não configurada.");
      return new NextResponse("Preço de 30 dias não configurado", { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        firebaseUID: uid,
        paymentType: "30days",
      },
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/dashboard?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro no one-time checkout:", error);
    return new NextResponse(error.message || "Erro interno", { status: 500 });
  }
}
