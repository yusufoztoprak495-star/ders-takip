import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { examTotals, examTypesFor, findExamType } from "../../lib/exams.js";
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
    const r = raw[section.id];
    if (r === null || typeof r !== "object") {
      throw new HttpError(400, `${section.label} sonucu eksik`);
    }
    const opts = { min: 0, max: section.count };
    const row = {
      correct: requireInt(r.correct, `${section.label} doğru`, opts),
      wrong: requireInt(r.wrong, `${section.label} yanlış`, opts),
      blank: requireInt(r.blank, `${section.label} boş`, opts),
    };
    if (row.correct + row.wrong + row.blank > section.count) {
      throw new HttpError(400, `${section.label} bölümünde en fazla ${section.count} soru var`);
    }
    results[section.id] = row;
  }
  return {
    date: requireDate(body.date, "Tarih"),
    name: optionalString(body.name, "Deneme adı", { maxLength: NAME_MAX }),
    type: type.id,
    results,
  };
}

const withTotals = (exam) => ({ ...exam, results: structuredClone(exam.results), totals: examTotals(exam) });

export function listExams({ state }) {
  const track = state.settings.track;
  const rows = state.exams
    .filter((e) => e.track === track && findExamType(e.type)?.track === track)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  return { status: 200, body: rows.map(withTotals) };
}

export function createExam({ state, body }) {
  const exam = { id: nextId(state.exams), track: state.settings.track, ...parseExamBody(state, body) };
  state.exams.push(exam);
  return { status: 201, body: withTotals(exam) };
}

function findOwn(state, rawId) {
  const id = parseId(rawId);
  const exam = state.exams.find((e) => e.id === id && e.track === state.settings.track);
  if (!exam) throw new HttpError(404, "Bulunamadı");
  return exam;
}

export function updateExam({ state, params, body }) {
  const exam = findOwn(state, params.id);
  Object.assign(exam, parseExamBody(state, body));
  return { status: 200, body: withTotals(exam) };
}

export function deleteExam({ state, params }) {
  const exam = findOwn(state, params.id);
  state.exams = state.exams.filter((e) => e !== exam);
  return { status: 204, body: null };
}
