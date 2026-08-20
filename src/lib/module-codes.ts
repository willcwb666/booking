/**
 * Códigos dos módulos licenciáveis, em um lugar só.
 *
 * Cada valor tem que bater com o `code` da linha correspondente em
 * `system_module` — é por ele que `company_module_license` amarra empresa e
 * módulo. Errar a string não dá erro nenhum: dá um módulo que ninguém consegue
 * contratar, porque a licença procurada nunca existe.
 *
 * Foi o que aconteceu com o cofre de fotos do cliente. `VAULT_MODULE` apontava
 * para um código sem linha em `system_module`, então a tela ficou inalcançável
 * para todas as empresas desde que subiu — sem erro, sem log, só 404.
 *
 * Este arquivo não impede o erro sozinho; `test/module-codes.db.test.ts`
 * confere contra o banco.
 */

export const MODULE_CODES = {
  giftCards: "gift_cards",
  loyalty: "fidelidade",
  promotions: "promocoes",
  waitlist: "waitlist",
  memberships: "clube_assinaturas",
  splitPayments: "split_pagamentos",
  checkin: "checkin_geofencing",
  clientVault: "cofre_do_cliente",
} as const;

export type ModuleCode = (typeof MODULE_CODES)[keyof typeof MODULE_CODES];
