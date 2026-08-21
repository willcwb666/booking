-- Marca de lembrete ja enfileirado, uma por janela.
--
-- O cron de lembretes buscava "agendamentos de amanha" e "daqui a 2h" e
-- enfileirava, sem conferir se ja tinha enfileirado antes. A janela de 2h tem
-- 15 minutos de largura, o que so faz sentido rodando a cada 15 minutos — e
-- nessa cadencia um agendamento marcado para amanha recebia 96 lembretes ate
-- o dia chegar.
--
-- Nulo para as linhas existentes: agendamento antigo volta a ser elegivel uma
-- vez. E o comportamento certo — melhor um lembrete a mais na virada do que
-- silenciar quem ainda vai ser atendido.
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "reminder24hQueuedAt" TIMESTAMP(3);
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "reminder2hQueuedAt" TIMESTAMP(3);
