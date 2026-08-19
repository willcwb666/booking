-- Comissão por item de venda.
--
-- `pos_sale.commissionAmount` guarda apenas o total somado de serviço e
-- produto. O extrato da quinzena não consegue separar as duas colunas — que é
-- exatamente a dor que este módulo existe para resolver.
--
-- Fica no item, e não em duas colunas na venda, porque assim qualquer
-- agrupamento futuro (por categoria de produto, por serviço específico) sai do
-- mesmo dado, sem nova migration.

ALTER TABLE "sale_item"
  ADD COLUMN IF NOT EXISTS "commissionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Sem backfill de propósito.
--
-- Não há como reconstruir o rateio de vendas antigas: `pos_sale` guarda só o
-- total, e a taxa vigente naquele dia não foi registrada em lugar nenhum —
-- a taxa atual do profissional pode ter mudado desde então. Distribuir o total
-- por regra de três com a taxa de hoje produziria números plausíveis e falsos
-- num relatório de pagamento.
--
-- Vendas anteriores ficam com 0 por item e o total continua íntegro em
-- `pos_sale.commissionAmount`; o extrato mostra o período antigo consolidado e
-- separa a partir daqui.

CREATE INDEX IF NOT EXISTS "sale_item_type_idx" ON "sale_item" ("type");
