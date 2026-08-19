-- Verificação em duas etapas (plugin `twoFactor` do better-auth).
--
-- O sistema guarda o token do Stripe e do Mercado Pago de cada empresa, a
-- agenda inteira do negócio e a carteira de clientes. Senha sozinha não é
-- postura defensável para isso.
--
-- A tabela e os nomes de coluna são ditados pelo plugin. `backupCodes` guarda
-- a lista serializada e criptografada; cada código é queimado no uso pelo
-- próprio better-auth.

CREATE TABLE IF NOT EXISTS "two_factor" (
  "id"          TEXT PRIMARY KEY,
  "secret"      TEXT NOT NULL,
  "backupCodes" TEXT NOT NULL,
  "userId"      TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- O plugin busca o registro pelo segredo durante a verificação.
CREATE INDEX IF NOT EXISTS "two_factor_secret_idx" ON "two_factor" ("secret");
CREATE INDEX IF NOT EXISTS "two_factor_userId_idx" ON "two_factor" ("userId");

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT false;
