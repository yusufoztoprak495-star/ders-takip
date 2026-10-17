import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { absenceAllowance, lessonHours } from "../../lib/grades.js";
import { activeSubjectIds } from "../seed.js";
import { optionalString, parseId, requireBody, requireDate, requireInt, requireString } from "../validation.js";

// Üniversite: derslerin kredisi, not bileşenleri (Vize, Final...), devamsızlık ve ödev teslimleri.
// courses: { id, subjectId, credits, absenceLimit (null: ders programından hesaplanır), components }
// absences: { id, track, subjectId, date, hours } · assignments: { id, track, subjectId, title, due, note, doneAt }

export const DEFAULT_COMPONENTS = [
  { name: "Vize", weight: 40, score: null },
  { name: "Final", weight: 60, score: null },
];

const ownTrack = (state, rows) => (rows ?? []).filter((r) => r.track === state.settings.track);

function requireActiveSubject(state, raw, { allowNull = false } = {}) {
  if (allowNull && (raw === null || raw === undefined)) return null;
  const id = requireInt(raw, "Ders");
  if (!activeSubjectIds(state).has(id)) throw new HttpError(400, "Ders bulunamadı");
  return id;
}

export function listCourses({ state }) {
  const active = activeSubjectIds(state);
  const classes = ownTrack(state, state.classes);
  const absences = ownTrack(state, state.absences);
  const body = state.subjects
    .filter((s) => active.has(s.id))
    .map((s) => {
      const info = (state.courses ?? []).find((c) => c.subjectId === s.id);
      const weeklyHours = classes.filter((c) => c.subjectId === s.id).reduce((n, c) => n + lessonHours(c.start, c.end), 0);
      const absenceLimit = info?.absenceLimit ?? null;
      return {
        subjectId: s.id,
        name: s.name,
        group: s.examType ?? "",
        credits: info?.credits ?? 0,
        absenceLimit,
        weeklyHours,
        allowance: absenceLimit ?? absenceAllowance(weeklyHours),
        absent: absences.filter((a) => a.subjectId === s.id).reduce((n, a) => n + a.hours, 0),
        components: structuredClone(info?.components ?? DEFAULT_COMPONENTS),
      };
    });
  return { status: 200, body };
}

function parseComponents(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 10) throw new HttpError(400, "En az 1, en fazla 10 not bileşeni olmalı");
  const list = raw.map((c, i) => {
    if (c === null || typeof c !== "object") throw new HttpError(400, `${i + 1}. not bileşeni geçersiz`);
    const name = requireString(c.name, "Bileşen adı", { maxLength: 30 });
    const weight = requireInt(c.weight, `${name} ağırlığı`, { min: 1, max: 100 });
    let score = null;
    if (c.score !== null && c.score !== undefined) {
      if (typeof c.score !== "number" || !Number.isFinite(c.score) || c.score < 0 || c.score > 100) {
        throw new HttpError(400, `${name} notu 0 ile 100 arasında olmalı`);
      }
      score = Math.round(c.score * 100) / 100;
    }
    return { name, weight, score };
  });
  const total = list.reduce((s, c) => s + c.weight, 0);
  if (total !== 100) throw new HttpError(400, `Ağırlıkların toplamı 100 olmalı (şu an ${total})`);
  return list;
}

export function updateCourse({ state, params, body: rawBody }) {
  const subjectId = parseId(params.subjectId);
  if (!activeSubjectIds(state).has(subjectId)) throw new HttpError(404, "Ders bulunamadı");
  const body = requireBody(rawBody);
  const fields = {
    credits: requireInt(body.credits, "Kredi", { min: 0, max: 30 }),
    absenceLimit: body.absenceLimit === null || body.absenceLimit === undefined ? null : requireInt(body.absenceLimit, "Devamsızlık hakkı", { min: 0, max: 500 }),
    components: parseComponents(body.components),
  };
  state.courses ??= [];
  let row = state.courses.find((c) => c.subjectId === subjectId);
  if (!row) {
    row = { id: nextId(state.courses), subjectId };
    state.courses.push(row);
  }
  Object.assign(row, fields);
  return { status: 200, body: { ...row, components: structuredClone(row.components) } };
}

// --- Devamsızlık ---
export function listAbsences({ state }) {
  const rows = ownTrack(state, state.absences).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  return { status: 200, body: rows.map((r) => ({ ...r })) };
}

export function createAbsence({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  state.absences ??= [];
  const row = {
    id: nextId(state.absences),
    track: state.settings.track,
    subjectId: requireActiveSubject(state, body.subjectId),
    date: requireDate(body.date, "Tarih"),
    hours: requireInt(body.hours, "Ders saati", { min: 1, max: 12 }),
  };
  state.absences.push(row);
  return { status: 201, body: { ...row } };
}

export function deleteAbsence({ state, params }) {
  const id = parseId(params.id);
  const row = ownTrack(state, state.absences).find((a) => a.id === id);
  if (!row) throw new HttpError(404, "Bulunamadı");
  state.absences = state.absences.filter((a) => a !== row);
  return { status: 204, body: null };
}

// --- Ödevler ---
function parseAssignment(state, rawBody) {
  const body = requireBody(rawBody);
  return {
    subjectId: requireActiveSubject(state, body.subjectId, { allowNull: true }),
    title: requireString(body.title, "Ödev adı", { maxLength: 80 }),
    due: requireDate(body.due, "Teslim tarihi"),
    note: optionalString(body.note, "Not", { maxLength: 300 }),
  };
}

function withSubject(state, row) {
  const subject = row.subjectId === null ? null : state.subjects.find((s) => s.id === row.subjectId);
  return { ...row, subjectName: subject?.name ?? "" };
}

function findAssignment(state, rawId) {
  const id = parseId(rawId);
  const row = ownTrack(state, state.assignments).find((a) => a.id === id);
  if (!row) throw new HttpError(404, "Bulunamadı");
  return row;
}

export function listAssignments({ state }) {
  const rows = ownTrack(state, state.assignments).sort((a, b) => a.due.localeCompare(b.due) || a.id - b.id);
  return { status: 200, body: rows.map((r) => withSubject(state, r)) };
}

export function createAssignment({ state, body }) {
  state.assignments ??= [];
  const row = { id: nextId(state.assignments), track: state.settings.track, ...parseAssignment(state, body), doneAt: null };
  state.assignments.push(row);
  return { status: 201, body: withSubject(state, row) };
}

export function updateAssignment({ state, params, body }) {
  const row = findAssignment(state, params.id);
  Object.assign(row, parseAssignment(state, body));
  return { status: 200, body: withSubject(state, row) };
}

export function setAssignmentDone({ state, params, body: rawBody }) {
  const row = findAssignment(state, params.id);
  const body = requireBody(rawBody);
  if (typeof body.done !== "boolean") throw new HttpError(400, "Teslim bilgisi doğru/yanlış olmalı");
  row.doneAt = body.done ? requireDate(body.today, "Bugünün tarihi") : null;
  return { status: 200, body: withSubject(state, row) };
}

export function deleteAssignment({ state, params }) {
  const row = findAssignment(state, params.id);
  state.assignments = state.assignments.filter((a) => a !== row);
  return { status: 204, body: null };
}
