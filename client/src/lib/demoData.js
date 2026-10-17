// "Örnek verilerle dene": uygulamayı dolu hâliyle görmek için gerçekçi, uydurma bir YKS öğrencisi verisi.
// Saf fonksiyon: aynı tarih ve tohumla hep aynı veriyi üretir. Ayarlar sayfası bunu yedek yükler gibi
// mevcut verinin yerine koyar (önce onay ister). Kayıtlar veri katmanının yedek şemasına uyar.
import { emptyState, seedIfEmpty } from "../data/seed.js";
import { addDays } from "./insights.js";
import { EXAM_TYPES } from "./exams.js";
import { dayIndexOfDate } from "./schedule.js";
import { seeded } from "./random.js";

const DAYS_BACK = 200;

// Yerel gün + saat → UTC ISO (çalışma kayıtları böyle saklanır)
function localIso(date, minutes) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60).toISOString();
}

export function buildDemoState(today, seed = 2027) {
  const r = seeded(seed);
  const pick = (list) => list[Math.floor(r() * list.length)];
  const state = emptyState();
  seedIfEmpty(state);
  const subjects = state.subjects;
  const topicsOf = (subjectId) => state.topics.filter((t) => t.subjectId === subjectId);
  const byName = (name, group) => subjects.find((s) => s.name === name && s.examType === group);
  // Sayısal öğrencisi: matematik ve fen ağırlıklı
  const weights = subjects.map((s) => (/Matematik|Fizik|Kimya|Biyoloji|Geometri/.test(s.name) ? 3 : s.name === "Türkçe" ? 2 : 1));
  const weighted = () => {
    let x = r() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < subjects.length; i++) {
      x -= weights[i];
      if (x <= 0) return subjects[i];
    }
    return subjects[0];
  };

  // --- Çalışma ve soru kayıtları: son 200 gün, sınava yaklaştıkça artan tempo ---
  for (let back = DAYS_BACK; back >= 0; back--) {
    const date = addDays(today, -back);
    const progress = 1 - back / DAYS_BACK; // 0 → 1
    if (r() > 0.55 + progress * 0.35) continue; // bazı günler boş
    const count = 1 + Math.floor(r() * (2 + progress * 4));
    let clock = 9 * 60 + Math.floor(r() * 10) * 60;
    for (let k = 0; k < count && clock < 23 * 60; k++) {
      const subject = weighted();
      const topics = topicsOf(subject.id);
      const topic = topics.length && r() < 0.8 ? pick(topics) : null;
      const minutes = pick([25, 25, 30, 40, 45, 50, 60]);
      state.sessions.push({
        id: state.sessions.length + 1,
        subjectId: subject.id,
        topicId: topic?.id ?? null,
        startedAt: localIso(date, clock),
        durationSeconds: minutes * 60,
        entryType: r() < 0.7 ? "pomodoro" : "manual",
      });
      // Akşam saatlerinde daha isabetli çözüyor (verimli saatler grafiği bir şey göstersin)
      const evening = clock >= 19 * 60;
      if (r() < 0.6) {
        const total = 10 + Math.floor(r() * 30);
        const accuracy = 0.45 + progress * 0.25 + (evening ? 0.1 : 0) + (r() - 0.5) * 0.15;
        const correct = Math.max(0, Math.min(total, Math.round(total * accuracy)));
        const wrong = Math.max(0, Math.round((total - correct) * 0.7));
        state.questions.push({
          id: state.questions.length + 1,
          subjectId: subject.id,
          topicId: topic?.id ?? null,
          resourceId: null,
          date,
          correct,
          wrong,
          blank: total - correct - wrong,
        });
      }
      clock += minutes + pick([5, 10, 15, 60, 90]);
    }
  }

  // --- Kaynaklar ---
  const books = [
    ["TYT Matematik Soru Bankası", "Karekök", "Matematik", "TYT", 64],
    ["AYT Fizik Soru Bankası", "Palme", "Fizik", "AYT", 31],
    ["Paragraf Kampı", "Hız", "Türkçe", "TYT", 120],
    ["AYT Kimya Denemeleri", "Orbital", "Kimya", "AYT", 12],
  ];
  books.forEach(([name, publisher, subj, group, solved], i) => {
    state.resources.push({
      id: i + 1,
      name,
      publisher,
      subjectId: byName(subj, group).id,
      status: solved >= 100 ? "bitirdim" : "elimde",
      solvedTests: solved,
      lastSolvedAt: addDays(today, -Math.floor(r() * 9)),
    });
  });

  // --- Konular: ders başına bir kısmı bitti, tekrar takvimi işliyor ---
  for (const topic of state.topics) {
    if (r() < 0.38) {
      const doneAgo = 2 + Math.floor(r() * 80);
      const step = Math.min(4, Math.floor(r() * 5));
      topic.doneAt = addDays(today, -doneAgo);
      topic.reviewStep = step;
      topic.nextReview = step >= 4 ? null : addDays(today, Math.floor(r() * 9) - 4);
    }
  }

  // --- Ders programı (lise) ve haftalık plan ---
  const periods = [[510, 550], [560, 600], [610, 650], [660, 700], [710, 750], [800, 840], [850, 890]];
  const lessons = [
    ["Matematik", "Matematik", "Fizik", "Fizik", "Edebiyat", "Kimya", "Beden Eğitimi"],
    ["Biyoloji", "Biyoloji", "Matematik", "Matematik", "İngilizce", "Tarih"],
    ["Edebiyat", "Edebiyat", "Kimya", "Kimya", "Matematik", "Felsefe"],
    ["Fizik", "Fizik", "Matematik", "Matematik", "Coğrafya", "İngilizce"],
    ["Kimya", "Biyoloji", "Edebiyat", "Din Kültürü", "Matematik"],
  ];
  lessons.forEach((list, day) =>
    list.forEach((title, i) =>
      state.classes.push({
        id: state.classes.length + 1,
        track: "yks",
        day,
        start: periods[i][0],
        end: periods[i][1],
        title,
        place: "12-B",
        subjectId: null,
      }),
    ),
  );
  const mat = byName("Matematik", "TYT");
  const fiz = byName("Fizik", "AYT");
  const kim = byName("Kimya", "AYT");
  const tur = byName("Türkçe", "TYT");
  const evening = [
    [960, 1050, "study", mat.id, "Soru bankası"],
    [1050, 1065, "break", null, ""],
    [1065, 1140, "study", fiz.id, ""],
    [1200, 1260, "other", null, "Spor"],
    [1260, 1320, "study", tur.id, "Paragraf"],
  ];
  for (let day = 0; day < 5; day++) {
    for (const [start, end, kind, subjectId, title] of evening) {
      state.plans.push({ id: state.plans.length + 1, track: "yks", day, start, end, kind, title, subjectId });
    }
  }
  state.plans.push({ id: state.plans.length + 1, track: "yks", day: 5, start: 600, end: 780, kind: "other", title: "Deneme sınavı", subjectId: null });
  state.plans.push({ id: state.plans.length + 1, track: "yks", day: 6, start: 660, end: 780, kind: "study", title: "Haftalık tekrar", subjectId: kim.id });
  // Bugünün ilk bloğu yapılmış olsun
  const todayDay = dayIndexOfDate(today);
  const firstToday = state.plans.find((p) => p.day === todayDay);
  if (firstToday) state.planChecks.push({ id: 1, planId: firstToday.id, date: today });

  // --- Denemeler: TYT ve AYT SAY netleri zamanla yükselir; branş denemeleri ---
  const typeOf = (id) => EXAM_TYPES.find((t) => t.id === id);
  const examRow = (type, date, level) => {
    const results = {};
    for (const s of typeOf(type).sections) {
      const solved = Math.round(s.count * Math.min(1, 0.7 + level * 0.3 + r() * 0.1));
      const correct = Math.round(solved * Math.min(0.95, 0.5 + level * 0.35 + (r() - 0.5) * 0.15));
      const wrong = solved - correct;
      results[s.id] = { correct, wrong, blank: s.count - solved };
    }
    return { id: state.exams.length + 1, track: "yks", date, name: `${pick(["3D", "Limit", "Özdebir", "Bilgi Sarmal"])} Türkiye geneli`, type, results };
  };
  for (let i = 0; i < 12; i++) {
    const back = 160 - i * 14;
    const level = 0.4 + (i / 11) * 0.5; // gerçekçi bir yükseliş: aylar içinde birkaç net
    state.exams.push(examRow("TYT", addDays(today, -back), level));
    if (i % 2 === 1) state.exams.push(examRow("AYT", addDays(today, -back + 1), level));
  }
  const branch = [
    [tur, 40, "Paragraf"],
    [mat, 30, "Problemler"],
    [fiz, 20, "Kuvvet ve Hareket"],
  ];
  for (let i = 0; i < 9; i++) {
    const [subject, count, name] = branch[i % 3];
    const level = i / 8;
    const correct = Math.round(count * (0.55 + level * 0.3 + (r() - 0.5) * 0.1));
    const wrong = Math.round((count - correct) * 0.6);
    state.exams.push({
      id: state.exams.length + 1,
      track: "yks",
      date: addDays(today, -80 + i * 9),
      name: `${name} ${i + 1}`,
      type: "BRANS",
      subjectId: subject.id,
      questionCount: count,
      results: { brans: { correct, wrong, blank: count - correct - wrong } },
    });
  }

  // Denemelerde yanlış yapılan konular: hep aynı birkaç zayıf konu öne çıksın (analiz bir şey göstersin)
  const weakPool = (group) => state.subjects.filter((x) => x.examType === group).flatMap((x) => topicsOf(x.id)).slice(0, 60);
  const pools = { TYT: weakPool("TYT"), AYT: weakPool("AYT") };
  const favorites = { TYT: pools.TYT.filter((_, i) => i % 9 === 2).slice(0, 4), AYT: pools.AYT.filter((_, i) => i % 7 === 3).slice(0, 4) };
  for (const exam of state.exams) {
    if (exam.type === "BRANS") continue;
    let budget = Object.values(exam.results).reduce((n, x) => n + x.wrong + x.blank, 0);
    const merged = new Map();
    for (let k = 0; k < 6 && budget > 0; k++) {
      const topic = r() < 0.6 ? pick(favorites[exam.type]) : pick(pools[exam.type]);
      const count = Math.min(budget, 1 + Math.floor(r() * 3));
      merged.set(topic.id, (merged.get(topic.id) ?? 0) + count);
      budget -= count;
    }
    exam.wrongTopics = [...merged].map(([topicId, count]) => ({ topicId, count }));
  }

  // Birkaç konuya not
  const noted = [
    ["Türev", "Zincir kuralı: (f∘g)' = f'(g)·g'. Bölümün türevinde payda karesini unutma."],
    ["Logaritma", "log_a(b·c) = log_a b + log_a c. Taban değiştirme: log_a b = ln b / ln a."],
    ["Paragraf", "Önce soru kökünü oku. 'Değinilmemiştir' sorularında şıkları metinde tek tek ara."],
  ];
  for (const [name, note] of noted) {
    const topic = state.topics.find((t) => t.name.startsWith(name));
    if (topic) topic.note = note;
  }

  // Hata defteri: fotoğrafsız (yalnızca notlu) birkaç soru; ikisinin tekrarı bugün
  const mistakeRows = [
    [mat, "Limit TYT 3, soru 27", "x² − 4x + 3 ifadesinin en küçük değeri kaçtır? (Tepe noktasını yanlış buldum.)", "B", 2, 0],
    [fiz, "Palme AYT Fizik, test 12", "Eğik atışta tepe noktasında hız sıfır değil, yatay bileşen kalır.", "D", 6, 1],
    [tur, "Paragraf Kampı, test 41", "Ana fikir sorusunda şıkları metinde tek tek aramadım.", "A", 9, 2],
    [kim, "Orbital AYT Kimya, deneme 3", "Mol kavramı: hacmi NŞA'da 22,4 ile bölmeyi unuttum.", "", 20, 3],
  ];
  mistakeRows.forEach(([subject, source, note, answer, ago, step], i) => {
    state.mistakes.push({
      id: i + 1,
      track: "yks",
      subjectId: subject.id,
      topicId: null,
      source,
      note,
      answer,
      imageId: null,
      createdAt: addDays(today, -ago),
      reviewStep: step,
      nextReview: i < 2 ? today : addDays(today, 2 + i),
      learnedAt: null,
      wrongCount: i === 1 ? 1 : 0,
    });
  });

  // Bilgi kartları: formüller ve tanımlar; bir kısmı bugün tekrar edilecek
  const cardRows = [
    [fiz, "Newton'un 2. yasası", "F = m·a"],
    [fiz, "Kinetik enerji", "Ek = ½·m·v²"],
    [fiz, "Potansiyel enerji (yer çekimi)", "Ep = m·g·h"],
    [fiz, "Ohm yasası", "V = I·R"],
    [fiz, "Elektriksel güç", "P = V·I"],
    [fiz, "Dalga hızı", "v = λ·f"],
    [mat, "sin²x + cos²x", "1"],
    [mat, "(a + b)²", "a² + 2ab + b²"],
    [mat, "a² − b²", "(a − b)(a + b)"],
    [mat, "log_a(b·c)", "log_a b + log_a c"],
    [mat, "Aritmetik dizinin n. terimi", "a_n = a_1 + (n − 1)·r"],
    [mat, "Türev: (xⁿ)'", "n·xⁿ⁻¹"],
    [kim, "Avogadro sayısı", "6,02·10²³"],
    [kim, "NŞA'da 1 mol gazın hacmi", "22,4 L"],
    [kim, "pH + pOH (25 °C)", "14"],
    [kim, "İdeal gaz denklemi", "P·V = n·R·T"],
    [tur, "Ünlü düşmesi örneği", "ağız → ağzı"],
    [tur, "Ünsüz benzeşmesi örneği", "kitapçı (kitap + cı)"],
  ];
  cardRows.forEach(([subject, front, back], i) => {
    const box = 1 + (i % 5);
    state.cards.push({
      id: i + 1,
      track: "yks",
      subjectId: subject.id,
      topicId: null,
      front,
      back,
      createdAt: addDays(today, -30 + i),
      box,
      nextReview: i % 3 === 0 ? today : addDays(today, 1 + (i % 6)),
      reviews: box * 2,
      lapses: i % 4 === 0 ? 1 : 0,
    });
  });

  state.settings.examDates = { yks: "2027-06-19" };
  state.settings.dailyGoal = 240;
  return state;
}
