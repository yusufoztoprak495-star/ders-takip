import { HttpError } from "../errors.js";
import { dailyStats, subjectStats, topicDetail, topicStats } from "../stats.js";
import { parseId, requireDate, requireInt } from "../validation.js";

// from ve to zorunlu; from, to'dan büyük olamaz (YYYY-MM-DD metin olarak da sıralanır)
function parseRange(query) {
  const from = requireDate(query.get("from") ?? undefined, "Başlangıç tarihi");
  const to = requireDate(query.get("to") ?? undefined, "Bitiş tarihi");
  if (from > to)
    throw new HttpError(400, "Başlangıç tarihi bitiş tarihinden sonra olamaz");
  return { from, to };
}

export function getDaily({ state, query }) {
  const range = parseRange(query);
  // Sorgu metni her zaman string gelir; sayıya çevirip tam sayı olup olmadığına bakılır
  const subjectId = query.has("subjectId")
    ? requireInt(Number(query.get("subjectId")), "Ders")
    : null;
  return { status: 200, body: dailyStats(state, { ...range, subjectId }) };
}

export function getBySubject({ state, query }) {
  return { status: 200, body: subjectStats(state, parseRange(query)) };
}

// Bir dersin konu bazında toplamları (ders sayfasındaki zayıf → güçlü liste için)
export function getByTopic({ state, query }) {
  const range = parseRange(query);
  // Eksik parametre Number(null) = 0 olmasın diye undefined verilir (NaN → "tam sayı olmalı")
  const subjectId = requireInt(Number(query.get("subjectId") ?? undefined), "Ders");
  if (!state.subjects.some((s) => s.id === subjectId))
    throw new HttpError(404, "Ders bulunamadı");
  return { status: 200, body: topicStats(state, { ...range, subjectId }) };
}

// Tek bir konunun tüm zamanlardaki ayrıntısı
export function getTopicDetail({ state, params }) {
  const detail = topicDetail(state, parseId(params.id));
  if (!detail) throw new HttpError(404, "Konu bulunamadı");
  return { status: 200, body: detail };
}
