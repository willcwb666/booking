-- Marca de credito de pontos de fidelidade.
--
-- `awardLoyaltyPointsForBooking` somava pontos na conta do cliente sem nenhuma
-- guarda de repeticao, e `completeBookingWithAdjustmentsAction` nao impedia
-- concluir o mesmo atendimento duas vezes. Dois cliques no botao de concluir
-- creditavam os pontos duas vezes.
--
-- Ponto de fidelidade e moeda: vira desconto, vira servico. Creditar em dobro e
-- emitir dinheiro.
ALTER TABLE "booking"
  ADD COLUMN IF NOT EXISTS "loyaltyAwardedAt" TIMESTAMP(3);
