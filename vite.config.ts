import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/circuito-2---nacional/",
  esbuild: { jsx: "automatic" },
  server: { host: "127.0.0.1", port: 5173 },
  preview: { host: "127.0.0.1", port: 4173 },
  build: { target: "es2022", sourcemap: false },
});
