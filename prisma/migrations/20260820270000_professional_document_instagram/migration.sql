-- Duas colunas de `professional` que so existiam como DDL em tempo de execucao.
--
-- `createProfessionalAction` chamava `ensureProfessionalColumnsExist()` antes de
-- inserir, e essa funcao rodava nove `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
-- Sete das colunas ja estavam no schema; `documentNumber` e `instagram` nao
-- estavam em lugar nenhum.
--
-- O efeito: a primeira criacao de profissional em qualquer ambiente ALTERAVA a
-- tabela e deixava duas colunas invisiveis para o Prisma. Drift permanente —
-- e `prisma migrate diff` leria as duas como colunas a DERRUBAR, porque nao
-- constam do schema.
--
-- IF NOT EXISTS porque em ambiente que ja cadastrou profissional elas existem.
ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "documentNumber" TEXT;
ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
