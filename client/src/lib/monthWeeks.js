// Aylık planı haftalara dağıtmak için saf hesaplar: haftanın boş çalışma süresi ve konuların haftalara paylaştırılması.
// Hafta tanımı (ayın dört yedi günü) lib/months.js'te; blokların gün adıyla tutulduğu orada anlatılır.
import { dayIndexOfDate, freeWindows, STUDY_GAP_MIN } from "./schedule.js";
import { WEEKS, weekDays } from "./months.js";

// Günlük çalışma hedefi girilmediyse bir günde en çok bu kadar çalışılır sayılır (dakika)
export const DEFAULT_DAILY_STUDY = 240;

const pad = (n) => String(n).padStart(2, "0");

// Boş süre: günün aralığında ders, mola ve "diğer" bloklarının kapsamadığı boşluklar. Çalışma blokları boş
// sayılır (zaten çalışmak için konmuşlardır). STUDY_GAP_MIN'den kısa boşluklar çalışmaya yaramaz.
// Günde en çok `dailyStudy` dakika sayılır: boş saat çok olsa da bir gün sınırsız çalışılmaz.
function freeStudyMinutes(blocks, window, dailyStudy) {
  const busy = blocks.filter((b) => b.kind !== "study");
  const free = freeWindows(busy, window.dayStart, window.dayEnd, STUDY_GAP_MIN).reduce((sum, g) => sum + (g.end - g.start), 0);
  return Math.min(free, dailyStudy);
}

// Bir haftanın çalışma kapasitesi (dakika).
//  classes: ders programı · plans: ortak bloklar · weekPlans: yalnızca bu haftaya özel bloklar
//  fromDate: bu günden önceki günler sayılmaz (geçmişe konu dağıtılmasın); null = hepsi
// Dönen perDay gün adına göre (0 = pazartesi) bir günün süresidir; total ise haftanın gerçek günleri üzerinden
// toplanır: son hafta 10 güne kadar uzayabildiği için aynı gün adı iki kez sayılabilir.
export function weekCapacity({ month, week, classes, plans, weekPlans, window, dailyStudy = DEFAULT_DAILY_STUDY, fromDate = null }) {
  const perDay = Array.from({ length: 7 }, (_, day) => {
    const blocks = [...classes, ...plans, ...weekPlans].filter((b) => b.day === day);
    return freeStudyMinutes(blocks, window, dailyStudy);
  });
  const { from, to } = weekDays(month, week);
  let total = 0;
  let days = 0;
  for (let d = from; d <= to; d++) {
    const date = `${month}-${pad(d)}`;
    if (fromDate && date < fromDate) continue;
    total += perDay[dayIndexOfDate(date)];
    days += 1;
  }
  return { week, perDay, total, days };
}

// Ayın dört haftasının kapasitesi. weekPlans tüm ayın haftaya özel blokları olabilir; her haftaya kendisininki verilir.
export function monthCapacities({ month, classes, plans, weekPlans, window, dailyStudy, fromDate }) {
  return Array.from({ length: WEEKS }, (_, i) =>
    weekCapacity({
      month,
      week: i + 1,
      classes,
      plans,
      weekPlans: weekPlans.filter((p) => p.week === i + 1),
      window,
      dailyStudy,
      fromDate,
    }),
  );
}

// En büyük artık yöntemi: toplamı tam n yapan tam sayı paylar. Eşit artıkta büyük kapasiteli, sonra erken hafta önce gelir.
function roundToSum(exact, n, capacities) {
  const positive = exact.map((x) => Math.max(0, x));
  const sum = positive.reduce((a, b) => a + b, 0);
  const scaled = positive.map((x) => (x * n) / sum);
  const sizes = scaled.map(Math.floor);
  let left = n - sizes.reduce((a, b) => a + b, 0);
  const order = scaled
    .map((x, w) => ({ w, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || capacities[b.w] - capacities[a.w] || a.w - b.w);
  for (let i = 0; left > 0; i++, left--) sizes[order[i % order.length].w] += 1;
  return sizes;
}

// Konuları haftalara paylaştırır.
//  topics: bitmemiş konular, istenen sırayla ({ id, subjectId }) · capacities: 4 haftanın kapasitesi (dakika)
// Kurallar:
//  - Her dersin konuları sırasını korur: ilk konular erken haftalara, sonrakiler geç haftalara gider.
//  - Haftaya düşen konu sayısı o haftanın boş süresiyle orantılıdır; boş süresi olmayan haftaya konu verilmez.
//  - Yuvarlama artıkları dersten derse taşınır (hata yayılımı), böylece tek tek dersler yuvarlansa da
//    haftalık toplamlar orandan en çok bir konu sapar.
//  - Hiçbir haftada boş süre yoksa konular haftalara eşit bölünür ve noCapacity: true döner.
export function distributeTopics({ topics, capacities }) {
  const counts = Array.from({ length: WEEKS }, () => 0);
  if (topics.length === 0) return { assignments: [], counts, noCapacity: false };

  const noCapacity = capacities.every((c) => !(c > 0));
  const weights = noCapacity ? capacities.map(() => 1) : capacities.map((c) => Math.max(0, c));
  const total = weights.reduce((a, b) => a + b, 0);
  const share = weights.map((w) => w / total);

  // Dersleri ilk görüldükleri sırayla, konuları verilen sırayla topla
  const bySubject = new Map();
  for (const t of topics) {
    if (!bySubject.has(t.subjectId)) bySubject.set(t.subjectId, []);
    bySubject.get(t.subjectId).push(t);
  }

  const carry = capacities.map(() => 0);
  const assignments = [];
  for (const list of bySubject.values()) {
    const n = list.length;
    const exact = share.map((s, w) => n * s + carry[w]);
    const sizes = roundToSum(exact, n, weights);
    carry.forEach((_, w) => {
      carry[w] = exact[w] - sizes[w];
    });
    let index = 0;
    sizes.forEach((size, w) => {
      for (let k = 0; k < size; k++) assignments.push({ id: list[index++].id, week: w + 1 });
      counts[w] += size;
    });
  }
  return { assignments, counts, noCapacity };
}
