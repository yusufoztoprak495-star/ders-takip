import { SEED_SUBJECTS } from "./seedData.js";

// Boş bir veri durumu: tüm tablolar dizi, alan adları API'deki gibi (camelCase).
// Yedek dosyası da bu şekli taşır.
export function emptyState() {
  return { subjects: [], topics: [], sessions: [], questions: [], resources: [] };
}

// Ders listesi boşsa hazır ders ve konu listesini yükler; doluysa dokunmaz. Yüklediyse true döner.
export function seedIfEmpty(state) {
  if (state.subjects.length > 0) return false;
  let topicId = 1;
  SEED_SUBJECTS.forEach((subject, index) => {
    const subjectId = index + 1;
    state.subjects.push({ id: subjectId, name: subject.name, examType: subject.examType });
    for (const name of subject.topics) {
      state.topics.push({ id: topicId++, subjectId, name });
    }
  });
  return true;
}
