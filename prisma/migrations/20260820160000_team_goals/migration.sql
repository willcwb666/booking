-- Meta individual do profissional e a chave do ranking da equipe.
--
-- A meta e DIARIA porque e a unidade em que a motivacao funciona: "faltam 60
-- para a sua meta de hoje" e acionavel as 15h; "faltam 1.200 para a do mes" nao
-- e. Nula significa sem meta, e a tela mostra o resultado sem barra - barra
-- contra meta zero marcaria 100% todo dia e ensinaria a ignora-la.
ALTER TABLE "professional"
  ADD COLUMN IF NOT EXISTS "dailyGoal" DECIMAL(10,2);

-- Ranking DESLIGADO por padrao, e nao e timidez de produto.
--
-- Expor faturamento por pessoa para a equipe inteira e decisao de gestao:
-- desmotiva a metade de baixo e pressiona upsell, que degrada a experiencia do
-- cliente justamente onde a recorrencia e o ativo. Nos EUA ainda cria exposicao
-- em ambiente com comissionados. O dono liga se quiser; o software nao decide
-- por ele.
ALTER TABLE "company"
  ADD COLUMN IF NOT EXISTS "showTeamRanking" BOOLEAN NOT NULL DEFAULT false;
