// Hafif mod: arka plan sahneleri, animasyonlar ve bulanık cam efektleri kapanır (eski/yavaş cihazlar, pil).
// Seçim bu cihazın tarayıcısında durur (veri değil, görünüm tercihi). <html data-lite> özniteliği
// index.html'deki ilk betikte de ayarlanır: sayfa açılırken bir an ağır hâli görünmesin.
export const LITE_KEY = "hafif-mod";

export function readLite() {
  try {
    return localStorage.getItem(LITE_KEY) === "1";
  } catch {
    return false;
  }
}

export function applyLite(on) {
  document.documentElement.toggleAttribute("data-lite", on);
  try {
    if (on) localStorage.setItem(LITE_KEY, "1");
    else localStorage.removeItem(LITE_KEY);
  } catch {
    // localStorage kapalıysa yalnızca bu oturum için geçerli olur
  }
}

// Konfeti, sayı sayma, tema geçişi gibi JS hareketleri: "hareketi azalt" ya da hafif mod açıksa yapılmaz
export function prefersLessMotion() {
  return (
    document.documentElement.hasAttribute("data-lite") ||
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}
