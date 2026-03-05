import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { uid, email, plan } = await req.json();

    if (!uid || !email || !plan) {
      return new NextResponse("Parâmetros ausentes (uid, email ou plan)", { status: 400 });
    }

    // Resolve o ID do preço no servidor para maior segurança
    let priceId = "";
    if (plan === "monthly") {
      priceId = process.env.STRIPE_PRICE_MONTHLY || "";
    } else if (plan === "yearly") {
      priceId = process.env.STRIPE_PRICE_YEARLY || "";
    }

    if (!priceId) {
      console.error(`ID de preço não encontrado para o plano: ${plan}`);
      return new NextResponse("Configuração de preço inválida no servidor", { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        firebaseUID: uid,
      },
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/dashboard?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
