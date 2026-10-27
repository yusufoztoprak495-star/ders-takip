// Haftayı planla (akıllı öneri): her dersin bu haftaki konularını, kullanıcının seçtiği yönteme göre
// günlere ve günün boş saatlerine yerleştirir. Saf fonksiyonlar; veriyi pencere (WeekSuggestDialog) getirir.
//
// Kavramlar:
//  - Oturum: bir dersin bir konusuna ayrılan tek çalışma bloğu. Türü "konu" (konu anlatımı) ya da "soru".
//  - Konu başına gün: kullanıcı her konu için kaç gün konu, kaç gün soru çalışacağını söyler
//    (çift dikiş: 1 gün konu + ertesi gün 1 gün soru; konu haftası: yalnızca konu; soru haftası: yalnızca soru).
//  - Bir derse günde en çok `perDay` oturum düşer ve bir konu aynı günde iki kez çalışılmaz.
//
// Sıra kuralları (çift dikiş mantığı):
//  - Konular verilen sırayla gider: bir konunun konu oturumları, önceki konunun konu oturumları bitmeden başlamaz;
//    soruları da önceki konunun soruları bitmeden başlamaz.
//  - Bir konunun sorusu, konu oturumlarının sonuncusundan SONRAKİ bir günde başlar (aynı gün değil).
//  - Aynı gün hem dünün sorusu hem yeni konu varsa önce soru gelir.
//
// Yerleştirme: gün gün, ders sırasıyla gidilir; her oturum günün ilk uygun boşluğuna konur. Dolu saatler
// (ders programı, ortak bloklar, haftaya özel bloklar) ve oturumlar arasında `gap` dakikalık mola atlanır.
// Bir oturum o güne sığmazsa o gün yapılmaz ve sırası bozulmadan sonraki güne kayar; haftaya hiç sığmayanlar
// "leftover" olarak döner (sayfa kullanıcıya söyler).
import { freeWindows } from "./schedule.js";

export const METHODS = {
  ciftDikis: { label: "Çift dikiş", hint: "1 gün konu, ertesi gün sorusu" },
  konuHaftasi: { label: "Konu haftası", hint: "Bu hafta yalnızca konu; soruları sonraki hafta" },
  soruHaftasi: { label: "Soru haftası", hint: "Bu hafta yalnızca soru (konusunu geçen hafta bitirdiysen)" },
};

export const STEP = 5; // saatler 5 dakikalık adımla
export const DEFAULT_GAP = 15; // oturumlar arası mola (dakika)
export const TITLE_MAX = 60; // blok adı sınırı (veri katmanıyla aynı)

const roundUp = (minutes) => Math.ceil(minutes / STEP) * STEP;

// Yönteme göre bir konuya varsayılan gün sayısı. dayCount: haftada çalışılacak gün, topicCount: konu sayısı.
// Konu ya da soru haftasında günler konulara paylaşılır (en az 1 gün).
export function defaultDays(method, topicCount, dayCount) {
  const share = Math.max(1, Math.floor(dayCount / Math.max(1, topicCount)));
  if (method === "konuHaftasi") return { konu: share, soru: 0 };
  if (method === "soruHaftasi") return { konu: 0, soru: share };
  return { konu: 1, soru: 1 };
}

// "Konu: Türev - 1"; blok adı 60 karakteri geçemediği için uzun konu adları "…" ile kısaltılır
export function blockTitle(type, title) {
  const text = `${type === "konu" ? "Konu" : "Soru"}: ${title}`;
  return text.length <= TITLE_MAX ? text : `${text.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}

// Bir günün yerleştiricisi: sırayla verilen sürelere günün ilk uygun boşluğunu bulur.
// busy: dolu bloklar ({ start, end }) · window: { dayStart, dayEnd }
function dayPlacer(busy, window, gap) {
  const taken = busy.map((b) => ({ start: b.start, end: b.end }));
  return {
    // Sığarsa { start, end } döner ve o aralığı dolu sayar; sığmazsa null
    tryAdd(minutes) {
      // Dolu her bloğun iki yanında `gap` kadar mola payı bırakılır (gün başı ve sonu hariç)
      const padded = taken.map((b) => ({ start: b.start - gap, end: b.end + gap }));
      for (const free of freeWindows(padded, window.dayStart, window.dayEnd)) {
        const start = roundUp(free.start);
        if (start + minutes <= free.end) {
          const slot = { start, end: start + minutes };
          taken.push(slot);
          return slot;
        }
      }
      return null;
    },
  };
}

// Oturumları tek bir günün boş saatlerine sırayla yerleştirir (yardımcı; testte de kullanılır)
export function placeDay({ sessions, busy, window, gap = DEFAULT_GAP }) {
  const placer = dayPlacer(busy, window, gap);
  const placed = [];
  const unplaced = [];
  for (const s of sessions) {
    const slot = placer.tryAdd(s.minutes);
    if (slot) placed.push({ ...s, ...slot });
    else unplaced.push(s);
  }
  return { placed, unplaced };
}

// Bir dersin konularının ilerleme durumu
function subjectState(subject) {
  return subject.topics
    .filter((t) => (t.konu ?? 0) + (t.soru ?? 0) > 0)
    .map((t) => ({
      title: t.title,
      konuLeft: t.konu ?? 0,
      soruLeft: t.soru ?? 0,
      konuTotal: t.konu ?? 0,
      lastKonuDay: -1, // son konu oturumunun gün sırası (days dizisindeki yeri)
    }));
}

// Bugün (sıra i) bu dersten sıradaki oturum adayları: önce sorular (eskiden yeniye), sonra konular.
// Kurallar dosyanın başında anlatıldı.
function candidates(topics, i) {
  const list = [];
  // Soru: konusu önceki bir günde bitmiş (ya da hiç konu günü yok) ve önceki konunun soruları bitmiş olmalı
  for (let k = 0; k < topics.length; k++) {
    const t = topics[k];
    if (t.soruLeft === 0) continue;
    const prevDone = k === 0 || topics[k - 1].soruLeft === 0;
    const konuReady = t.konuLeft === 0 && (t.konuTotal === 0 || t.lastKonuDay < i);
    if (prevDone && konuReady) list.push({ topic: t, type: "soru" });
    break; // sorular sırayla: ilk bitmemiş sorulu konu uygun değilse sonrakiler de bekler
  }
  // Konu: önceki konunun konu oturumları bitmiş olmalı (bugün bitmiş olabilir)
  for (let k = 0; k < topics.length; k++) {
    const t = topics[k];
    if (t.konuLeft === 0) continue;
    list.push({ topic: t, type: "konu" });
    break;
  }
  return list;
}

// Günlere dağıtım (ve isteğe bağlı yerleştirme).
//  subjects: [{ subjectId, perDay, minutes?, topics: [{ title, konu, soru }] }] (verilen sırayla)
//  days: çalışılacak gün numaraları sırasıyla (0 = pazartesi)
//  placerFor: (day) => yerleştirici; verilirse oturum ancak güne sığarsa o güne yazılır
// Dönen: { byDay: { gün: [oturum] }, leftover: [oturum] }
export function scheduleDays({ subjects, days, placerFor = null }) {
  const byDay = {};
  const states = subjects.map((s) => ({ subject: s, topics: subjectState(s) }));
  days.forEach((day, i) => {
    const placer = placerFor ? placerFor(day) : null;
    for (const { subject, topics } of states) {
      const perDay = Math.max(1, subject.perDay ?? 1);
      const usedToday = new Set();
      let count = 0;
      while (count < perDay) {
        const options = candidates(topics, i).filter((c) => !usedToday.has(c.topic));
        let took = false;
        for (const option of options) {
          const session = {
            subjectId: subject.subjectId,
            type: option.type,
            title: option.topic.title,
            minutes: subject.minutes ?? 60,
          };
          const slot = placer ? placer.tryAdd(session.minutes) : {};
          if (!slot) continue; // sığmadı: bu oturum bugün yapılmaz, sırası korunur
          if (option.type === "konu") {
            option.topic.konuLeft -= 1;
            option.topic.lastKonuDay = i;
          } else {
            option.topic.soruLeft -= 1;
          }
          usedToday.add(option.topic);
          (byDay[day] ??= []).push({ ...session, ...slot });
          count += 1;
          took = true;
          break;
        }
        if (!took) break;
      }
    }
  });

  const leftover = [];
  for (const { subject, topics } of states) {
    for (const t of topics) {
      for (let n = 0; n < t.konuLeft; n++) leftover.push({ subjectId: subject.subjectId, type: "konu", title: t.title });
      for (let n = 0; n < t.soruLeft; n++) leftover.push({ subjectId: subject.subjectId, type: "soru", title: t.title });
    }
  }
  return { byDay, leftover };
}

// Haftanın planı: günlere dağıtır, boş saatlere yerleştirir, kaydedilecek blokları üretir.
//  busyByDay: { gün: [{ start, end }] } dolu saatler · window: { dayStart, dayEnd } · gap: mola (dakika)
// Dönen: { blocks: [{ day, start, end, kind: 'study', subjectId, title, type, topic }], leftover }
export function buildWeekPlan({ subjects, days, busyByDay, window, gap = DEFAULT_GAP }) {
  const { byDay, leftover } = scheduleDays({
    subjects,
    days,
    placerFor: (day) => dayPlacer(busyByDay[day] ?? [], window, gap),
  });
  const blocks = [];
  for (const day of days) {
    for (const s of (byDay[day] ?? []).slice().sort((a, b) => a.start - b.start)) {
      blocks.push({
        day,
        start: s.start,
        end: s.end,
        kind: "study",
        subjectId: s.subjectId,
        title: blockTitle(s.type, s.title),
        type: s.type,
        topic: s.title,
      });
    }
  }
  return { blocks, leftover };
}
