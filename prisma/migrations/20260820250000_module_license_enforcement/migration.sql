-- Trava dos modulos licenciados: preserva quem ja usa, fecha a porta do resto.
--
-- ─── O problema ──────────────────────────────────────────────────────────────
--
-- A licenca de modulo so escondia o item do MENU. Digitando a URL, qualquer
-- empresa abria e usava por inteiro vales-presente, fidelidade, promocoes,
-- lista de espera e clube de assinaturas — e NENHUMA das server actions por
-- tras dessas telas conferia licenca.
--
-- Agora as paginas e as actions conferem. Sozinha, essa mudanca apagaria os
-- modulos para toda empresa que ja os estivesse usando, sem aviso. Esta
-- migration concede licenca a quem ja tem DADO do modulo: nao e presente, e
-- reconhecimento de um uso que a plataforma ja aceitou.
--
-- Empresa sem dado nenhum nao ganha nada — e exatamente esse o buraco que se
-- quer fechar.

-- ─── 1. O modulo do cofre do cliente nunca existiu ───────────────────────────
--
-- `VAULT_MODULE` no codigo aponta para "cofre_do_cliente", e nao havia linha
-- com esse code em `system_module`. Como a licenca amarra por code, nenhuma
-- empresa podia contratar — a tela do cofre era 404 permanente para todas,
-- sem erro e sem log. A linha abaixo torna o modulo concedivel pelo painel.
INSERT INTO "system_module" ("id", "code", "name", "description", "icon", "monthlyPrice", "lifetimePrice", "billingType", "category", "isActive", "createdAt")
VALUES (
  'mod_cofre_do_cliente',
  'cofre_do_cliente',
  'Cofre de Fotos do Cliente',
  'Historico visual do atendimento com consentimento registrado e retencao com prazo.',
  'Camera',
  0,
  0,
  'SUBSCRIPTION',
  'GROWTH',
  true,
  NOW()
)
ON CONFLICT ("code") DO NOTHING;

-- ─── 2. Licenca para quem ja usa ─────────────────────────────────────────────
--
-- Um INSERT por modulo, cada um com o sinal de uso daquele modulo. `grantedBy`
-- marca a origem para que isto seja distinguivel de uma concessao comercial.

-- Vales-presente: emitiu pelo menos um.
INSERT INTO "company_module_license" ("id", "companyId", "moduleCode", "status", "grantedAt", "grantedBy")
SELECT 'lic_gc_' || c."id", c."id", 'gift_cards', 'ACTIVE', NOW(), 'MIGRACAO_USO_EXISTENTE'
FROM "company" c
WHERE EXISTS (SELECT 1 FROM "gift_card" g WHERE g."companyId" = c."id")
ON CONFLICT ON CONSTRAINT "uniq_company_module" DO NOTHING;

-- Fidelidade: criou o programa.
INSERT INTO "company_module_license" ("id", "companyId", "moduleCode", "status", "grantedAt", "grantedBy")
SELECT 'lic_fid_' || c."id", c."id", 'fidelidade', 'ACTIVE', NOW(), 'MIGRACAO_USO_EXISTENTE'
FROM "company" c
WHERE EXISTS (SELECT 1 FROM "loyalty_program" p WHERE p."companyId" = c."id")
ON CONFLICT ON CONSTRAINT "uniq_company_module" DO NOTHING;

-- Promocoes: cadastrou ao menos uma.
INSERT INTO "company_module_license" ("id", "companyId", "moduleCode", "status", "grantedAt", "grantedBy")
SELECT 'lic_promo_' || c."id", c."id", 'promocoes', 'ACTIVE', NOW(), 'MIGRACAO_USO_EXISTENTE'
FROM "company" c
WHERE EXISTS (SELECT 1 FROM "promotion" p WHERE p."companyId" = c."id")
ON CONFLICT ON CONSTRAINT "uniq_company_module" DO NOTHING;

-- Lista de espera: tem ao menos uma entrada.
INSERT INTO "company_module_license" ("id", "companyId", "moduleCode", "status", "grantedAt", "grantedBy")
SELECT 'lic_wait_' || c."id", c."id", 'waitlist', 'ACTIVE', NOW(), 'MIGRACAO_USO_EXISTENTE'
FROM "company" c
WHERE EXISTS (SELECT 1 FROM "waitlist_entry" w WHERE w."companyId" = c."id")
ON CONFLICT ON CONSTRAINT "uniq_company_module" DO NOTHING;

-- Clube de assinaturas: criou ao menos um plano.
INSERT INTO "company_module_license" ("id", "companyId", "moduleCode", "status", "grantedAt", "grantedBy")
SELECT 'lic_club_' || c."id", c."id", 'clube_assinaturas', 'ACTIVE', NOW(), 'MIGRACAO_USO_EXISTENTE'
FROM "company" c
WHERE EXISTS (SELECT 1 FROM "membership_plan" m WHERE m."companyId" = c."id")
ON CONFLICT ON CONSTRAINT "uniq_company_module" DO NOTHING;

-- Cofre do cliente: guardou ao menos uma foto. Concedido junto porque a tela
-- nunca foi alcancavel — se ha foto la, entrou por outro caminho e o dado
-- existe.
INSERT INTO "company_module_license" ("id", "companyId", "moduleCode", "status", "grantedAt", "grantedBy")
SELECT 'lic_cofre_' || c."id", c."id", 'cofre_do_cliente', 'ACTIVE', NOW(), 'MIGRACAO_USO_EXISTENTE'
FROM "company" c
WHERE EXISTS (SELECT 1 FROM "client_photo" v WHERE v."companyId" = c."id")
ON CONFLICT ON CONSTRAINT "uniq_company_module" DO NOTHING;
