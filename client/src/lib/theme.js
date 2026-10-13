// Tema yardımcıları (saf fonksiyonlar; DOM'a dokunan kısım hooks/useTheme.js içinde).
export const THEME_KEY = "tema";

// Hangi tema uygulanacak? Kayıtlı geçerli bir seçim varsa o, yoksa bilgisayarın sistem teması.
export function resolveTheme(stored, systemPrefersDark) {
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark ? "dark" : "light";
}

export function nextTheme(theme) {
  return theme === "dark" ? "light" : "dark";
}
