import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Göreli yol: uygulama GitHub Pages'te alt klasörde (kullanici.github.io/depo/) da çalışsın
  base: "./",
});
