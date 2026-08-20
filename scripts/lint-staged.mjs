#!/usr/bin/env node
/**
 * Lint dos arquivos EM STAGE, para o hook de pre-commit.
 *
 * ─── Por que só os arquivos em stage ─────────────────────────────────────────
 *
 * O ESLint completo leva dezenas de segundos neste projeto. Um pre-commit que
 * cobra isso a cada `git commit` é um pre-commit que as pessoas contornam com
 * `--no-verify`, e aí ele não protege nada. Aqui ele olha só o que está sendo
 * commitado: o custo cai para o tempo de um punhado de arquivos.
 *
 * ─── O que isto NÃO garante ──────────────────────────────────────────────────
 *
 * Mudar um arquivo pode quebrar o lint de OUTRO que não está em stage, e este
 * hook não vê. É trade-off aceito: a rede de verdade é o CI, que roda o lint
 * inteiro e barra o merge. O hook existe para o erro óbvio morrer na máquina de
 * quem escreveu, não para substituir o CI.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

// `ACMR`: adicionados, copiados, modificados e renomeados. Deletados ficam de
// fora — lintar arquivo que não existe mais quebra o hook por nada.
const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean)
  .filter((f) => /^(src|test)\/.+\.(ts|tsx|mts|mjs)$/.test(f))
  .filter((f) => existsSync(f));

if (staged.length === 0) {
  process.exit(0);
}

console.log(`Lint em ${staged.length} arquivo(s) em stage…`);

try {
  execFileSync("npx", ["eslint", ...staged], { stdio: "inherit", shell: process.platform === "win32" });
} catch {
  console.error(
    "\nCommit interrompido pelo lint.\n" +
      "Corrija os erros acima, ou use `git commit --no-verify` se souber o que está fazendo\n" +
      "(o CI vai cobrar de qualquer forma)."
  );
  process.exit(1);
}
