# -*- coding: utf-8 -*-
"""
Varre TODA server action atras do padrao que abriu o buraco no `loyalty.ts`:
a action confere que HA sessao, mas nunca confere DE QUEM.

`audit-server-actions.py` responde "esta action autentica?". Este responde a
pergunta seguinte, que e outra: "ela autoriza?". Uma action que recebe o slug
da empresa, checa `getSession` e vai direto ao banco atende qualquer usuario
logado do sistema contra QUALQUER empresa — basta trocar a string.

Foi exatamente assim que `updateCompanyLoyaltyProgramAction` deixava um dono de
salao reescrever as regras de fidelidade do salao do concorrente.

Saida: as actions que recebem identificador de empresa, autenticam, e nao tem
nenhum sinal de checagem de vinculo.
"""
import io, os, re

# Sinais de que a action amarra o usuario A ESTA empresa (nao so "ha sessao").
AUTHZ_HINTS = [
    "canAccessCompany", "canAccessModule", "isModuleLicensed",
    "getCompanyBySlugForUser", "verifyCompanyAccess", "resolveCompany",
    "companyUser.find", "companyUser.count", "members: { some",
    "requireSuperAdmin", "assertSuperAdmin", "requireAdmin",
    "resolveCompanyForManage", "requireCompanyAccess", "assertCompanyAccess",
    "getUserCompanies", "requireMember", "withCompanyAuth",
    "requireOwner", "requireManager", "requireOwnerOrManager",
    # checagem de super admin escrita na mao, sem helper
    'user.role !== "admin"', "user.role === \"admin\"",
]

# Sinais de que ha sessao (autenticacao).
AUTHN_HINTS = ["getSession", "getActiveSession"]

# A action recebe/le um identificador de empresa?
COMPANY_PARAM = re.compile(
    r'company(Slug|Id)\s*[:,)]|'          # parametro nomeado
    r'formData\.get\(\s*["\']company(Slug|Id)["\']|'
    r'^\s*slug\s*:\s*string',
    re.M,
)


def split_functions(src):
    out = []
    for m in re.finditer(r'^export async function (\w+)\s*\(', src, re.M):
        fname = m.group(1)
        nxt = re.search(r'^export ', src[m.end():], re.M)
        body = src[m.end(): m.end() + (nxt.start() if nxt else len(src))]
        out.append((fname, body))
    return out


def local_helpers(src):
    """Helpers do proprio arquivo que ja carregam checagem de vinculo."""
    ok = set()
    for hm in re.finditer(r'^(?:async )?function (\w+)', src, re.M):
        hname = hm.group(1)
        nxt = re.search(r'^(?:export )?(?:async )?function ', src[hm.end():], re.M)
        hbody = src[hm.end(): hm.end() + (nxt.start() if nxt else len(src))]
        if any(h in hbody for h in AUTHZ_HINTS):
            ok.add(hname)
    return ok


suspects = []
total = 0

for root, _, names in os.walk("src/server/actions"):
    for n in sorted(names):
        if not n.endswith(".ts"):
            continue
        p = os.path.join(root, n).replace("\\", "/")
        src = io.open(p, encoding="utf-8").read()
        if '"use server"' not in src[:40] and "'use server'" not in src[:40]:
            continue

        helpers = local_helpers(src)

        for fname, body in split_functions(src):
            total += 1
            takes_company = bool(COMPANY_PARAM.search(body))
            if not takes_company:
                continue

            has_authz = any(h in body for h in AUTHZ_HINTS)
            has_authz = has_authz or any(
                re.search(r'\b%s\s*\(' % h, body) for h in helpers
            )
            has_authn = any(h in body for h in AUTHN_HINTS)

            if not has_authz:
                suspects.append((p, fname, has_authn))

print("actions totais: %d" % total)
print("recebem empresa e NAO amarram o usuario a ela: %d\n" % len(suspects))

cur = None
for p, fname, authn in sorted(suspects):
    if p != cur:
        print("\n%s" % p)
        cur = p
    print("   %-52s %s" % (fname, "autentica, nao autoriza" if authn else "sem sessao (publica?)"))
