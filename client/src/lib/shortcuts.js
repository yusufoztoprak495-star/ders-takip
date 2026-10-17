// Klavye kısayolları: tek harfle sayfalar arasında geçiş. Saf yardımcılar; dinleyici App.jsx'te.
// questions: true olanlar yalnızca sınav hedeflerinde (soru/kaynak/deneme sayfaları üniversitede yok).
export const SHORTCUTS = [
  { key: "a", to: "/", label: "Ana sayfa" },
  { key: "p", to: "/pomodoro", label: "Pomodoro" },
  { key: "g", to: "/gunluk", label: "Çalışma günlüğü" },
  { key: "s", to: "/sorular", label: "Soru kaydı", questions: true },
  { key: "d", to: "/denemeler", label: "Denemeler", questions: true },
  { key: "e", to: "/hata-defteri", label: "Hata defteri" },
  { key: "b", to: "/kartlar", label: "Bilgi kartları" },
  { key: "k", to: "/konular", label: "Dersler ve konular" },
  { key: "h", to: "/haftalik", label: "Haftalık program" },
  { key: "i", to: "/ilerleme", label: "İlerleme" },
  { key: "r", to: "/basarilar", label: "Başarılar (rozetler)" },
  { key: "?", to: "help", label: "Bu kısayol listesi" },
];

// Basılan tuş hangi sayfaya götürür? Değiştirici tuşlarla (Ctrl, Cmd, Alt) birlikteyse karışılmaz.
export function shortcutFor(event, { exam }) {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const key = event.key.length === 1 ? event.key.toLocaleLowerCase("tr").replace("ı", "i") : event.key;
  const found = SHORTCUTS.find((s) => s.key === key && (exam || !s.questions));
  return found ? found.to : null;
}

const TYPING_INPUTS = new Set(["text", "search", "email", "number", "password", "tel", "url", "date", "time", "datetime-local", "month", "week"]);

// Kullanıcı bir alana yazı yazıyorsa harfler kısayol sayılmaz
export function isTypingTarget(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  return el.tagName === "INPUT" && TYPING_INPUTS.has((el.type || "text").toLowerCase());
}
