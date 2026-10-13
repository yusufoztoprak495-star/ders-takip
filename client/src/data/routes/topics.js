import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import {
  parseId,
  requireBody,
  requireInt,
  requireString,
} from "../validation.js";

const NAME_MAX = 100;

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
  for (const row of [...state.sessions, ...state.questions]) {
    if (row.topicId === id) row.topicId = null;
  }
  return { status: 204, body: null };
}
