import { DEFAULT_TRACK, TRACK_IDS, isTrack } from "../lib/tracks.js";
import { nextId } from "./ids.js";
import {
  LEGACY_YKS_TOPICS,
  SEED_BY_TRACK,
  SEED_SUBJECTS,
  YKS_LIST_VERSION,
  YKS_SPLITS,
} from "./seedData.js";

// Boş bir veri durumu: tüm tablolar dizi, alan adları API'deki gibi (camelCase).
// `settings`: seçili çalışma hedefi ve hazır listesi daha önce yüklenmiş hedefler. Yedek dosyası da bu şekli taşır.
export function emptyState() {
  return {
    subjects: [],
    topics: [],
    sessions: [],
    questions: [],
    resources: [],
    settings: { track: DEFAULT_TRACK, seededTracks: [] },
  };
}

// Hazır ders listesini (konularıyla) veriye ekler. Kimlikler mevcut en büyük kimlikten devam eder.
function addSeedSubjects(state, list, track) {
  for (const subject of list) {
    const subjectId = nextId(state.subjects);
    state.subjects.push({ id: subjectId, name: subject.name, examType: subject.examType, track });
    for (const name of subject.topics) {
      state.topics.push({ id: nextId(state.topics), subjectId, name });
    }
  }
  // Yeni yüklenen YKS listesi zaten güncel sürümdür; taşıma adımı çalışmasın
  if (track === "yks" && state.settings) state.settings.yksListVersion = YKS_LIST_VERSION;
}

// Ders listesi boşsa hazır YKS listesini yükler; doluysa dokunmaz. Yüklediyse true döner.
// (Eski şeklin desteği: testler hâlâ bununla hazır veri kurar.)
export function seedIfEmpty(state) {
  if (state.subjects.length > 0) return false;
  addSeedSubjects(state, SEED_SUBJECTS, "yks");
  if (state.settings && !state.settings.seededTracks.includes("yks")) {
    state.settings.seededTracks.push("yks");
  }
  return true;
}

// Ayarı güvenli şekle getirir: bilinmeyen hedefler atılır, yinelenenler tekleşir
export function cleanSettings(raw, { hasSubjects = false } = {}) {
  const settings = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const track = isTrack(settings.track) ? settings.track : DEFAULT_TRACK;
  let seeded;
  if (Array.isArray(settings.seededTracks)) {
    seeded = [...new Set(settings.seededTracks.filter(isTrack))];
  } else {
    // Ayar hiç yoksa bu, hedeflerden önceki eski veridir: dersi varsa YKS listesi zaten yüklenmişti
    seeded = hasSubjects ? ["yks"] : [];
  }
  const clean = { track, seededTracks: seeded };
  // Hazır YKS listesinin sürümü (yoksa 1. sürüm sayılır)
  if (Number.isSafeInteger(settings.yksListVersion) && settings.yksListVersion > 0) {
    clean.yksListVersion = settings.yksListVersion;
  }
  return clean;
}

// Seçili hedefin hazır listesi daha önce yüklenmediyse bir kez yükler. Yüklediyse true döner.
// Kullanıcı hazır bir dersi silerse hedefe tekrar gelince geri gelmez (seededTracks sayesinde).
export function ensureTrackSeeded(state, track) {
  if (state.settings.seededTracks.includes(track)) return false;
  addSeedSubjects(state, SEED_BY_TRACK[track] ?? [], track);
  state.settings.seededTracks.push(track);
  return true;
}

// Açılışta (ve yedek yüklenince) veriyi güncel şekle getirir:
// ayar eklenir, hedefi olmayan eski dersler YKS sayılır, seçili hedefin hazır listesi yüklenir.
// seed: false (yedek yükleme): yedek olduğu gibi kalsın diye hazır liste eklenmez, yüklenmiş sayılır.
// Bir şey değiştiyse true döner (veri kaydedilmeli).
export function prepareState(state, { seed = true } = {}) {
  const before = JSON.stringify([state.settings, state.subjects.map((s) => s.track)]);
  state.settings = cleanSettings(state.settings, { hasSubjects: state.subjects.length > 0 });
  for (const subject of state.subjects) {
    if (!TRACK_IDS.includes(subject.track)) subject.track = "yks";
  }
  const track = state.settings.track;
  let seeded = false;
  if (seed) seeded = ensureTrackSeeded(state, track);
  else if (!state.settings.seededTracks.includes(track)) state.settings.seededTracks.push(track);
  upgradeYksList(state);
  const after = JSON.stringify([state.settings, state.subjects.map((s) => s.track)]);
  return seeded || before !== after;
}

// Seçili hedefin derslerinin kimlikleri (listeler ve istatistikler bunlarla süzülür)
export function activeSubjectIds(state) {
  const track = state.settings?.track ?? DEFAULT_TRACK;
  return new Set(state.subjects.filter((s) => (s.track ?? "yks") === track).map((s) => s.id));
}

// --- Hazır YKS listesinin güncellenmesi ---

const lower = (text) => (text ?? "").toLocaleLowerCase("tr");
const keyOf = (name, group) => `${lower(name)}|${lower(group)}`;

const topicHasRecords = (state, topicId) =>
  [...state.sessions, ...state.questions].some((row) => row.topicId === topicId);

const subjectHasRecords = (state, subjectId) =>
  [...state.sessions, ...state.questions, ...state.resources].some((row) => row.subjectId === subjectId);

// Eski (1. sürüm) YKS listesini bir kez yeni listeye taşır. Hiçbir çalışma/soru/kitap kaydı silinmez:
// 1) "Fen Bilimleri", "Sosyal Bilimler" gibi birleşik dersler ayrı derslere bölünür. Kaydı olan
//    "Fizik: ..." konusu "Fizik" dersine taşınır (öneki atılır), kayıtları da o derse geçer;
//    kaydı olmayan önekli konu silinir (yeni listede zaten var). Matematik'teki "Geometri: ..." da böyle.
// 2) Hazır derslerde kaydı olmayan eski konular silinir, yeni listedeki eksik konular eklenir.
//    Kullanıcının kendi eklediği konulara ve silmiş olduğu derslere dokunulmaz.
// Bir şey yaptıysa true döner.
export function upgradeYksList(state) {
  const settings = state.settings;
  if (!settings.seededTracks.includes("yks")) return false;
  if ((settings.yksListVersion ?? 1) >= YKS_LIST_VERSION) return false;

  const findSubject = (name, group) =>
    state.subjects.find((s) => s.track === "yks" && keyOf(s.name, s.examType) === keyOf(name, group));
  const ensureSubject = (name, group) => {
    const found = findSubject(name, group);
    if (found) return found;
    const subject = { id: nextId(state.subjects), name, examType: group, track: "yks" };
    state.subjects.push(subject);
    return subject;
  };

  // 1) Birleşik dersleri böl
  for (const [key, targets] of Object.entries(YKS_SPLITS)) {
    const [name, group] = key.split("|");
    const source = findSubject(name, group);
    if (!source) continue;
    for (const target of targets) {
      const prefix = `${lower(target)}:`;
      const moving = state.topics.filter(
        (t) => t.subjectId === source.id && (lower(t.name) === lower(target) || lower(t.name).startsWith(prefix)),
      );
      const dest = ensureSubject(target, group);
      for (const topic of moving) {
        if (!topicHasRecords(state, topic.id)) {
          state.topics = state.topics.filter((t) => t.id !== topic.id);
          continue;
        }
        const rest = topic.name.slice(target.length).replace(/^:\s*/, "").trim();
        topic.subjectId = dest.id;
        if (rest) topic.name = rest;
        for (const row of [...state.sessions, ...state.questions]) {
          if (row.topicId === topic.id) row.subjectId = dest.id;
        }
      }
    }
    // Birleşik ders (yeni listede olmayan) boşaldıysa silinir; konusuz kaydı varsa kalır
    const stillSeeded = SEED_SUBJECTS.some((s) => keyOf(s.name, s.examType) === keyOf(name, group));
    const empty = !state.topics.some((t) => t.subjectId === source.id);
    if (!stillSeeded && empty && !subjectHasRecords(state, source.id)) {
      state.subjects = state.subjects.filter((s) => s.id !== source.id);
    }
  }

  // 2) Hazır derslerin konularını yeni listeye getir
  for (const seed of SEED_SUBJECTS) {
    const subject = findSubject(seed.name, seed.examType);
    if (!subject) continue;
    const wanted = new Set(seed.topics.map(lower));
    const legacy = new Set((LEGACY_YKS_TOPICS[`${seed.name}|${seed.examType}`] ?? []).map(lower));
    state.topics = state.topics.filter(
      (t) =>
        t.subjectId !== subject.id ||
        !legacy.has(lower(t.name)) ||
        wanted.has(lower(t.name)) ||
        topicHasRecords(state, t.id),
    );
    const have = new Set(state.topics.filter((t) => t.subjectId === subject.id).map((t) => lower(t.name)));
    for (const topicName of seed.topics) {
      if (!have.has(lower(topicName))) {
        state.topics.push({ id: nextId(state.topics), subjectId: subject.id, name: topicName });
      }
    }
  }

  settings.yksListVersion = YKS_LIST_VERSION;
  return true;
}

// --- Listeleme sırası ---
// Hazır YKS dersleri ve konuları müfredat sırasıyla gelir (sonradan eklenenler de doğru yere oturur).
// Hazır listede olmayanlar (kullanıcının eklediği) eklenme sırasıyla sona gelir.

const SUBJECT_RANK = new Map(SEED_SUBJECTS.map((s, i) => [keyOf(s.name, s.examType), i]));
const TOPIC_RANK = new Map(
  SEED_SUBJECTS.map((s) => [keyOf(s.name, s.examType), new Map(s.topics.map((t, i) => [lower(t), i]))]),
);

function byRankThenId(rankOf) {
  return (a, b) => {
    const ra = rankOf(a);
    const rb = rankOf(b);
    if (ra !== rb) return ra - rb;
    return a.id - b.id;
  };
}

export function sortSubjects(subjects) {
  const rank = (s) => (s.track === "yks" ? SUBJECT_RANK.get(keyOf(s.name, s.examType)) : undefined) ?? Infinity;
  return [...subjects].sort(byRankThenId(rank));
}

export function sortTopics(subject, topics) {
  const ranks = subject.track === "yks" ? TOPIC_RANK.get(keyOf(subject.name, subject.examType)) : undefined;
  const rank = (t) => ranks?.get(lower(t.name)) ?? Infinity;
  return [...topics].sort(byRankThenId(rank));
}
