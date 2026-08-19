-- Controle de disparo da campanha de resgate.
--
-- Sem esta marca, cada vez que o dono abrisse a tela de resgate o mesmo
-- cliente apareceria na lista e receberia o mesmo desconto de novo. É assim
-- que uma ferramenta de retenção vira motivo de descadastro — e descadastro em
-- massa degrada a reputação do domínio, o que atinge também os e-mails de
-- confirmação de agendamento, que precisam chegar.

ALTER TABLE "customer"
  ADD COLUMN IF NOT EXISTS "lastWinBackAt" TIMESTAMP(3);
