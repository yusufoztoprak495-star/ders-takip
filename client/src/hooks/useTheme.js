import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { THEME_BAR_COLORS, THEME_KEY, isForcedDarkCanvas, resolveTheme } from "../lib/theme.js";
import { prefersLessMotion } from "../lib/lite.js";

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

  // Temayı değiştirir. `origin` (ekrandaki bir nokta, genelde basılan düğme) verilirse yeni tema o noktadan
  // dairesel olarak yayılır (View Transitions). Desteklemeyen tarayıcıda ya da "hareketi azalt" açıkken
  // renkler kısa bir geçişle değişir.
  const choose = useCallback((next, origin) => {
    const root = document.documentElement;
    const save = () => {
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // kayıt yapılamazsa tema yine bu oturumda değişir
      }
    };
    const reduce = prefersLessMotion();
    if (!document.startViewTransition || reduce || !origin) {
      root.classList.add("theme-switching");
      window.setTimeout(() => root.classList.remove("theme-switching"), 450);
      setTheme(next);
      save();
      return;
    }
    root.style.setProperty("--reveal-x", `${origin.x}px`);
    root.style.setProperty("--reveal-y", `${origin.y}px`);
    // flushSync: React yeni temayı hemen DOM'a yazsın ki tarayıcı "sonra" görüntüsünü doğru alsın
    document.startViewTransition(() => {
      flushSync(() => setTheme(next));
      root.dataset.theme = next;
    });
    save();
  }, []);

  return { theme, choose };
}
