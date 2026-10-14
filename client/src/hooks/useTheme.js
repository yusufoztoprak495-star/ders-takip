import { useCallback, useEffect, useState } from "react";
import { THEME_BAR_COLORS, THEME_KEY, isForcedDarkCanvas, nextTheme, resolveTheme } from "../lib/theme.js";

// localStorage kapalı olabilir (gizli pencere vb.): hata verirse sessizce geçilir
function readStored() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

// Tarayıcı sayfayı zorla karartıyor mu? (index.html'deki betikle aynı yöntem)
function browserForcesDark() {
  try {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;color-scheme:light;background-color:Canvas";
    document.documentElement.appendChild(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return isForcedDarkCanvas(color);
  } catch {
    return false;
  }
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Tema <html data-theme="..."> üzerinde durur; renkler CSS değişkenlerinden gelir.
// İlk değeri index.html'deki küçük betik sayfa çizilmeden önce ayarlar (yanıp sönmeyi önler).
export function useTheme() {
  const [theme, setTheme] = useState(() =>
    resolveTheme(readStored(), systemPrefersDark(), browserForcesDark()),
  );

  // Kullanıcı elle seçmediyse sistem teması değişince takip et
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!readStored()) setTheme(resolveTheme(null, query.matches, browserForcesDark()));
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Telefonda tarayıcı çubuğu da temanın zemin rengini alsın
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = THEME_BAR_COLORS[theme];
  }, [theme]);

  const toggle = useCallback(() => {
    const root = document.documentElement;
    // Geçiş sınıfı yalnızca değişim sırasında durur: normal gezinmede her öğeye geçiş eklenmez
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 450);
    setTheme((current) => {
      const next = nextTheme(current);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // kayıt yapılamazsa tema yine bu oturumda değişir
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
