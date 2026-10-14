import { DEFAULT_TRACK, TRACK_IDS, isTrack } from "../lib/tracks.js";
import { nextId } from "./ids.js";
import { SEED_BY_TRACK, SEED_SUBJECTS } from "./seedData.js";

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
  return { track, seededTracks: seeded };
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
  const after = JSON.stringify([state.settings, state.subjects.map((s) => s.track)]);
  return seeded || before !== after;
}

// Seçili hedefin derslerinin kimlikleri (listeler ve istatistikler bunlarla süzülür)
export function activeSubjectIds(state) {
  const track = state.settings?.track ?? DEFAULT_TRACK;
  return new Set(state.subjects.filter((s) => (s.track ?? "yks") === track).map((s) => s.id));
}
