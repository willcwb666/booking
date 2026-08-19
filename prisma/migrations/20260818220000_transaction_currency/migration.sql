-- Moeda no registro transacional.
--
-- Antes, `estimate.total` e `pos_sale.total` não guardavam moeda: ela era
-- lida de `company.currency` no momento da consulta. Isso torna o histórico
-- reinterpretável — bastava a empresa trocar de mercado para R$ 4.000 virarem
-- $4.000 em todo relatório retroativo, sem nenhum rastro.
--
-- A coluna é anulável de propósito. Registros anteriores à migration são
-- backfilled abaixo, mas gravações que ainda não carimbam a moeda gravam NULL,
-- e a leitura resolve com COALESCE(t.currency, c.currency) — o mesmo
-- comportamento de antes. Assim a migration entra sem exigir que todos os
-- caminhos de escrita mudem no mesmo commit.

ALTER TABLE "estimate"  ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE "pos_sale"  ADD COLUMN IF NOT EXISTS "currency" TEXT;

-- Backfill: o histórico existente é todo do mercado atual de cada empresa.
-- Vale enquanto nenhuma empresa trocou de moeda — que é o caso hoje, e é
-- justamente a janela em que esta migration ainda é segura.
UPDATE "estimate" e
   SET "currency" = c."currency"
  FROM "company" c
 WHERE c.id = e."companyId"
   AND e."currency" IS NULL;

UPDATE "pos_sale" s
   SET "currency" = c."currency"
  FROM "company" c
 WHERE c.id = s."companyId"
   AND s."currency" IS NULL;

-- Os painéis agregam receita por moeda; sem estes índices o GROUP BY varre a
-- tabela inteira.
CREATE INDEX IF NOT EXISTS "estimate_companyId_currency_idx" ON "estimate" ("companyId", "currency");
CREATE INDEX IF NOT EXISTS "pos_sale_companyId_currency_idx" ON "pos_sale" ("companyId", "currency");
