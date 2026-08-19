# -*- coding: utf-8 -*-
"""
Varre TODA server action do projeto atras do padrao "confia no layout".

Uma server action e um endpoint HTTP proprio. O layout que protege a pagina
nao protege a action: qualquer um que saiba o identificador pode invoca-la.
Este script lista, por action, se ha alguma checagem de autenticacao ou de
acesso no corpo dela (ou numa funcao auxiliar que ela chame).
"""
import io, os, re

GUARD_HINTS = [
    "getSession", "getActiveSession", "requireSuperAdmin", "assertSuperAdmin",
    "canAccessCompany", "requireAdmin", "verifyCompanyAccess",
    "resolveCompanyForManage", "requireAuth", "requireCompanyAccess",
    "checkAdmin", "isAdmin", "assertCompanyAccess", "getCompanyBySlugForUser",
    "withCompanyAuth", "withAuth", "withAdminAuth",
    "verifyAccess", "requireMember", "ensureAccess",
]

def split_functions(src):
    """Devolve (nome, corpo) de cada `export async function` do arquivo."""
    out = []
    for m in re.finditer(r'^export async function (\w+)\s*\(', src, re.M):
        name = m.start(1)
        fname = m.group(1)
        # Corpo: do fim da assinatura ate o proximo `^export ` ou fim
        nxt = re.search(r'^export ', src[m.end():], re.M)
        body = src[m.end(): m.end() + (nxt.start() if nxt else len(src))]
        out.append((fname, body))
    return out

rows = []
for root, _, names in os.walk("src/server/actions"):
    for n in sorted(names):
        if not n.endswith(".ts"):
            continue
        p = os.path.join(root, n).replace("\\", "/")
        src = io.open(p, encoding="utf-8").read()
        if '"use server"' not in src.split("\n")[0] and "'use server'" not in src[:40]:
            continue
        # helpers definidos no arquivo que ja contem guarda
        guarded_helpers = set()
        for hm in re.finditer(r'^(?:async )?function (\w+)', src, re.M):
            hname = hm.group(1)
            nxt = re.search(r'^(?:export )?(?:async )?function ', src[hm.end():], re.M)
            hbody = src[hm.end(): hm.end() + (nxt.start() if nxt else len(src))]
            if any(h in hbody for h in GUARD_HINTS):
                guarded_helpers.add(hname)

        for fname, body in split_functions(src):
            hits = [h for h in GUARD_HINTS if h in body]
            hits += [h for h in guarded_helpers if re.search(r'\b%s\s*\(' % h, body)]
            rows.append((p, fname, sorted(set(hits))))

unguarded = [r for r in rows if not r[2]]
print("actions totais: %d   sem guarda aparente: %d\n" % (len(rows), len(unguarded)))
cur = None
for p, fname, hits in unguarded:
    if p != cur:
        print("\n%s" % p); cur = p
    print("   - %s" % fname)

# ─────────────────────────────────────────────────────────────────────────────
# Uso: python scripts/audit-server-actions.py
#
# As actions que aparecem SEM GUARDA precisam de uma decisao consciente:
#  - publica de proposito (login, agendamento do cliente, validacao de cupom)?
#    entao precisa de rate limit.
#  - de gestao? entao precisa de `requireSuperAdmin` ou `canAccessCompany`.
#
# Rodar isto antes de subir uma versao evita a regressao mais provavel do
# projeto: alguem escreve uma action nova, testa pela tela protegida, e nao
# percebe que criou um endpoint aberto.
# ─────────────────────────────────────────────────────────────────────────────
