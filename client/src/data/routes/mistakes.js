import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { addDays } from "../../lib/insights.js";
import { activeSubjectIds } from "../seed.js";
import {
  assertTopicMatchesSubject,
  optionalString,
  parseId,
  requireBody,
  requireDate,
  requireInt,
  requireOneOf,
} from "../validation.js";
import { REVIEW_INTERVALS } from "./topics.js";

// Hata defteri: yanlış yapılan ya da çözülemeyen sorular. Fotoğraf görsel deposunda (data/images.js)
// ayrı durur; burada yalnızca kimliği (imageId) tutulur, böylece her kayıtta megabaytlarca veri yazılmaz.
// Satır: { id, track, subjectId, topicId, source, note, answer, imageId, createdAt,
//          reviewStep, nextReview, learnedAt, wrongCount }
// Tekrar konu tekrarıyla aynı aralıklarla: eklendikten 1 gün sonra, sonra 3, 7, 30 gün. Yine yanlış
// yapılırsa başa döner. Dört kez üst üste doğru çözülen soru "öğrenildi" sayılır.

const SOURCE_MAX = 80;
const NOTE_MAX = 1000;
const ANSWER_MAX = 40;
export const IMAGE_ID = /^[a-z0-9-]{8,40}$/;

function parseFields(state, rawBody) {
  const body = requireBody(rawBody);
  const subjectId = requireInt(body.subjectId, "Ders");
  if (!activeSubjectIds(state).has(subjectId)) throw new HttpError(400, "Ders bulunamadı");
  const topicId = body.topicId === null || body.topicId === undefined ? null : requireInt(body.topicId, "Konu");
  assertTopicMatchesSubject(state, topicId, subjectId);
  let imageId = null;
  if (body.imageId !== null && body.imageId !== undefined) {
    if (typeof body.imageId !== "string" || !IMAGE_ID.test(body.imageId)) throw new HttpError(400, "Fotoğraf kimliği geçersiz");
    imageId = body.imageId;
  }
  const fields = {
    subjectId,
    topicId,
    source: optionalString(body.source, "Kaynak", { maxLength: SOURCE_MAX }),
    note: optionalString(body.note, "Not", { maxLength: NOTE_MAX }),
    answer: optionalString(body.answer, "Doğru cevap", { maxLength: ANSWER_MAX }),
    imageId,
  };
  if (!fields.imageId && !fields.note) throw new HttpError(400, "Sorunun fotoğrafını ekle ya da bir not yaz");
  return fields;
}

function withNames(state, m) {
  const subject = state.subjects.find((s) => s.id === m.subjectId);
  const topic = m.topicId === null ? null : state.topics.find((t) => t.id === m.topicId);
  return { ...m, subjectName: subject?.name ?? "", examType: subject?.examType ?? "", topicName: topic?.name ?? "" };
}

function findOwn(state, rawId) {
  const id = parseId(rawId);
  const row = (state.mistakes ?? []).find((m) => m.id === id && m.track === state.settings.track);
  if (!row) throw new HttpError(404, "Bulunamadı");
  return row;
}

// Seçili hedefin soruları: tekrarı yakın olan önce, öğrenilenler en sonda
export function listMistakes({ state }) {
  const rows = (state.mistakes ?? [])
    .filter((m) => m.track === state.settings.track)
    .sort((a, b) => (a.nextReview ?? "9999").localeCompare(b.nextReview ?? "9999") || b.id - a.id);
  return { status: 200, body: rows.map((m) => withNames(state, m)) };
}

export function createMistake({ state, body }) {
  const today = requireDate(requireBody(body).today, "Bugünün tarihi");
  state.mistakes ??= [];
  const row = {
    id: nextId(state.mistakes),
    track: state.settings.track,
    ...parseFields(state, body),
    createdAt: today,
    reviewStep: 0,
    nextReview: addDays(today, REVIEW_INTERVALS[0]),
    learnedAt: null,
    wrongCount: 0,
  };
  state.mistakes.push(row);
  return { status: 201, body: withNames(state, row) };
}

export function updateMistake({ state, params, body }) {
  const row = findOwn(state, params.id);
  Object.assign(row, parseFields(state, body));
  return { status: 200, body: withNames(state, row) };
}

export function deleteMistake({ state, params }) {
  const row = findOwn(state, params.id);
  state.mistakes = state.mistakes.filter((m) => m !== row);
  return { status: 200, body: { imageId: row.imageId } };
}

export function reviewMistake({ state, params, body }) {
  const row = findOwn(state, params.id);
  const data = requireBody(body);
  const today = requireDate(data.today, "Bugünün tarihi");
  const result = requireOneOf(data.result, "Sonuç", ["right", "wrong"]);
  if (result === "wrong") {
    row.reviewStep = 0;
    row.nextReview = addDays(today, REVIEW_INTERVALS[0]);
    row.learnedAt = null;
    row.wrongCount = (row.wrongCount ?? 0) + 1;
  } else {
    row.reviewStep = (row.reviewStep ?? 0) + 1;
    const next = REVIEW_INTERVALS[row.reviewStep];
    row.nextReview = next === undefined ? null : addDays(today, next);
    row.learnedAt = next === undefined ? today : null;
  }
  return { status: 200, body: withNames(state, row) };
}
