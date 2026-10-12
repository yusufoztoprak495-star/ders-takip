const SETTINGS_KEY = "pomodoro.settings";
const DEFAULT_SETTINGS = { workMinutes: 25, breakMinutes: 5 };

// Kalan süre, başlangıç anından beri geçen zamana göre hesaplanır; saniye sayarak değil.
// Tarayıcılar arka plandaki sekmelerde sayaçları yavaşlatır, bu yöntem yine de doğru kalır.
// Yukarı yuvarlanır: 00:00 yalnızca süre gerçekten bittiğinde görünür.
export function remainingSeconds(startedAtMs, durationSeconds, nowMs) {
  const remainingMs = durationSeconds * 1000 - (nowMs - startedAtMs);
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

// 1490 -> '24:50'
export function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

// Ayarlar tarayıcıda saklanır. Kayıt yoksa, bozuksa ya da localStorage erişilemezse
// (gizli pencere, engellenmiş site verisi) varsayılan değerler kullanılır.
export function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (
      parsed &&
      isPositiveInt(parsed.workMinutes) &&
      isPositiveInt(parsed.breakMinutes)
    ) {
      return {
        workMinutes: parsed.workMinutes,
        breakMinutes: parsed.breakMinutes,
      };
    }
  } catch {
    // okunamadı: varsayılana düş
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // kaydedilemedi: ayar yalnızca bu oturumda geçerli kalır
  }
}

// Aynı anahtarla başlayan bir iş bitmeden aynı anahtarla ikinci kez çalıştırılmasını engeller.
// "Tekrar dene" düğmesine çift tıklanınca aynı çalışmanın iki kez kaydedilmesini önlemek için.
// İş sürerken yapılan ikinci çağrı hiçbir şey yapmaz ve undefined döner.
export function createSingleFlight() {
  const running = new Set();
  return async function run(key, task) {
    if (running.has(key)) return undefined;
    running.add(key);
    try {
      return await task();
    } finally {
      running.delete(key); // iş hatayla bitse bile anahtar serbest kalır
    }
  };
}
