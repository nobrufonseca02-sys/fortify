import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Os testes que renderizam o dataset inteiro de mesas levam ~2,5s isolados e
    // passam de 5s (timeout padrão) quando a máquina está sob carga — isso derrubava
    // a suíte de forma intermitente. Limitar workers também evita que dezenas de
    // ambientes jsdom disputem memória e falhem na inicialização.
    testTimeout: 20000,
    hookTimeout: 20000,
    maxWorkers: "50%",
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
