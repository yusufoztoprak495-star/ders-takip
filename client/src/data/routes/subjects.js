import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { activeSubjectIds, sortSubjects, sortTopics } from "../seed.js";
import { optionalString, parseId, requireBody, requireString } from "../validation.js";

const NAME_MAX = 100;
const GROUP_MAX = 40;

// Seçili hedefin dersleri, her birinin konularıyla birlikte
export function listSubjects({ state }) {
  const active = activeSubjectIds(state);
  // Hazır YKS dersleri ve konuları müfredat sırasıyla, diğerleri eklenme sırasıyla
  const subjects = sortSubjects(state.subjects.filter((s) => active.has(s.id)));
  return {
    status: 200,
    body: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      examType: s.examType ?? "",
      track: s.track,
      topics: sortTopics(s, state.topics.filter((t) => t.subjectId === s.id)).map((t) => ({
        id: t.id,
        name: t.name,
      })),
    })),
  };
}

// Ad ve grup (TYT, Sayısal, 3. Dönem...) doğrulanır; aynı hedefte aynı ad + grup ikinci kez olamaz
function parseSubjectBody(state, rawBody, { track, exceptId = null }) {
  const body = requireBody(rawBody);
  const name = requireString(body.name, "Ders adı", { maxLength: NAME_MAX });
  const examType = optionalString(body.examType, "Grup", { maxLength: GROUP_MAX });
  const key = (n, g) => `${n.toLocaleLowerCase("tr")}|${(g ?? "").toLocaleLowerCase("tr")}`;
  const duplicate = state.subjects.some(
    (s) => s.id !== exceptId && s.track === track && key(s.name, s.examType) === key(name, examType),
  );
  if (duplicate) throw new HttpError(400, "Bu ders zaten var");
  return { name, examType };
}

// Yeni ders her zaman seçili hedefe eklenir
export function createSubject({ state, body }) {
  const track = state.settings.track;
  const subject = { id: nextId(state.subjects), ...parseSubjectBody(state, body, { track }), track };
  state.subjects.push(subject);
  return { status: 201, body: { ...subject, topics: [] } };
}

export function updateSubject({ state, params, body }) {
  const id = parseId(params.id);
  const subject = state.subjects.find((s) => s.id === id);
  if (!subject) throw new HttpError(404, "Bulunamadı");
  Object.assign(subject, parseSubjectBody(state, body, { track: subject.track, exceptId: id }));
  return { status: 200, body: { ...subject } };
}

// Çalışma, soru ya da kitap kaydı olan ders silinmez (kayıtlar derssiz kalamaz).
// Kaydı olmayan ders konularıyla birlikte silinir.
export function deleteSubject({ state, params }) {
  const id = parseId(params.id);
  const index = state.subjects.findIndex((s) => s.id === id);
  if (index === -1) throw new HttpError(404, "Bulunamadı");
  const used = [...state.sessions, ...state.questions, ...state.resources].some(
    (row) => row.subjectId === id,
  );
  if (used) {
    throw new HttpError(
      400,
      "Bu derse bağlı çalışma, soru ya da kitap kaydı var; önce o kayıtları silmelisin",
    );
  }
  state.subjects.splice(index, 1);
  state.topics = state.topics.filter((t) => t.subjectId !== id);
  return { status: 204, body: null };
}
