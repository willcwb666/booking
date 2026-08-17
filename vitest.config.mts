import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testes rodam em Node (lógica de servidor/pura, sem DOM). O alias "@" espelha
// o paths do tsconfig; "server-only" é neutralizado por um stub vazio porque
// fora do bundler do Next ele não tem efeito e quebraria o import.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
