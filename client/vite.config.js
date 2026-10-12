import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Geliştirme sırasında /api isteklerini Express sunucusuna yönlendirir
    proxy: { "/api": "http://localhost:3000" },
  },
});
