-- Comissao do agendamento carimbada na conclusao.
--
-- O extrato somava agendamentos concluidos e calculava a comissao com a taxa
-- ATUAL do profissional. Mudar a taxa de alguem reescrevia o que ele ja tinha
-- ganhado: o fechamento da quinzena passada mudava de valor sozinho, depois de
-- pago. A venda de balcao ja carimbava a comissao no ato desde c01e462; o
-- agendamento ficou anotado como divida naquele commit, e e esta.
--
-- Sem backfill, de proposito: nao existe registro historico das taxas. Inventar
-- um numero para o passado seria pior que assumir que ele nao foi carimbado - e
-- o extrato continua calculando com a taxa atual para as linhas antigas,
-- exatamente como fazia, ate que a conclusao do proximo atendimento carimbe.
ALTER TABLE "booking"
  ADD COLUMN IF NOT EXISTS "commissionAmount" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "commissionRate"   DECIMAL(5,2);
