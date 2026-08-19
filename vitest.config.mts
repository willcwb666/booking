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
  },
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
