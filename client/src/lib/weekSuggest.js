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
// Günlük çalışma sınırı yoktur: seçilen oturumların hepsi kendi gününe yazılır. Plan her zaman gece 12'ye kadar
// gider (ayarlardaki gün bitişi planı kesmez); gece 12'ye sığmayan kısım ertesi günün 00:00'ından devam eder.
// Gece 12'ye denk gelen oturum ikiye bölünür, ikinci parçası "(devam)" adını alır. Haftanın takvimdeki son gününden
// sonrası başka haftaya düştüğü için yazılamaz; o oturum yarım bırakılmaz, "leftover" olarak döner.
import { dayIndexOfDate, freeWindows } from "./schedule.js";
import { weekDays } from "./months.js";

export const METHODS = {
  ciftDikis: { label: "Çift dikiş", hint: "1 gün konu, ertesi gün sorusu" },
  konuHaftasi: { label: "Konu haftası", hint: "Bu hafta yalnızca konu; soruları sonraki hafta" },
  soruHaftasi: { label: "Soru haftası", hint: "Bu hafta yalnızca soru (konusunu geçen hafta bitirdiysen)" },
};

export const STEP = 5; // saatler 5 dakikalık adımla
export const DEFAULT_GAP = 15; // oturumlar arası mola (dakika)
export const TITLE_MAX = 60; // blok adı sınırı (veri katmanıyla aynı)
export const DAY_END = 1440; // plan gece 12'ye kadar gider
const CONTINUED = " (devam)";

const roundUp = (minutes) => Math.ceil(minutes / STEP) * STEP;

// Yönteme göre bir konuya varsayılan gün sayısı. dayCount: haftada çalışılacak gün, topicCount: konu sayısı.
// Konu ya da soru haftasında günler konulara paylaşılır (en az 1 gün).
export function defaultDays(method, topicCount, dayCount) {
  const share = Math.max(1, Math.floor(dayCount / Math.max(1, topicCount)));
  if (method === "konuHaftasi") return { konu: share, soru: 0 };
  if (method === "soruHaftasi") return { konu: 0, soru: share };
  return { konu: 1, soru: 1 };
}

// "Konu: Türev - 1"; blok adı 60 karakteri geçemediği için uzun konu adları "…" ile kısaltılır.
// continued: oturumun gece 12'den sonraki parçası, adın sonuna "(devam)" eklenir
export function blockTitle(type, title, continued = false) {
  return withContinued(`${type === "konu" ? "Konu" : "Soru"}: ${title}`, continued);
}

function withContinued(text, continued) {
  const suffix = continued ? CONTINUED : "";
  const room = TITLE_MAX - suffix.length;
  return (text.length <= room ? text : `${text.slice(0, room - 1).trimEnd()}…`) + suffix;
}

// Bir günün yerleştiricisi: sırayla verilen sürelere günün ilk uygun boşluğunu bulur.
// busy: o günün oturumları için dolu bloklar ({ start, end }) · window: { dayStart, dayEnd }
// nightBusy: önceki günden gelen devam için dolu bloklar. "Dersler bitince başla" sabahı dolu sayar ama bu kural
// o günün kendi oturumları içindir; gece devamı yalnızca gerçek dolu saatlere bakar.
function dayPlacer(busy, window, gap, nightBusy = busy) {
  const own = [];
  // Dolu her bloğun iki yanında `gap` kadar mola payı bırakılır (gün başı ve sonu hariç)
  const padded = (blocks) => [...blocks, ...own].map((b) => ({ start: b.start - gap, end: b.end + gap }));
  const firstFit = (blocks, from, minutes) => {
    for (const free of freeWindows(padded(blocks), from, window.dayEnd)) {
      const start = roundUp(free.start);
      if (start + minutes <= free.end) return { start, end: start + minutes };
    }
    return null;
  };
  const take = (slot) => {
    own.push(slot);
    return slot;
  };
  return {
    take,
    // Sığarsa { start, end } döner ve o aralığı dolu sayar; sığmazsa null.
    tryAdd(minutes) {
      const slot = firstFit(busy, window.dayStart, minutes);
      return slot ? take(slot) : null;
    },
    // Günün sonuna değen boşluğun başlangıcı; gün sonuna kadar boşluk yoksa gün sonu
    tailStart() {
      const last = freeWindows(padded(busy), window.dayStart, window.dayEnd).at(-1);
      if (!last || last.end < window.dayEnd) return window.dayEnd;
      return Math.min(roundUp(last.start), window.dayEnd);
    },
    // Önceki günden devam eden süreye günün en erken boşluğu (saat 00:00'dan başlayarak)
    fitNight: (minutes) => firstFit(nightBusy, 0, minutes),
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
//  placerFor: (day) => yerleştirici; verilirse oturum ancak yerleşebiliyorsa yazılır
// Her gün dersler turlarla gezilir: önce her ders birer oturum alır, günde 2–3 oturumlu dersler ikinci turda.
// Her turda önce bütün derslerin bekleyen soruları, sonra yeni konuları yerleşir.
// Adalet için her gün ilk sıradaki ders bir kayar (hep aynı ders sona kalmasın).
// Dönen: { byDay: { gün: [oturum] }, leftover: [oturum] }
export function scheduleDays({ subjects, days, placerFor = null }) {
  const byDay = {};
  const states = subjects.map((s) => ({ subject: s, topics: subjectState(s) }));
  const n = states.length;
  const maxPass = Math.max(1, ...subjects.map((s) => s.perDay ?? 1));
  days.forEach((day, i) => {
    const placer = placerFor ? placerFor(day) : null;
    const order = n === 0 ? [] : [...states.slice(i % n), ...states.slice(0, i % n)];
    const usedToday = new Map(states.map((st) => [st, new Set()]));
    const takenToday = new Map(states.map((st) => [st, 0]));
    // Her turda önce bekleyen sorular (dünün konusunun sorusu), sonra yeni konular
    for (let pass = 1; pass <= maxPass; pass++) {
      for (const phase of ["soru", "konu"]) {
        for (const st of order) {
          const { subject, topics } = st;
          if (Math.max(1, subject.perDay ?? 1) < pass || takenToday.get(st) >= pass) continue;
          const used = usedToday.get(st);
          for (const option of candidates(topics, i).filter((c) => c.type === phase && !used.has(c.topic))) {
            const session = {
              subjectId: subject.subjectId,
              type: option.type,
              title: option.topic.title,
              minutes: subject.minutes ?? 60,
            };
            const slot = placer ? placer.tryAdd(session.minutes) : {};
            if (!slot) continue; // yerleşemedi: bu oturum bugün yapılmaz, sırası korunur
            if (option.type === "konu") {
              option.topic.konuLeft -= 1;
              option.topic.lastKonuDay = i;
            } else {
              option.topic.soruLeft -= 1;
            }
            used.add(option.topic);
            takenToday.set(st, takenToday.get(st) + 1);
            (byDay[day] ??= []).push({ ...session, ...slot });
            break;
          }
        }
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
//  busyByDay: { gün: [{ start, end }] } dolu saatler · window: { dayStart } · gap: mola (dakika)
//  nightBusyByDay: gece devamı için dolu saatler (yoksa busyByDay; bkz. dayPlacer)
//  firstBlocksByDay: { gün: [{ title, minutes }] } çalışmadan önce ilk boşluğa konan bloklar
//    (örn. okul günlerinde üniversite dersleri için 1 saat)
//  lastDay: haftanın takvimdeki son günü (lastDayOfWeek); bundan sonrasına devam yazılamaz
// Dönen: { blocks: [{ day, start, end, kind: 'study', subjectId, title, type, topic, continued }], leftover }
//  type: 'konu' | 'soru' | 'other' (ön blok) · continued: gece 12'yi geçen oturumun ikinci parçası
export function buildWeekPlan({ subjects, days, busyByDay, nightBusyByDay = busyByDay, window, gap = DEFAULT_GAP, firstBlocksByDay = {}, lastDay = 6 }) {
  const planWindow = { dayStart: window.dayStart, dayEnd: DAY_END };
  const placers = new Map();
  const placerOf = (day) => {
    if (!placers.has(day)) placers.set(day, dayPlacer(busyByDay[day] ?? [], planWindow, gap, nightBusyByDay[day] ?? []));
    return placers.get(day);
  };

  // Süreyi `day` gününe koyar, gece 12'ye sığmayan kısmı ertesi güne devam ettirir.
  // Dönen: [{ day, start, end, continued }] parçaları; yerleşemezse null (hiçbir parça yazılmaz)
  const place = (day, minutes) => {
    const placer = placerOf(day);
    const slot = placer.tryAdd(minutes);
    if (slot) return [{ day, ...slot, continued: false }];
    if (day === lastDay) return null;
    const next = (day + 1) % 7;
    const start = placer.tailStart();
    const head = DAY_END - start;
    const rest = placerOf(next).fitNight(minutes - head);
    if (!rest) return null;
    placerOf(next).take(rest);
    if (head === 0) return [{ day: next, ...rest, continued: false }];
    return [{ day, ...placer.take({ start, end: DAY_END }), continued: false }, { day: next, ...rest, continued: true }];
  };

  const firsts = [];
  const droppedFirsts = [];
  const { byDay, leftover } = scheduleDays({
    subjects,
    days,
    placerFor: (day) => {
      for (const f of firstBlocksByDay[day] ?? []) {
        const parts = place(day, f.minutes);
        if (parts) firsts.push(...parts.map((p) => ({ ...p, title: f.title })));
        else droppedFirsts.push({ subjectId: null, type: "other", title: f.title });
      }
      return {
        tryAdd(minutes) {
          const parts = place(day, minutes);
          return parts && { parts };
        },
      };
    },
  });
  const blocks = [
    ...firsts.map((f) => ({ day: f.day, start: f.start, end: f.end, kind: "study", subjectId: null, title: withContinued(f.title, f.continued), type: "other", topic: null, continued: f.continued })),
    ...Object.values(byDay).flat().flatMap((s) =>
      s.parts.map((p) => ({
        day: p.day,
        start: p.start,
        end: p.end,
        kind: "study",
        subjectId: s.subjectId,
        title: blockTitle(s.type, s.title, p.continued),
        type: s.type,
        topic: s.title,
        continued: p.continued,
      })),
    ),
  ].sort((a, b) => a.day - b.day || a.start - b.start);
  return { blocks, leftover: [...droppedFirsts, ...leftover] };
}

// Haftanın içinde kalan günlerin gün numaraları (0 = pazartesi), pazartesiden pazara sıralı.
// fromDate: bu günden önceki günler sayılmaz (geçmişe blok konmasın). Son hafta 10 güne kadar uzayabilir;
// gün adı iki kez geçse de bir kez yazılır (haftaya özel blok iki güne birden uygulanır).
export function availableDays({ month, week, fromDate = null }) {
  const { from, to } = weekDays(month, week);
  const set = new Set();
  for (let d = from; d <= to; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    if (fromDate && date < fromDate) continue;
    set.add(dayIndexOfDate(date));
  }
  return [...set].sort((a, b) => a - b);
}

// Haftanın takvimdeki son gününün numarası (0 = pazartesi). Bu günden sonrası başka haftadır.
export function lastDayOfWeek(month, week) {
  return dayIndexOfDate(`${month}-${String(weekDays(month, week).to).padStart(2, "0")}`);
}

// Yeni plan kaydedilince bu blok yerinde kalır mı?
function isKept(block, replacing) {
  return block.auto !== true || (replacing !== null && !replacing.includes(block.subjectId));
}

// Dersi olan (okul) günlerin numaraları, sıralı
export function classDays(classes) {
  return [...new Set(classes.map((c) => c.day))].sort((a, b) => a - b);
}

// Gün numarası → dolu saatler. Ders programı, ortak bloklar ve o haftanın elle eklenmiş blokları dolu sayılır;
// önceki öneriden kalan bloklar (auto) sayılmaz, çünkü yeni öneri onların yerine geçer.
// afterClasses: okul günlerinde günün başından son dersin bitişine kadar her yer dolu sayılır
// (dersler arasındaki boşluklara çalışma konmaz).
// replacing: hafta ders ders planlanırken yeniden planlanan derslerin numaraları; yalnızca onların önerilen blokları
// boşalır, diğer dersler yerinde kaldığı için dolu sayılır. Verilmezse bütün önerilen bloklar boşalır.
export function busyByDayOf({ week, classes, plans, weekPlans, afterClasses = false, replacing = null }) {
  const out = {};
  const own = weekPlans.filter((p) => p.week === week && isKept(p, replacing));
  for (const b of [...classes, ...plans, ...own]) (out[b.day] ??= []).push({ start: b.start, end: b.end });
  if (afterClasses) {
    for (const day of classDays(classes)) {
      const lastEnd = Math.max(...classes.filter((c) => c.day === day).map((c) => c.end));
      out[day].push({ start: 0, end: lastEnd });
    }
  }
  return out;
}
