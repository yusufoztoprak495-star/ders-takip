import { createHash } from "node:crypto";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Güvenlik politikası (CSP): sayfa yalnızca kendi dosyalarını yükleyebilir, dışarıya bağlanamaz.
// GitHub Pages sunucu başlığı ayarlatmadığı için <meta> etiketiyle eklenir; yalnızca derlenmiş
// hâle eklenir (geliştirme sunucusu kendi satır içi betiklerini çalıştırmak zorunda).
// index.html'deki tema betiği satır içi olduğu için içeriğinin özeti (hash) izin listesine yazılır:
// betik bir harf bile değişirse tarayıcı onu çalıştırmaz, saldırgan araya betik sokamaz.
function contentSecurityPolicy() {
  return {
    name: "csp-meta",
    apply: "build",
    transformIndexHtml(html) {
      const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
        ([, code]) => `'sha256-${createHash("sha256").update(code).digest("base64")}'`,
      );
      const policy = [
        "default-src 'self'",
        `script-src 'self' ${hashes.join(" ")}`,
        // React bazı öğelere style="" yazar (grafik çubuk genişlikleri gibi)
        "style-src 'self' 'unsafe-inline'",
        // Kâğıt dokusu CSS içinde data: SVG olarak gömülü
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ");
      return [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: policy },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  // Göreli yol: uygulama GitHub Pages'te alt klasörde (kullanici.github.io/depo/) da çalışsın
  base: "./",
});
