// Tahminler: deneme netinin gidişi ve konu bitirme hızı. Saf fonksiyonlar (veri çekmez, tarih "bugün"ü dışarıdan alır).
import { addDays } from "./insights.js";

const DAY_MS = 86400000;
// İki YYYY-MM-DD arasındaki gün farkı (UTC'de hesaplanır; yaz saati kayması olmaz)
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
const round1 = (n) => Math.round(n * 10) / 10;

// En küçük kareler doğrusu: noktalara en yakın düz çizgi (y = eğim·x + kesişim)
export function linearFit(points) {
  if (points.length < 2) return null;
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

// Deneme netlerinin gidişini hedef tarihe uzatır. series: [{date, net}] eskiden yeniye.
// Son 8 denemeye bakar; en az 3 deneme gerekir. Düz çizgiyi aylarca uzatmak gerçekçi değil
// (net tavana yaklaştıkça artış yavaşlar), bu yüzden artış "kalan boşluk kadar yavaşlayan" bir eğriyle uzatılır:
// bugünkü hızla başlar ama en yüksek nete hiç değmez. Üstelik en fazla `horizon` gün ileri bakılır
// (aylar sonrası için verilen tek sayı fazla iddialı olur); days: tahminin kaç gün sonrası için olduğu.
export function netProjection(series, targetDate, maxNet, { last = 8, horizon = 90 } = {}) {
  const recent = series.slice(-last);
  if (!targetDate || recent.length < 3) return null;
  const first = recent[0].date;
  const lastDate = recent[recent.length - 1].date;
  if (targetDate <= lastDate) return null;
  const fit = linearFit(recent.map((d) => ({ x: daysBetween(first, d.date), y: d.net })));
  if (!fit) return null;
  const current = Math.min(maxNet, Math.max(0, fit.intercept + fit.slope * daysBetween(first, lastDate)));
  const ahead = Math.min(daysBetween(lastDate, targetDate), horizon);
  const gap = maxNet - current;
  const raw =
    fit.slope > 0 && gap > 0
      ? current + gap * (1 - Math.exp((-fit.slope * ahead) / gap))
      : current + fit.slope * ahead;
  return {
    projected: round1(Math.min(maxNet, Math.max(0, raw))),
    perMonth: round1(fit.slope * 30),
    count: recent.length,
    days: ahead,
  };
}

// Konu bitirme hızı: son `window` günde biten konu sayısına göre kalanların ne zaman biteceği.
// examDate verilirse sınava yetişmek için haftada kaç konu gerektiği ve yolunda olup olmadığı da döner.
export function topicForecast(topics, today, examDate, window = 28) {
  const total = topics.length;
  const done = topics.filter((t) => t.doneAt).length;
  const remaining = total - done;
  const since = addDays(today, -window);
  const recent = topics.filter((t) => t.doneAt && t.doneAt > since && t.doneAt <= today).length;
  const perDay = recent / window;
  const finishDate = remaining > 0 && perDay > 0 ? addDays(today, Math.ceil(remaining / perDay)) : null;
  const daysLeft = examDate ? daysBetween(today, examDate) : 0;
  const hasExam = Boolean(examDate) && daysLeft > 0;
  return {
    total,
    done,
    remaining,
    recent,
    perWeek: round1(perDay * 7),
    finishDate,
    neededPerWeek: hasExam ? Math.ceil((remaining * 7) / daysLeft) : null,
    onTrack: hasExam ? remaining === 0 || (finishDate !== null && finishDate <= examDate) : null,
  };
}

// En çok çalışılan ardışık `size` saat (verimli saatler). hours: [{hour, seconds}] 24 satır.
// share: o aralığın toplam çalışmadaki yüzdesi. Hiç çalışma yoksa null.
export function peakWindow(hours, size = 2) {
  const total = hours.reduce((s, h) => s + h.seconds, 0);
  if (total === 0) return null;
  let best = null;
  for (let start = 0; start + size <= hours.length; start++) {
    const seconds = hours.slice(start, start + size).reduce((s, h) => s + h.seconds, 0);
    if (!best || seconds > best.seconds) best = { start, end: start + size, seconds };
  }
  return { ...best, share: Math.round((best.seconds / total) * 100) };
}
