import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { scheduleCard } from "../../lib/leitner.js";
import { activeSubjectIds } from "../seed.js";
import {
  assertTopicMatchesSubject,
  parseId,
  requireBody,
  requireDate,
  requireInt,
  requireOneOf,
  requireString,
} from "../validation.js";

// Bilgi kartları: ön yüz (soru/kavram) ve arka yüz (cevap/tanım). Leitner kutularıyla tekrar edilir.
// Satır: { id, track, subjectId, topicId, front, back, createdAt, box, nextReview, reviews, lapses }

const FRONT_MAX = 500;
const BACK_MAX = 1000;

function parseFields(state, rawBody) {
  const body = requireBody(rawBody);
  const subjectId = requireInt(body.subjectId, "Ders");
  if (!activeSubjectIds(state).has(subjectId)) throw new HttpError(400, "Ders bulunamadı");
  const topicId = body.topicId === null || body.topicId === undefined ? null : requireInt(body.topicId, "Konu");
  assertTopicMatchesSubject(state, topicId, subjectId);
  return {
    subjectId,
    topicId,
    front: requireString(body.front, "Kartın ön yüzü", { maxLength: FRONT_MAX }),
    back: requireString(body.back, "Kartın arka yüzü", { maxLength: BACK_MAX }),
  };
}

function withNames(state, c) {
  const subject = state.subjects.find((s) => s.id === c.subjectId);
  const topic = c.topicId === null ? null : state.topics.find((t) => t.id === c.topicId);
  return { ...c, subjectName: subject?.name ?? "", examType: subject?.examType ?? "", topicName: topic?.name ?? "" };
}

function findOwn(state, rawId) {
  const id = parseId(rawId);
  const card = (state.cards ?? []).find((c) => c.id === id && c.track === state.settings.track);
  if (!card) throw new HttpError(404, "Bulunamadı");
  return card;
}

export function listCards({ state }) {
  const rows = (state.cards ?? [])
    .filter((c) => c.track === state.settings.track)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview) || a.id - b.id);
  return { status: 200, body: rows.map((c) => withNames(state, c)) };
}

export function createCard({ state, body }) {
  const today = requireDate(requireBody(body).today, "Bugünün tarihi");
  state.cards ??= [];
  const card = {
    id: nextId(state.cards),
    track: state.settings.track,
    ...parseFields(state, body),
    createdAt: today,
    box: 1,
    nextReview: today,
    reviews: 0,
    lapses: 0,
  };
  state.cards.push(card);
  return { status: 201, body: withNames(state, card) };
}

export function updateCard({ state, params, body }) {
  const card = findOwn(state, params.id);
  Object.assign(card, parseFields(state, body));
  return { status: 200, body: withNames(state, card) };
}

export function deleteCard({ state, params }) {
  const card = findOwn(state, params.id);
  state.cards = state.cards.filter((c) => c !== card);
  return { status: 204, body: null };
}

export function reviewCard({ state, params, body }) {
  const card = findOwn(state, params.id);
  const data = requireBody(body);
  const today = requireDate(data.today, "Bugünün tarihi");
  const result = requireOneOf(data.result, "Sonuç", ["right", "wrong"]);
  Object.assign(card, scheduleCard(card, result, today));
  card.reviews = (card.reviews ?? 0) + 1;
  if (result === "wrong") card.lapses = (card.lapses ?? 0) + 1;
  return { status: 200, body: withNames(state, card) };
}
