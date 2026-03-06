import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, email, plan } = body;

    // Verificação de segurança para chaves do Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY não encontrada nas variáveis de ambiente.");
      return new NextResponse("Configuração do servidor incompleta (Stripe Key)", { status: 500 });
    }

    if (!uid || !email || !plan) {
      return new NextResponse("Parâmetros ausentes (uid, email ou plan)", { status: 400 });
    }

    // Mapeamento de planos para IDs de preço
    let priceId = "";
    if (plan === "monthly") {
      priceId = process.env.STRIPE_PRICE_MONTHLY || "";
    } else if (plan === "yearly") {
      priceId = process.env.STRIPE_PRICE_YEARLY || "";
    }

    if (!priceId) {
      console.error(`ID de preço não configurado para o plano: ${plan}. Verifique STRIPE_PRICE_MONTHLY/YEARLY.`);
      return new NextResponse("ID do Plano não configurado no servidor", { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002";

    console.log(`Criando sessão de checkout para: ${email} (UID: ${uid})`);

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
    console.error("Erro detalhado no Stripe Checkout:", error);
    // Retornamos a mensagem de erro específica se possível para ajudar no debug
    return new NextResponse(error.message || "Erro interno ao processar checkout", { status: 500 });
  }
}
