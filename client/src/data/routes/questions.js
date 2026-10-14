import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { activeSubjectIds } from "../seed.js";
import { netOf } from "../stats.js";
import {
  assertSubjectExists,
  assertSubjectTracksQuestions,
  assertTopicMatchesSubject,
  optionalInt,
  parseId,
  requireBody,
  requireDate,
  requireInt,
} from "../validation.js";

// Makul üst sınır: bir kayıtta en fazla 10000 soru (yazım hatasına karşı)
const MAX_QUESTION_COUNT = 10000;

// Net saklanmaz, her yanıtta hesaplanır
const toQuestionLog = (row) => ({ ...row, net: netOf(row.correct, row.wrong) });

// POST ve PUT aynı kuralları kullanır
function parseLogBody(state, rawBody) {
  const body = requireBody(rawBody);
  const subjectId = requireInt(body.subjectId, "Ders");
  const topicId = optionalInt(body.topicId, "Konu");
  const resourceId = optionalInt(body.resourceId, "Kaynak");
  assertSubjectExists(state, subjectId);
  assertSubjectTracksQuestions(state, subjectId);
  assertTopicMatchesSubject(state, topicId, subjectId);
  if (
    resourceId !== null &&
    !state.resources.some((r) => r.id === resourceId)
  ) {
    throw new HttpError(400, "Kaynak bulunamadı");
  }

  const correct = requireInt(body.correct, "Doğru sayısı", {
    min: 0,
    max: MAX_QUESTION_COUNT,
  });
  const wrong = requireInt(body.wrong, "Yanlış sayısı", {
    min: 0,
    max: MAX_QUESTION_COUNT,
  });
  const blank = requireInt(body.blank, "Boş sayısı", {
    min: 0,
    max: MAX_QUESTION_COUNT,
  });
  if (correct + wrong + blank === 0) {
    throw new HttpError(400, "En az bir soru girilmeli");
  }
  return {
    date: requireDate(body.date, "Tarih"),
    subjectId,
    topicId,
    resourceId,
    correct,
    wrong,
    blank,
  };
}

// İsteğe bağlı from/to (uçlar dahil), yeniden eskiye sıralı. Yalnızca seçili hedefin dersleri.
export function listQuestions({ state, query }) {
  const active = activeSubjectIds(state);
  const from = query.has("from")
    ? requireDate(query.get("from"), "Başlangıç tarihi")
    : null;
  const to = query.has("to")
    ? requireDate(query.get("to"), "Bitiş tarihi")
    : null;
  const rows = state.questions
    .filter(
      (q) =>
        active.has(q.subjectId) &&
        (from === null || q.date >= from) &&
        (to === null || q.date <= to),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  return { status: 200, body: rows.map(toQuestionLog) };
}

export function createQuestion({ state, body }) {
  const log = { id: nextId(state.questions), ...parseLogBody(state, body) };
  state.questions.push(log);
  return { status: 201, body: toQuestionLog(log) };
}

export function updateQuestion({ state, params, body }) {
  const id = parseId(params.id);
  const log = state.questions.find((q) => q.id === id);
  if (!log) throw new HttpError(404, "Bulunamadı");
  Object.assign(log, parseLogBody(state, body));
  return { status: 200, body: toQuestionLog(log) };
}

export function deleteQuestion({ state, params }) {
  const id = parseId(params.id);
  const index = state.questions.findIndex((q) => q.id === id);
  if (index === -1) throw new HttpError(404, "Bulunamadı");
  state.questions.splice(index, 1);
  return { status: 204, body: null };
}
