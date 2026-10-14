// Tema yardımcıları (saf fonksiyonlar; DOM'a dokunan kısım hooks/useTheme.js içinde).
export const THEME_KEY = "tema";

// Tarayıcı çubuğu (theme-color) için temaların zemin rengi; CSS'teki --bg ile aynı
export const THEME_BAR_COLORS = { dark: "#0c0f14", light: "#f4f5f7" };

// Hangi tema uygulanacak? Kayıtlı geçerli bir seçim varsa o, yoksa bilgisayarın sistem teması.
// İstisna: tarayıcı sayfayı zorla karartıyorsa (Chrome "Auto Dark Mode", Samsung Internet karanlık modu)
// her zaman koyu tema. Tarayıcı açık temayı kendi kafasına göre ters çevirince sepya yazı
// altın-bej görünüyor; zaten koyu olan sayfaya ise dokunmuyor.
export function resolveTheme(stored, systemPrefersDark, forcedDark = false) {
  if (forcedDark) return "dark";
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark ? "dark" : "light";
}

export function nextTheme(theme) {
  return theme === "dark" ? "light" : "dark";
}

// Zorla karartma tespiti: açık renk şemalı bir öğenin "Canvas" (sayfa zemini) sistem rengi
// normalde beyazdır; tarayıcı sayfayı zorla karartıyorsa koyu döner (Chrome'da rgb(18, 18, 18)).
export function isForcedDarkCanvas(rgb) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgb || "");
  if (!m) return false;
  if (m[4] !== undefined && Number(m[4]) === 0) return false; // şeffaf: bilgi yok
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  return (r + g + b) / 3 < 100;
}
