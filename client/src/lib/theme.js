// Tema yardımcıları (saf fonksiyonlar; DOM'a dokunan kısım hooks/useTheme.js içinde).
export const THEME_KEY = "tema";

// Uygulamanın dört teması. id'ler kayıtta durur (eski "dark"/"light" seçimleri aynen geçerli kalır).
// dark: koyu zeminli mi (tarayıcının zorla karartması ve sistem rengi bununla karar verir)
// swatch: seçicideki küçük önizlemenin renkleri [zemin, yüzey, vurgu, ikinci vurgu]
// bar: telefonda tarayıcı çubuğunun rengi = temanın zemin rengi (CSS'teki --bg ile aynı)
export const THEMES = [
  { id: "dark", name: "Gece", hint: "Lacivert gece, altın yıldız haritası", dark: true, bar: "#0c0f14", swatch: ["#0c0f14", "#171c25", "#cdb07a", "#5fa89e"] },
  { id: "light", name: "Kâğıt", hint: "Beyaz çizim kâğıdı, lacivert mürekkep", dark: false, bar: "#f4f5f7", swatch: ["#f4f5f7", "#ffffff", "#26385a", "#1b6b64"] },
  { id: "neon", name: "Neon", hint: "Mor devre kartı, yollarda akan ışık, HUD radarı", dark: true, bar: "#0d0b1e", swatch: ["#0d0b1e", "#1a1640", "#ff3fa4", "#34e7ff"] },
  { id: "pastel", name: "Pastel", hint: "Şeker renkli çıkartmalar, kalın çizgili kartlar", dark: false, bar: "#eef2f9", swatch: ["#eef2f9", "#d8f3e8", "#cc3d58", "#fff0bd"] },
];

export const THEME_BAR_COLORS = Object.fromEntries(THEMES.map((t) => [t.id, t.bar]));

export function isTheme(value) {
  return THEMES.some((t) => t.id === value);
}

export function isDarkTheme(id) {
  return THEMES.find((t) => t.id === id)?.dark ?? false;
}

// Hangi tema uygulanacak? Kayıtlı geçerli bir seçim varsa o, yoksa bilgisayarın sistem teması.
// İstisna: tarayıcı sayfayı zorla karartıyorsa (Chrome "Auto Dark Mode", Samsung Internet karanlık modu)
// açık temalar bozuk görünür (renkleri ters çevrilir); o zaman Gece açılır. Koyu temalara dokunulmaz.
export function resolveTheme(stored, systemPrefersDark, forcedDark = false) {
  if (isTheme(stored)) return forcedDark && !isDarkTheme(stored) ? "dark" : stored;
  if (forcedDark) return "dark";
  return systemPrefersDark ? "dark" : "light";
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
