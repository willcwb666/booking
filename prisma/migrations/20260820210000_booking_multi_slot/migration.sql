-- Um agendamento passa a ocupar TANTOS slots quanto os servicos exigem.
--
-- `booking_slot.bookingId` era UNIQUE: um slot por agendamento. O checkout
-- gravava como fim do atendimento o fim do SLOT DA GRADE, nao a duracao real
-- dos servicos. Um orcamento de 90 minutos numa agenda de 30 ocupava um slot
-- so, e os dois seguintes continuavam a venda - com o profissional ainda
-- trabalhando no primeiro cliente.
--
-- A trava de duplo agendamento continua sendo o UNIQUE por
-- (agenda, data, hora, profissional). Ela e' que impede vender o mesmo horario
-- duas vezes; a unicidade por bookingId nunca protegeu nada disso.
DROP INDEX IF EXISTS "booking_slot_bookingId_key";

CREATE INDEX IF NOT EXISTS "booking_slot_bookingId_idx" ON "booking_slot" ("bookingId");
