import Stripe from "stripe";

// Inicialização segura do Stripe para evitar travamento se a chave estiver ausente
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

if (!stripeSecretKey && process.env.NODE_ENV === "production") {
  console.warn("AVISO: STRIPE_SECRET_KEY não configurada no ambiente.");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-12-18.acacia" as any, // Versão estável
});
