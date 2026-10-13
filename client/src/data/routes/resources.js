import { todayLocal } from "../../lib/dates.js";
import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import {
  assertSubjectExists,
  parseId,
  requireBody,
  requireInt,
  requireOneOf,
  requireString,
} from "../validation.js";

// Makul üst sınır: bir kitaptan en fazla 10000 test çözülmüş sayılır (yazım hatasına karşı)
const MAX_SOLVED_TESTS = 10000;
const PUBLISHER_MAX = 100;
const STATUSES = ["elimde", "bitirdim"];

// lastSolvedAt: elle (çözülen test artınca) yazılan gün. Kitaba bağlı soru kayıtlarının en yeni
// tarihi de hesaba katılır; ikisinden yeni olanı "son çözüm tarihi" sayılır.
function toResource(state, row) {
  let last = row.lastSolvedAt ?? "";
  for (const q of state.questions) {
    if (q.resourceId === row.id && q.date > last) last = q.date;
  }
  return { ...row, lastSolvedAt: last || null };
}

// Yayınevi isteğe bağlıdır: verilmezse boş metin olur
function parsePublisher(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string")
    throw new HttpError(400, "Yayınevi metin olmalı");
  const trimmed = value.trim();
  if (trimmed.length > PUBLISHER_MAX) {
    throw new HttpError(
      400,
      `Yayınevi en fazla ${PUBLISHER_MAX} karakter olabilir`,
    );
  }
  return trimmed;
}

// POST ve PUT aynı kuralları kullanır. `solvedTests` verilmezse `fallbackSolved` kullanılır:
// POST'ta 0, PUT'ta mevcut değer (böylece ad değiştirirken sayaç sıfırlanmaz).
function parseResourceBody(state, rawBody, fallbackSolved) {
  const body = requireBody(rawBody);
  const subjectId = requireInt(body.subjectId, "Ders");
  assertSubjectExists(state, subjectId);
  return {
    name: requireString(body.name, "Kitap adı", { maxLength: 150 }),
    publisher: parsePublisher(body.publisher),
    subjectId,
    status: requireOneOf(body.status ?? "elimde", "Durum", STATUSES),
    solvedTests: requireInt(
      body.solvedTests ?? fallbackSolved,
      "Çözülen test sayısı",
      {
        min: 0,
        max: MAX_SOLVED_TESTS,
      },
    ),
  };
}

export function listResources({ state }) {
  const rows = [...state.resources].sort((a, b) => a.id - b.id);
  return { status: 200, body: rows.map((r) => toResource(state, r)) };
}

export function createResource({ state, body }) {
  const r = parseResourceBody(state, body, 0);
  const resource = {
    id: nextId(state.resources),
    ...r,
    // İlk kayıtta zaten test çözülmüşse son çözüm tarihi bugün olur
    lastSolvedAt: r.solvedTests > 0 ? todayLocal() : null,
  };
  state.resources.push(resource);
  return { status: 201, body: toResource(state, resource) };
}

export function updateResource({ state, params, body }) {
  const id = parseId(params.id);
  const resource = state.resources.find((r) => r.id === id);
  if (!resource) throw new HttpError(404, "Bulunamadı");
  const r = parseResourceBody(state, body, resource.solvedTests);
  // Çözülen test arttıysa bugün çözülmüş demektir; aynı kalır ya da azalırsa tarih değişmez
  const raised = r.solvedTests > resource.solvedTests;
  Object.assign(resource, r);
  if (raised) resource.lastSolvedAt = todayLocal();
  return { status: 200, body: toResource(state, resource) };
}

// Kitap silinince ona bağlı soru kayıtları silinmez, kitapsız kalır
export function deleteResource({ state, params }) {
  const id = parseId(params.id);
  const index = state.resources.findIndex((r) => r.id === id);
  if (index === -1) throw new HttpError(404, "Bulunamadı");
  state.resources.splice(index, 1);
  for (const q of state.questions) {
    if (q.resourceId === id) q.resourceId = null;
  }
  return { status: 204, body: null };
}
