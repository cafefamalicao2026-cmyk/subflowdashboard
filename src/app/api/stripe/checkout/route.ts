import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, email, plan } = body;

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY não encontrada.");
      return new NextResponse("Erro de configuração do servidor", { status: 500 });
    }

    if (!uid || !email || !plan) {
      return new NextResponse("Parâmetros ausentes", { status: 400 });
    }

    let priceId = "";
    if (plan === "monthly") {
      priceId = process.env.STRIPE_PRICE_MONTHLY || "";
    } else if (plan === "yearly") {
      priceId = process.env.STRIPE_PRICE_YEARLY || "";
    }

    if (!priceId) {
      return new NextResponse("Plano não configurado", { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";

    console.log(`Criando sessão para: ${email} (UID: ${uid})`);

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
      // Metadados na Sessão (para o evento checkout.session.completed)
      metadata: {
        firebaseUID: uid
      },
      // Metadados na Assinatura (para eventos de invoice e subscription)
      subscription_data: {
        metadata: {
          firebaseUID: uid
        }
      },
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/dashboard?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro no checkout:", error);
    return new NextResponse(error.message || "Erro interno", { status: 500 });
  }
}
