-- Sinal por faixa de confiança do cliente.
--
-- Desligado por padrão. Ligar altera quanto cada cliente paga na reserva, e
-- essa é uma decisão comercial do dono do estabelecimento — não pode acontecer
-- como efeito colateral de aplicar uma migration. Com a chave desligada, o
-- comportamento permanece o de `requireDeposit`, bit a bit.

ALTER TABLE "company_payment_settings"
  ADD COLUMN IF NOT EXISTS "dynamicDeposit" BOOLEAN NOT NULL DEFAULT false;
