// Bilgi kartları: Leitner kutuları ve mini test. Saf fonksiyonlar (rastgelelik dışarıdan verilir).
import { addDays } from "./insights.js";

// Kutu 1..5: bilinen kart bir üst kutuya çıkar ve kutunun aralığı kadar gün sonra yeniden gelir.
// Bilinemeyen kart ilk kutuya döner ve aynı gün yeniden sorulur (sona eklenir).
export const LEITNER_DAYS = [1, 2, 4, 8, 16];

export function scheduleCard(card, result, today) {
  if (result === "wrong") return { box: 1, nextReview: today };
  const box = Math.min(LEITNER_DAYS.length, (card.box ?? 1) + 1);
  return { box, nextReview: addDays(today, LEITNER_DAYS[box - 1]) };
}

// Fisher–Yates karıştırma (kopya üzerinde)
function shuffle(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Kartlardan çoktan seçmeli test: soru kartın ön yüzü, doğru şık arka yüzü, yanlış şıklar başka kartların
// arka yüzleri. Şıklar birbirinden farklı olmalı; 4 farklı cevap yoksa test kurulamaz (boş dizi).
export function buildQuiz(cards, count, rng = Math.random) {
  const answers = [...new Set(cards.map((c) => c.back))];
  if (answers.length < 4) return [];
  return shuffle(cards, rng)
    .slice(0, count)
    .map((card) => {
      const distractors = shuffle(
        answers.filter((a) => a !== card.back),
        rng,
      ).slice(0, 3);
      const options = shuffle([card.back, ...distractors], rng);
      return { cardId: card.id, question: card.front, options, answerIndex: options.indexOf(card.back) };
    });
}
