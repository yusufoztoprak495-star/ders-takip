import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { BRANCH_MAX_QUESTIONS, BRANCH_TYPE, examTotals, examTypesFor, findExamType } from "../../lib/exams.js";
import { activeSubjectIds } from "../seed.js";
import { optionalString, parseId, requireBody, requireDate, requireInt } from "../validation.js";

// Deneme sınavları: { id, track, date, name, type, results: { bölümId: { correct, wrong, blank } } }
// Net saklanmaz; liste dönerken hesaplanır (examTotals).

const NAME_MAX = 60;

function parseExamBody(state, rawBody) {
  const body = requireBody(rawBody);
  const track = state.settings.track;
  const allowed = examTypesFor(track);
  if (allowed.length === 0) {
    throw new HttpError(400, "Üniversite hedefinde deneme takibi yok");
  }
  const common = {
    date: requireDate(body.date, "Tarih"),
    name: optionalString(body.name, "Deneme adı", { maxLength: NAME_MAX }),
  };
  if (body.type === BRANCH_TYPE) return { ...common, ...parseBranch(state, body) };
  const type = allowed.find((t) => t.id === body.type);
  if (!type) {
    throw new HttpError(400, `Deneme türü şunlardan biri olmalı: ${allowed.map((t) => t.id).join(", ")}`);
  }
  const raw = body.results;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpError(400, "Bölüm sonuçları eksik");
  }
  // Yalnızca bu türün bölümleri alınır; her bölüm dolu olmalı (boş bırakılan bölüm 0 olarak gönderilir)
  const results = {};
  for (const section of type.sections) {
    results[section.id] = parseRow(raw[section.id], section.label, section.count);
  }
  return { ...common, type: type.id, results };
}

// Sonuç satırı: doğru/yanlış/boş tam sayı, toplamı soru sayısını aşamaz
function parseRow(r, label, count) {
  if (r === null || typeof r !== "object") throw new HttpError(400, `${label} sonucu eksik`);
  const opts = { min: 0, max: count };
  const row = {
    correct: requireInt(r.correct, `${label} doğru`, opts),
    wrong: requireInt(r.wrong, `${label} yanlış`, opts),
    blank: requireInt(r.blank, `${label} boş`, opts),
  };
  if (row.correct + row.wrong + row.blank > count) {
    throw new HttpError(400, `${label}: en fazla ${count} soru var`);
  }
  return row;
}

// Branş denemesi: seçili hedefin bir dersine bağlı, soru sayısını kullanıcı belirler
function parseBranch(state, body) {
  const subjectId = requireInt(body.subjectId, "Ders");
  if (!activeSubjectIds(state).has(subjectId)) throw new HttpError(400, "Ders bulunamadı");
  const questionCount = requireInt(body.questionCount, "Soru sayısı", { min: 1, max: BRANCH_MAX_QUESTIONS });
  const raw = body.results;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new HttpError(400, "Sonuç eksik");
  const subject = state.subjects.find((s) => s.id === subjectId);
  return {
    type: BRANCH_TYPE,
    subjectId,
    questionCount,
    results: { brans: parseRow(raw.brans, subject.name, questionCount) },
  };
}

function withTotals(exam, state) {
  const out = {
    ...exam,
    results: structuredClone(exam.results),
    wrongTopics: (exam.wrongTopics ?? []).map((w) => ({ ...w })),
    totals: examTotals(exam),
  };
  if (exam.type === BRANCH_TYPE) {
    const subject = state.subjects.find((s) => s.id === exam.subjectId);
    out.subjectName = subject?.name ?? "";
    out.examType = subject?.examType ?? "";
  }
  return out;
}

export function listExams({ state }) {
  const track = state.settings.track;
  const rows = state.exams
    .filter((e) => e.track === track && (e.type === BRANCH_TYPE || findExamType(e.type)?.track === track))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  return { status: 200, body: rows.map((e) => withTotals(e, state)) };
}

export function createExam({ state, body }) {
  const exam = { id: nextId(state.exams), track: state.settings.track, ...parseExamBody(state, body) };
  state.exams.push(exam);
  return { status: 201, body: withTotals(exam, state) };
}

function findOwn(state, rawId) {
  const id = parseId(rawId);
  const exam = state.exams.find((e) => e.id === id && e.track === state.settings.track);
  if (!exam) throw new HttpError(404, "Bulunamadı");
  return exam;
}

export function updateExam({ state, params, body }) {
  const exam = findOwn(state, params.id);
  const parsed = parseExamBody(state, body);
  // Tür değişirse (genelden branşa) eski türün alanları kalmasın
  for (const key of ["subjectId", "questionCount"]) delete exam[key];
  Object.assign(exam, parsed);
  return { status: 200, body: withTotals(exam, state) };
}

export function deleteExam({ state, params }) {
  const exam = findOwn(state, params.id);
  state.exams = state.exams.filter((e) => e !== exam);
  return { status: 204, body: null };
}

// --- Deneme sonrası analiz: yanlış (ya da boş) yapılan soruların konuları ---
// exam.wrongTopics: [{ topicId, count }]. Aynı konu birleşir, 0 olanlar atılır; toplam, denemedeki
// yanlış + boş sayısını aşamaz. Konu seçili hedefin bir dersine ait olmalı.
const WRONG_TOPICS_MAX = 80;

export function setWrongTopics({ state, params, body }) {
  const exam = findOwn(state, params.id);
  const items = requireBody(body).items;
  if (!Array.isArray(items)) throw new HttpError(400, "Konu listesi eksik");
  if (items.length > WRONG_TOPICS_MAX) throw new HttpError(400, `En fazla ${WRONG_TOPICS_MAX} konu işlenebilir`);
  const active = activeSubjectIds(state);
  const merged = new Map();
  for (const item of items) {
    if (item === null || typeof item !== "object") throw new HttpError(400, "Konu satırı geçersiz");
    const topicId = requireInt(item.topicId, "Konu");
    const count = requireInt(item.count, "Soru sayısı", { min: 0, max: 200 });
    const topic = state.topics.find((t) => t.id === topicId);
    if (!topic || !active.has(topic.subjectId)) throw new HttpError(400, "Konu bulunamadı");
    if (count > 0) merged.set(topicId, (merged.get(topicId) ?? 0) + count);
  }
  const { wrong, blank } = examTotals(exam);
  const total = [...merged.values()].reduce((a, b) => a + b, 0);
  if (total > wrong + blank) {
    throw new HttpError(400, `Bu denemede ${wrong} yanlış ve ${blank} boş var; en fazla ${wrong + blank} soru işlenebilir`);
  }
  exam.wrongTopics = [...merged].map(([topicId, count]) => ({ topicId, count }));
  return { status: 200, body: withTotals(exam, state) };
}

// Tüm denemelerden konu başına toplam: hangi konular sürekli soru kaybettiriyor
export function listWrongTopics({ state }) {
  const track = state.settings.track;
  const byTopic = new Map();
  for (const exam of state.exams) {
    if (exam.track !== track) continue;
    for (const w of exam.wrongTopics ?? []) {
      const row = byTopic.get(w.topicId) ?? { topicId: w.topicId, count: 0, exams: 0, lastDate: "" };
      row.count += w.count;
      row.exams += 1;
      if (exam.date > row.lastDate) row.lastDate = exam.date;
      byTopic.set(w.topicId, row);
    }
  }
  const rows = [];
  for (const row of byTopic.values()) {
    const topic = state.topics.find((t) => t.id === row.topicId);
    const subject = topic && state.subjects.find((s) => s.id === topic.subjectId);
    if (!subject) continue;
    rows.push({ ...row, topicName: topic.name, subjectId: subject.id, subjectName: subject.name, examType: subject.examType ?? "" });
  }
  rows.sort((a, b) => b.count - a.count || b.exams - a.exams || a.topicName.localeCompare(b.topicName, "tr"));
  return { status: 200, body: rows };
}
