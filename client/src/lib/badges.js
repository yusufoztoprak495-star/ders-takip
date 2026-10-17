// Rozetler: veri katmanının verdiği sayılardan (/api/achievements) hesaplanır, saklanmaz.
// Her rozetin bir ölçüsü (fact) ve hedefi var; ilerleme 0..1. Saf fonksiyonlar.
import { seeded } from "./random.js";

const H = 3600;
// glyph: rozet simgesinin şekli (components/BadgeGlyph.jsx çizer)
export const BADGES = [
  { id: "ilk-adim", name: "İlk adım", hint: "İlk çalışmanı kaydet", fact: "sessions", target: 1, glyph: "seed" },
  { id: "pomodoro-10", name: "Pomodoro çırağı", hint: "10 pomodoro tamamla", fact: "pomodoros", target: 10, glyph: "tomato" },
  { id: "pomodoro-100", name: "Pomodoro ustası", hint: "100 pomodoro tamamla", fact: "pomodoros", target: 100, glyph: "tomato" },
  { id: "pomodoro-500", name: "Pomodoro efsanesi", hint: "500 pomodoro tamamla", fact: "pomodoros", target: 500, glyph: "tomato" },
  { id: "saat-10", name: "On saat", hint: "Toplam 10 saat çalış", fact: "totalSeconds", target: 10 * H, glyph: "clock", unit: "saat" },
  { id: "saat-100", name: "Yüz saat", hint: "Toplam 100 saat çalış", fact: "totalSeconds", target: 100 * H, glyph: "clock", unit: "saat" },
  { id: "saat-500", name: "Beş yüz saat", hint: "Toplam 500 saat çalış", fact: "totalSeconds", target: 500 * H, glyph: "clock", unit: "saat" },
  { id: "seri-7", name: "Bir hafta", hint: "7 gün art arda çalış", fact: "longestStreak", target: 7, glyph: "flame" },
  { id: "seri-30", name: "Bir ay", hint: "30 gün art arda çalış", fact: "longestStreak", target: 30, glyph: "flame" },
  { id: "seri-100", name: "Yüz gün", hint: "100 gün art arda çalış", fact: "longestStreak", target: 100, glyph: "flame" },
  { id: "maraton", name: "Maraton", hint: "Bir günde 6 saat çalış", fact: "bestDaySeconds", target: 6 * H, glyph: "mountain", unit: "saat" },
  { id: "odak-25", name: "Derin odak", hint: "Sekmeden hiç çıkmadan 25 pomodoro", fact: "focusedPomodoros", target: 25, glyph: "eye" },
  { id: "soru-1000", name: "Bin soru", hint: "1.000 soru çöz", fact: "questions", target: 1000, glyph: "check" },
  { id: "soru-10000", name: "On bin soru", hint: "10.000 soru çöz", fact: "questions", target: 10000, glyph: "check" },
  { id: "deneme-10", name: "Deneme kurdu", hint: "10 deneme gir", fact: "exams", target: 10, glyph: "page" },
  { id: "konu-50", name: "Elli konu", hint: "50 konuyu bitir", fact: "topicsDone", target: 50, glyph: "book" },
  { id: "hata-25", name: "Hata avcısı", hint: "Hata defterinden 25 soruyu öğren", fact: "mistakesLearned", target: 25, glyph: "target" },
  { id: "kart-200", name: "Kart ustası", hint: "200 kez bilgi kartı tekrar et", fact: "cardReviews", target: 200, glyph: "cards" },
  { id: "erkenci", name: "Erkenci kuş", hint: "Sabah 7'den önce 10 çalışma", fact: "earlySessions", target: 10, glyph: "sun" },
  { id: "gece", name: "Gece kuşu", hint: "Gece 23'ten sonra 10 çalışma", fact: "lateSessions", target: 10, glyph: "moon" },
];

export function badgeList(facts) {
  return BADGES.map((b) => {
    const value = facts[b.fact] ?? 0;
    return { ...b, value, earned: value >= b.target, progress: Math.min(1, value / b.target) };
  });
}

// Daha önce gösterilmemiş kazanılmış rozetler (kutlama için). seen: rozet kimlikleri
export function newlyEarned(list, seen) {
  const known = new Set(seen);
  return list.filter((b) => b.earned && !known.has(b.id));
}

// Koleksiyon yerleşimi: her pomodoro bir öğe. Alan bir ızgaraya bölünür, öğeler karışık sırayla hücrelere
// konur ve hücre içinde biraz kaydırılır: doğal dağınık görünür ama üst üste binmez. Aynı tohum, aynı gökyüzü.
export function collectionLayout(count, { width, height, seed = 1, max = 600 }) {
  const n = Math.min(count, max);
  if (n === 0) return [];
  const rng = seeded(seed);
  // En az max hücre: öğe sayısı arttıkça yerleşim değişmez (eski yıldızlar yerinde kalır)
  const cols = Math.ceil(Math.sqrt((max * width) / height));
  const rows = Math.ceil(max / cols);
  const cw = width / cols;
  const ch = height / rows;
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, n).map((cell, i) => {
    const col = cell % cols;
    const row = Math.floor(cell / cols);
    return {
      cell,
      x: (col + 0.2 + rng() * 0.6) * cw,
      y: (row + 0.2 + rng() * 0.6) * ch,
      size: 0.55 + rng() * 0.45 + (i % 17 === 0 ? 0.5 : 0), // arada bir büyük öğe
      turn: Math.floor(rng() * 360),
      variant: Math.floor(rng() * 3),
    };
  });
}
