-- Reset auditado da verificação em duas etapas.
--
-- Um super admin capaz de zerar o 2FA de qualquer conta é um backdoor
-- legítimo — o dono que perdeu o celular e o e-mail precisa de saída. Mas sem
-- freio, a segurança de todos os tenants passa a valer o que vale uma conta
-- pessoal.
--
-- Os freios: o pedido não executa na hora (`executeAfter`), o dono é avisado no
-- momento do pedido e não da execução, e pode cancelar enquanto ainda
-- conseguir entrar.

CREATE TABLE IF NOT EXISTS "two_factor_reset_request" (
  "id"            TEXT PRIMARY KEY,
  "targetUserId"  TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "requestedById" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "reason"        TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'PENDING',
  "executeAfter"  TIMESTAMP(3) NOT NULL,
  "executedAt"    TIMESTAMP(3),
  "cancelledAt"   TIMESTAMP(3),
  "cancelledById" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- O dono vê se existe pedido pendente contra ele em toda navegação.
CREATE INDEX IF NOT EXISTS "two_factor_reset_target_status_idx"
  ON "two_factor_reset_request" ("targetUserId", "status");

-- O painel do super admin lista o que já venceu a carência.
CREATE INDEX IF NOT EXISTS "two_factor_reset_status_after_idx"
  ON "two_factor_reset_request" ("status", "executeAfter");
