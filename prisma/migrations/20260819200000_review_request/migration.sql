-- Pedido de avaliação após o atendimento.
--
-- ─── Sobre o `googleReviewUrl` ───────────────────────────────────────────────
--
-- O convite para o Google vai para TODO MUNDO, independente da nota. Filtrar
-- quem avaliou mal antes do Google — "review gating" — viola a política do
-- Google Business Profile e a regra da FTC de 2024 sobre avaliações. A punição
-- possível do lado do Google é a remoção do perfil da empresa do Maps.
--
-- O ganho comercial real nunca foi esconder crítica: era lembrar de avaliar
-- quem estava satisfeito (a maioria silenciosa, que esquece) e fazer o gerente
-- saber do problema em minutos em vez de descobrir na nota pública. Os dois
-- continuam de pé sem gating.

ALTER TABLE "company"
  ADD COLUMN IF NOT EXISTS "googleReviewUrl" TEXT;

ALTER TABLE "booking"
  ADD COLUMN IF NOT EXISTS "reviewRequestedAt" TIMESTAMP(3);

ALTER TABLE "review"
  ADD COLUMN IF NOT EXISTS "alertSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'ACCOUNT';
