-- Perfil pessoal do usuário ("Kreator Pass").
--
-- O desenho original preenchia o formulário de uma empresa com os dados que a
-- pessoa havia informado a outra. Isso é transferência de dado pessoal entre
-- controladores distintos — a primeira empresa coletou para a própria
-- finalidade e não autorizou repasse. Consentimento da cliente não basta:
-- quem precisaria consentir é a empresa de origem.
--
-- Com o perfil pertencendo ao usuário, nada atravessa empresas: a pessoa
-- preenche com os próprios dados, como o autofill do navegador. O problema
-- jurídico deixa de existir, e o modal de consentimento junto.

CREATE TABLE IF NOT EXISTS "user_profile" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "firstName" TEXT,
  "lastName"  TEXT,
  "phone"     TEXT,
  "address"   TEXT,
  "aptNo"     TEXT,
  "city"      TEXT,
  "zip"       TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
