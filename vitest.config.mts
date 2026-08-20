import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testes rodam em Node (lógica de servidor/pura, sem DOM). O alias "@" espelha
// o paths do tsconfig; "server-only" é neutralizado por um stub vazio porque
// fora do bundler do Next ele não tem efeito e quebraria o import.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // Carrega o .env antes dos módulos de teste — os testes de integração
    // (RUN_DB_TESTS=1) precisam de DATABASE_URL já no import de @/lib/db.
    setupFiles: ["./test/setup-env.ts"],
    /**
     * Um arquivo de teste por vez.
     *
     * Os testes de integração compartilham o MESMO Postgres. Rodando em
     * paralelo, um arquivo enxerga as linhas que outro acabou de criar, e uma
     * asserção falha por causa de dado que não é dela — falha que some sozinha
     * na execução seguinte e faz perder tempo procurando bug onde não há.
     *
     * O custo é alguns segundos a mais numa suíte que roda em menos de um
     * minuto. Barato pelo que compra: quando ela fica vermelha, é bug de
     * verdade.
     */
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
