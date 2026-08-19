-- Consentimento de marketing por cliente, coletado no checkout.
--
-- O consentimento existente vivia em `user_notification_preference`, que
-- pressupõe conta. Mas a maioria dos clientes de barbearia, pet shop e oficina
-- agenda SEM criar conta — não há `user` para pendurar a preferência.
--
-- O efeito prático disso é que "nunca teve a chance de escolher" e "escolheu
-- não receber" eram o mesmo estado, e a única regra possível era enviar para
-- todo mundo que não tivesse recusado explicitamente. Com esta coluna a
-- pergunta passa a ser feita, e a resposta fica registrada com data.
--
-- Padrão `false`: quem já está na base não consentiu, e uma migration não pode
-- inventar consentimento retroativo.

ALTER TABLE "customer"
  ADD COLUMN IF NOT EXISTS "acceptsMarketing" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "marketingConsentAt" TIMESTAMP(3);

-- A tela de resgate filtra por consentimento dentro da empresa.
CREATE INDEX IF NOT EXISTS "customer_company_marketing_idx"
  ON "customer" ("companyId", "acceptsMarketing");
