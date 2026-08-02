import { defineConfig } from "vite";

export default defineConfig({
  base: "./",          // щоб asset-шляхи працювали на pages.dev
  build: { outDir: "dist" },
});
