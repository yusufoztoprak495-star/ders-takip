import { HttpError } from "../errors.js";
import { addDays } from "../../lib/insights.js";
import { activeSubjectIds } from "../seed.js";
import { nextId } from "../ids.js";
import {
  parseId,
  requireBody,
  requireDate,
  requireInt,
  requireString,
} from "../validation.js";

const NAME_MAX = 100;
export const NOTE_MAX = 2000;

export function createTopic({ state, body }) {
  const data = requireBody(body);
  const subjectId = requireInt(data.subjectId, "Ders");
  const name = requireString(data.name, "Konu adı", { maxLength: NAME_MAX });
  if (!state.subjects.some((s) => s.id === subjectId))
    throw new HttpError(400, "Ders bulunamadı");

  const topic = { id: nextId(state.topics), subjectId, name };
  state.topics.push(topic);
  return { status: 201, body: { ...topic } };
}

export function renameTopic({ state, params, body }) {
  const id = parseId(params.id);
  const topic = state.topics.find((t) => t.id === id);
  if (!topic) throw new HttpError(404, "Bulunamadı");
  topic.name = requireString(requireBody(body).name, "Konu adı", {
    maxLength: NAME_MAX,
  });
  return { status: 200, body: { ...topic } };
}

// Konu silinince ona bağlı kayıtlar silinmez, konusuz kalır
export function deleteTopic({ state, params }) {
  const id = parseId(params.id);
  const index = state.topics.findIndex((t) => t.id === id);
  if (index === -1) throw new HttpError(404, "Bulunamadı");
  state.topics.splice(index, 1);
  for (const row of [...state.sessions, ...state.questions, ...(state.mistakes ?? [])]) {
    if (row.topicId === id) row.topicId = null;
  }
  // Denemelerde "yanlış yapılan konular" listesinden de düşer (sayısız bir konu satırı anlamsız)
  for (const exam of state.exams) {
    if (exam.wrongTopics) exam.wrongTopics = exam.wrongTopics.filter((w) => w.topicId !== id);
  }
  return { status: 204, body: null };
}

// Konu notu: formül, püf noktası, sık yapılan hata. Boş not silinir.
export function setTopicNote({ state, params, body }) {
  const topic = findTopic(state, params.id);
  const raw = requireBody(body).note;
  if (typeof raw !== "string") throw new HttpError(400, "Not metin olmalı");
  const note = raw.trim();
  if (note.length > NOTE_MAX) throw new HttpError(400, `Not en fazla ${NOTE_MAX} karakter olabilir`);
  if (note) topic.note = note;
  else delete topic.note;
  return { status: 200, body: { id: topic.id, note } };
}

// --- Konu bitirme ve aralıklı tekrar ---
// Bitirilen konu 1 gün sonra, sonra 3, 7 ve 30 gün arayla tekrar listesine düşer (unutma eğrisine karşı).
// Dördüncü tekrardan sonra konu "kalıcı" sayılır, artık tekrar istenmez. "today" yerel gündür (sayfa gönderir).
export const REVIEW_INTERVALS = [1, 3, 7, 30];

function findTopic(state, rawId) {
  const id = parseId(rawId);
  const topic = state.topics.find((t) => t.id === id);
  if (!topic) throw new HttpError(404, "Bulunamadı");
  return topic;
}

export function topicStatus(topic) {
  return topic.doneAt
    ? { done: true, doneAt: topic.doneAt, nextReview: topic.nextReview ?? null, reviewStep: topic.reviewStep ?? 0 }
    : { done: false };
}

export function setTopicDone({ state, params, body }) {
  const topic = findTopic(state, params.id);
  const data = requireBody(body);
  const today = requireDate(data.today, "Bugünün tarihi");
  if (typeof data.done !== "boolean") throw new HttpError(400, "Bitti bilgisi doğru/yanlış olmalı");
  if (data.done) {
    topic.doneAt = today;
    topic.reviewStep = 0;
    topic.nextReview = addDays(today, REVIEW_INTERVALS[0]);
  } else {
    delete topic.doneAt;
    delete topic.reviewStep;
    delete topic.nextReview;
  }
  return { status: 200, body: { id: topic.id, name: topic.name, ...topicStatus(topic) } };
}

export function reviewTopic({ state, params, body }) {
  const topic = findTopic(state, params.id);
  const today = requireDate(requireBody(body).today, "Bugünün tarihi");
  if (!topic.doneAt) throw new HttpError(400, "Önce konuyu bitirdim olarak işaretle");
  topic.reviewStep = (topic.reviewStep ?? 0) + 1;
  const next = REVIEW_INTERVALS[topic.reviewStep];
  topic.nextReview = next === undefined ? null : addDays(today, next);
  return { status: 200, body: { id: topic.id, name: topic.name, ...topicStatus(topic) } };
}

// Belirtilen güne kadar tekrarı gelmiş konular (seçili hedefin dersleri), en eskisi önce
export function listDueReviews({ state, query }) {
  const date = requireDate(query.get("date") ?? undefined, "Tarih");
  const active = activeSubjectIds(state);
  const subjectOf = new Map(state.subjects.map((s) => [s.id, s]));
  const due = state.topics
    .filter((t) => t.nextReview && t.nextReview <= date && active.has(t.subjectId))
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview) || a.id - b.id)
    .map((t) => ({
      id: t.id,
      name: t.name,
      subjectId: t.subjectId,
      subjectName: subjectOf.get(t.subjectId)?.name ?? "",
      examType: subjectOf.get(t.subjectId)?.examType ?? "",
      nextReview: t.nextReview,
      reviewStep: t.reviewStep ?? 0,
    }));
  return { status: 200, body: due };
}
