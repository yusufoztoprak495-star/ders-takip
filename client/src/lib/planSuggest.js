// Akıllı plan önerisi: haftalık programdaki boş saatlere zayıf konulardan çalışma blokları yerleştirir.
// Saf fonksiyon; konuların sırası (en zayıf önce) veri katmanından gelir (/api/weak-topics).
import { freeWindows } from "./schedule.js";

const STEP = 5;
const roundUp = (m) => Math.ceil(m / STEP) * STEP;

// classes/plans: { day, start, end } · window: { dayStart, dayEnd } · topics: en zayıftan güçlüye
// days: öneri yapılacak günler (0 = Pazartesi) · perDay: bir güne en çok kaç blok
// Bloklar arasında ve bir dersin/bloğun hemen ardından breakMinutes kadar pay bırakılır.
export function suggestBlocks({ classes, plans, window, topics, days, blockMinutes, breakMinutes, perDay }) {
  if (topics.length === 0) return [];
  const queue = topics.slice();
  const out = [];
  // Sıradaki konu: aynı günde bir önceki blokla aynı dersten olmasın (varsa); seçilen konu sıranın sonuna gider
  const takeTopic = (previousSubject) => {
    let index = queue.findIndex((t) => t.subjectId !== previousSubject);
    if (index === -1) index = 0;
    const [topic] = queue.splice(index, 1);
    queue.push(topic);
    return topic;
  };
  for (const day of days) {
    const busy = [...classes, ...plans].filter((b) => b.day === day);
    let count = 0;
    let previousSubject = null;
    for (const gap of freeWindows(busy, window.dayStart, window.dayEnd, blockMinutes)) {
      let cursor = roundUp(gap.start === window.dayStart ? gap.start : gap.start + breakMinutes);
      while (count < perDay && cursor + blockMinutes <= gap.end) {
        const topic = takeTopic(previousSubject);
        out.push({
          day,
          start: cursor,
          end: cursor + blockMinutes,
          kind: "study",
          subjectId: topic.subjectId,
          topicId: topic.topicId,
          title: topic.topicName,
          reason: topic.reason,
        });
        previousSubject = topic.subjectId;
        count += 1;
        cursor = roundUp(cursor + blockMinutes + breakMinutes);
      }
      if (count >= perDay) break;
    }
  }
  return out;
}
