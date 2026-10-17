// Mola sağlığı: uzun mola, 20-20-20 göz kuralı ve mola önerileri. Saf yardımcılar + tarayıcıdaki ayar.
const KEY = "mola.ayarlari";
export const DEFAULT_BREAK_SETTINGS = { longBreakMinutes: 15, longEvery: 4, eyeReminder: true };
// Mola bittikten sonra bu kadar süre içinde yeni tur başlarsa "art arda" sayılır
const STREAK_GAP_MS = 30 * 60 * 1000;
const EYE_EVERY_SECONDS = 20 * 60;

export function loadBreakSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    if (parsed && typeof parsed === "object") {
      const ok = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
      return {
        longBreakMinutes: ok(parsed.longBreakMinutes, 1, 120) ? parsed.longBreakMinutes : DEFAULT_BREAK_SETTINGS.longBreakMinutes,
        longEvery: ok(parsed.longEvery, 0, 12) ? parsed.longEvery : DEFAULT_BREAK_SETTINGS.longEvery,
        eyeReminder: typeof parsed.eyeReminder === "boolean" ? parsed.eyeReminder : DEFAULT_BREAK_SETTINGS.eyeReminder,
      };
    }
  } catch {
    // okunamadı: varsayılan
  }
  return { ...DEFAULT_BREAK_SETTINGS };
}

export function saveBreakSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // kaydedilemedi: yalnızca bu oturumda geçerli
  }
}

// rounds: bu seride biten çalışma turu sayısı (az önce biten dahil). Her longEvery turda bir uzun mola.
export function breakAfter(rounds, shortMinutes, settings) {
  const long = settings.longEvery > 0 && rounds > 0 && rounds % settings.longEvery === 0;
  return { minutes: long ? settings.longBreakMinutes : shortMinutes, long };
}

// Yeni tur başlarken seride kaç tur var? Son mola 30 dakikadan uzun süre önce bittiyse seri sıfırlanır.
export function nextStreak(streak, startMs) {
  if (!streak || startMs - streak.lastEndedAtMs > STREAK_GAP_MS) return 0;
  return streak.count;
}

// 20-20-20 kuralı: her 20 dakikada bir 20 saniye 6 metre (20 fit) uzağa bak.
// Çalışmanın kaçıncı 20 dakikasındayız; tur bitimine 1 dakikadan az kaldıysa hatırlatma yapılmaz (mola zaten geliyor).
export function eyeReminderIndex(elapsedSeconds, durationSeconds) {
  const index = Math.floor(elapsedSeconds / EYE_EVERY_SECONDS);
  if (index === 0 || durationSeconds - index * EYE_EVERY_SECONDS < 60) return 0;
  return index;
}

export const BREAK_TIPS = {
  short: [
    "20 saniye boyunca pencereden en az 6 metre uzağa bak.",
    "Bir bardak su iç.",
    "Omuzlarını geriye doğru 10 kez çevir.",
    "Ayağa kalk, kollarını yukarı uzatıp esne.",
    "Gözlerini kapat, 4 saniye nefes al, 6 saniye ver; 5 kez.",
    "Masanı topla, sonraki tur için yalnızca gerekenleri bırak.",
  ],
  long: [
    "Uzun mola: telefona değil, biraz yürümeye ayır.",
    "Uzun mola: bir şeyler atıştır, su iç, camı açıp hava al.",
    "Uzun mola: boyun ve sırt esnemesi yap, 10 dakika ekransız kal.",
    "Uzun mola: çalıştığın konuyu kimseye bakmadan 1 dakikada kendine anlat.",
  ],
};

export function breakTip(long, seed) {
  const list = long ? BREAK_TIPS.long : BREAK_TIPS.short;
  return list[Math.abs(seed) % list.length];
}
