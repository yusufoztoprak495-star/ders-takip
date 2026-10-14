import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { activeSubjectIds } from "../seed.js";
import { sessionDay } from "../stats.js";
import {
  assertSubjectExists,
  assertTopicMatchesSubject,
  optionalInt,
  parseId,
  requireBody,
  requireDate,
  requireInt,
  requireIsoDateTime,
  requireOneOf,
} from "../validation.js";

// Makul üst sınır: bir kayıt en fazla 24 saat (yazım hatası ve dev sayılar istatistikleri bozmasın)
const MAX_SESSION_SECONDS = 24 * 60 * 60;

// POST ve PUT aynı kuralları kullanır
function parseSessionBody(state, rawBody) {
  const body = requireBody(rawBody);
  const subjectId = requireInt(body.subjectId, "Ders");
  const topicId = optionalInt(body.topicId, "Konu");
  assertSubjectExists(state, subjectId);
  assertTopicMatchesSubject(state, topicId, subjectId);
  // Süre ekranda dakika olarak girilir; üst sınır mesajı saniye değil saat diliyle verilir
  const durationSeconds = requireInt(body.durationSeconds, "Süre", { min: 1 });
  if (durationSeconds > MAX_SESSION_SECONDS) {
    throw new HttpError(400, "Bir çalışma kaydı en fazla 24 saat olabilir");
  }
  return {
    subjectId,
    topicId,
    startedAt: requireIsoDateTime(body.startedAt, "Başlangıç zamanı"),
    durationSeconds,
    entryType: requireOneOf(body.entryType, "Giriş türü", [
      "pomodoro",
      "manual",
    ]),
  };
}

// İsteğe bağlı from/to (yerel tarih, uçlar dahil), yeniden eskiye sıralı. Yalnızca seçili hedefin dersleri.
export function listSessions({ state, query }) {
  const active = activeSubjectIds(state);
  const from = query.has("from")
    ? requireDate(query.get("from"), "Başlangıç tarihi")
    : null;
  const to = query.has("to")
    ? requireDate(query.get("to"), "Bitiş tarihi")
    : null;
  const rows = state.sessions
    .filter((s) => {
      if (!active.has(s.subjectId)) return false;
      const day = sessionDay(s);
      return (from === null || day >= from) && (to === null || day <= to);
    })
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return { status: 200, body: rows.map((s) => ({ ...s })) };
}

export function createSession({ state, body }) {
  const session = {
    id: nextId(state.sessions),
    ...parseSessionBody(state, body),
  };
  state.sessions.push(session);
  return { status: 201, body: { ...session } };
}

export function updateSession({ state, params, body }) {
  const id = parseId(params.id);
  const session = state.sessions.find((s) => s.id === id);
  if (!session) throw new HttpError(404, "Bulunamadı");
  Object.assign(session, parseSessionBody(state, body));
  return { status: 200, body: { ...session } };
}

export function deleteSession({ state, params }) {
  const id = parseId(params.id);
  const index = state.sessions.findIndex((s) => s.id === id);
  if (index === -1) throw new HttpError(404, "Bulunamadı");
  state.sessions.splice(index, 1);
  return { status: 204, body: null };
}
