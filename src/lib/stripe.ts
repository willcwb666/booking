import "server-only";
import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe: Stripe | undefined };

export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

// Sem STRIPE_SECRET_KEY (ex.: rodando localmente sem billing), o SDK lança
// ao instanciar. Usamos uma chave-placeholder para o módulo carregar sem
// quebrar o app — qualquer chamada real de API falhará com erro claro de auth.
// Em produção, com a chave presente, o comportamento é idêntico ao anterior.
export const stripe =
  globalForStripe.stripe ??
  new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_not_configured", {
    apiVersion: "2026-04-22.dahlia",
  });

if (process.env.NODE_ENV !== "production") globalForStripe.stripe = stripe;
