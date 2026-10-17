import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { activeSubjectIds } from "../seed.js";
import { DAYS, DAY_MINUTES, DEFAULT_DAY_WINDOW, TIME_STEP, dayIndexOfDate, formatClock, overlaps } from "../../lib/schedule.js";
import {
  optionalInt,
  optionalString,
  parseId,
  requireBody,
  requireDate,
  requireInt,
  requireOneOf,
  requireString,
} from "../validation.js";

// İki tablo:
//  classes: ders programı (okul/üniversite dersleri). Her satır tek gün: { id, track, day, start, end, title, place, subjectId }
//  plans:   haftalık programın kullanıcı blokları: { id, track, day, start, end, kind, title, subjectId }
// Ders programı haftalık programa ayrıca kopyalanmaz: haftalık sayfa iki tabloyu birlikte okur,
// böylece ders programında yapılan her değişiklik orada anında görünür.

const TITLE_MAX = 60;
const PLACE_MAX = 40;
// Blok türleri: çalışma, mola, diğer (spor, yemek, kurs...)
export const PLAN_KINDS = ["study", "break", "other"];
// Gün aralığı en az bu kadar olmalı (yanlışlıkla 15:00–15:30 girilirse ızgara anlamsızlaşır)
const MIN_WINDOW = 4 * 60;

// --- Ortak doğrulayıcılar ---

function requireDay(value) {
  return requireInt(value, "Gün", { min: 0, max: DAYS.length - 1 });
}

// Saat: 5 dakikalık adımlarla gün içinde bir an
function requireTime(value, field) {
  const minutes = requireInt(value, field, { min: 0, max: DAY_MINUTES });
  if (minutes % TIME_STEP !== 0) throw new HttpError(400, `${field} 5 dakikalık adımlarla girilmeli`);
  return minutes;
}

function requireSpan(body) {
  const start = requireTime(body.start, "Başlangıç saati");
  const end = requireTime(body.end, "Bitiş saati");
  if (end <= start) throw new HttpError(400, "Bitiş saati başlangıçtan sonra olmalı");
  return { start, end };
}

// Ders bağlantısı isteğe bağlı; verilirse seçili hedefin derslerinden biri olmalı
function optionalSubject(state, value) {
  const subjectId = optionalInt(value, "Ders");
  if (subjectId !== null && !activeSubjectIds(state).has(subjectId)) {
    throw new HttpError(400, "Ders bulunamadı");
  }
  return subjectId;
}

const track = (state) => state.settings.track;
const ofTrack = (rows, state) => rows.filter((r) => r.track === track(state));
const byTime = (a, b) => a.day - b.day || a.start - b.start || a.id - b.id;
const spanText = (row) => `${formatClock(row.start)}–${formatClock(row.end)}`;

// Aynı gün çakışan satırı bulur (düzenlenen satırın kendisi hariç)
function clashIn(rows, day, span, exceptId = null) {
  return rows.find((r) => r.id !== exceptId && r.day === day && overlaps(r, span));
}

const subjectName = (state, id) => state.subjects.find((s) => s.id === id)?.name ?? "";
// Blok adı boşsa bağlı dersin adı, o da yoksa türün adı
function planLabel(state, plan) {
  return plan.title || subjectName(state, plan.subjectId) || (plan.kind === "break" ? "Mola" : "Blok");
}

// --- Ders programı ---

export function listClasses({ state }) {
  return { status: 200, body: ofTrack(state.classes, state).sort(byTime).map((c) => ({ ...c })) };
}

function parseClassFields(state, body) {
  return {
    title: requireString(body.title, "Ders adı", { maxLength: TITLE_MAX }),
    place: optionalString(body.place, "Yer", { maxLength: PLACE_MAX }),
    subjectId: optionalSubject(state, body.subjectId),
    ...requireSpan(body),
  };
}

function assertNoClassClash(state, day, span, exceptId) {
  const clash = clashIn(ofTrack(state.classes, state), day, span, exceptId);
  if (clash) {
    throw new HttpError(
      400,
      `${DAYS[day].name} ${spanText(clash)} saatinde "${clash.title}" dersi var; saatler çakışıyor`,
    );
  }
}

// Aynı ders birden çok güne tek seferde eklenebilir (örn. pazartesi ve perşembe 08:30–09:10)
export function createClasses({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  const fields = parseClassFields(state, body);
  if (!Array.isArray(body.days) || body.days.length === 0) {
    throw new HttpError(400, "En az bir gün seçmelisin");
  }
  const days = body.days.map(requireDay);
  if (new Set(days).size !== days.length) throw new HttpError(400, "Aynı gün iki kez seçilmiş");
  // Önce hepsi denetlenir; biri çakışırsa hiçbiri eklenmez
  for (const day of days) assertNoClassClash(state, day, fields, null);
  const created = days.map((day) => {
    const row = { id: nextId(state.classes), track: track(state), day, ...fields };
    state.classes.push(row);
    return { ...row };
  });
  return { status: 201, body: created.sort(byTime) };
}

function findOwn(state, table, rawId) {
  const id = parseId(rawId);
  const row = state[table].find((r) => r.id === id && r.track === track(state));
  if (!row) throw new HttpError(404, "Bulunamadı");
  return row;
}

export function updateClass({ state, params, body: rawBody }) {
  const row = findOwn(state, "classes", params.id);
  const body = requireBody(rawBody);
  const fields = parseClassFields(state, body);
  const day = requireDay(body.day);
  assertNoClassClash(state, day, fields, row.id);
  Object.assign(row, fields, { day });
  return { status: 200, body: { ...row } };
}

export function deleteClass({ state, params }) {
  const row = findOwn(state, "classes", params.id);
  state.classes = state.classes.filter((r) => r !== row);
  return { status: 204, body: null };
}

// --- Haftalık program blokları ---

export function listPlans({ state }) {
  return { status: 200, body: ofTrack(state.plans, state).sort(byTime).map((p) => ({ ...p })) };
}

function parsePlanFields(state, body) {
  const kind = requireOneOf(body.kind, "Blok türü", PLAN_KINDS);
  const subjectId = kind === "study" ? optionalSubject(state, body.subjectId) : null;
  let title;
  if (kind === "other") {
    title = requireString(body.title, "Blok adı", { maxLength: TITLE_MAX });
  } else {
    title = optionalString(body.title, "Blok adı", { maxLength: TITLE_MAX });
  }
  // Çalışma bloğu ne çalışılacağını söylemeli: ders ya da kısa bir başlık
  if (kind === "study" && !title && subjectId === null) {
    throw new HttpError(400, "Çalışma bloğu için bir ders seç ya da başlık yaz");
  }
  return { kind, title, subjectId, day: requireDay(body.day), ...requireSpan(body) };
}

// Plan bloğu ders saatine ve başka bir bloğa denk gelemez
function assertPlanFits(state, fields, exceptId) {
  const lessonClash = clashIn(ofTrack(state.classes, state), fields.day, fields, null);
  if (lessonClash) {
    throw new HttpError(
      400,
      `Bu saatte ders programında "${lessonClash.title}" var (${spanText(lessonClash)}); bloğu boş bir saate koy`,
    );
  }
  const planClash = clashIn(ofTrack(state.plans, state), fields.day, fields, exceptId);
  if (planClash) {
    throw new HttpError(
      400,
      `Bu saat "${planLabel(state, planClash)}" bloğuyla çakışıyor (${spanText(planClash)})`,
    );
  }
}

export function createPlan({ state, body }) {
  const fields = parsePlanFields(state, requireBody(body));
  assertPlanFits(state, fields, null);
  const row = { id: nextId(state.plans), track: track(state), ...fields };
  state.plans.push(row);
  return { status: 201, body: { ...row } };
}

export function updatePlan({ state, params, body }) {
  const row = findOwn(state, "plans", params.id);
  const fields = parsePlanFields(state, requireBody(body));
  assertPlanFits(state, fields, row.id);
  Object.assign(row, fields);
  return { status: 200, body: { ...row } };
}

export function deletePlan({ state, params }) {
  const row = findOwn(state, "plans", params.id);
  state.plans = state.plans.filter((r) => r !== row);
  dropChecks(state);
  return { status: 204, body: null };
}

// Artık var olmayan bloklara ait "yapıldı" işaretlerini temizler
function dropChecks(state) {
  const alive = new Set(state.plans.map((p) => p.id));
  state.planChecks = state.planChecks.filter((c) => alive.has(c.planId));
}

// --- Bugünün programı ---
// Haftalık program her hafta tekrar eden bir şablondur; "yapıldı" ise o tarihe özeldir (planChecks).

export function getToday({ state, query }) {
  const date = requireDate(query.get("date") ?? undefined, "Tarih");
  const day = dayIndexOfDate(date);
  const subjectName = (id) => state.subjects.find((s) => s.id === id)?.name ?? "";
  const done = new Set(state.planChecks.filter((c) => c.date === date).map((c) => c.planId));
  const classes = ofTrack(state.classes, state)
    .filter((c) => c.day === day)
    .map((c) => ({ type: "class", id: c.id, start: c.start, end: c.end, title: c.title, place: c.place, subjectId: c.subjectId }));
  const plans = ofTrack(state.plans, state)
    .filter((p) => p.day === day)
    .map((p) => ({
      type: p.kind,
      id: p.id,
      start: p.start,
      end: p.end,
      title: planLabel(state, p),
      note: p.title,
      subjectId: p.subjectId,
      subjectName: subjectName(p.subjectId),
      done: done.has(p.id),
    }));
  const items = [...classes, ...plans].sort((a, b) => a.start - b.start || (a.type === "class" ? -1 : 1));
  return { status: 200, body: { date, day, items } };
}

export function setPlanDone({ state, params, body: rawBody }) {
  const row = findOwn(state, "plans", params.id);
  const body = requireBody(rawBody);
  const date = requireDate(body.date, "Tarih");
  if (typeof body.done !== "boolean") throw new HttpError(400, "Yapıldı bilgisi doğru/yanlış olmalı");
  if (dayIndexOfDate(date) !== row.day) {
    throw new HttpError(400, `Bu blok ${DAYS[row.day].name} günü; o tarih başka bir güne denk geliyor`);
  }
  state.planChecks = state.planChecks.filter((c) => !(c.planId === row.id && c.date === date));
  if (body.done) state.planChecks.push({ id: nextId(state.planChecks), planId: row.id, date });
  return { status: 200, body: { id: row.id, date, done: body.done } };
}

// Bir günün bloklarını başka günlere kopyalar. Hedef günlerin eski blokları kaldırılır (sayfa önce sorar);
// hedef günde ders saatine denk gelen blok atlanır. Kaç blok kopyalandı / atlandı döner.
export function copyDay({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  const from = requireDay(body.from);
  if (!Array.isArray(body.to) || body.to.length === 0) throw new HttpError(400, "Kopyalanacak en az bir gün seç");
  const targets = [...new Set(body.to.map(requireDay))];
  if (targets.includes(from)) throw new HttpError(400, "Bir gün kendisine kopyalanamaz");

  const mine = ofTrack(state.plans, state);
  const source = mine.filter((p) => p.day === from);
  const lessons = ofTrack(state.classes, state);
  state.plans = state.plans.filter((p) => !(p.track === track(state) && targets.includes(p.day)));
  let copied = 0;
  let skipped = 0;
  for (const day of targets) {
    for (const plan of source) {
      if (clashIn(lessons, day, plan, null)) {
        skipped += 1;
        continue;
      }
      state.plans.push({ ...plan, id: nextId(state.plans), day });
      copied += 1;
    }
  }
  dropChecks(state);
  return { status: 200, body: { copied, skipped } };
}

// --- Gün aralığı (izgaranın ve boş zaman hesabının sınırları) ---

export function dayWindowOf(state) {
  const { dayStart, dayEnd } = state.settings;
  return Number.isSafeInteger(dayStart) && Number.isSafeInteger(dayEnd) ? { dayStart, dayEnd } : { ...DEFAULT_DAY_WINDOW };
}

export function getSchedule({ state }) {
  return { status: 200, body: dayWindowOf(state) };
}

export function updateSchedule({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  const dayStart = requireTime(body.dayStart, "Günün başlangıcı");
  const dayEnd = requireTime(body.dayEnd, "Günün bitişi");
  if (dayEnd - dayStart < MIN_WINDOW) {
    throw new HttpError(400, "Gün aralığı en az 4 saat olmalı");
  }
  state.settings.dayStart = dayStart;
  state.settings.dayEnd = dayEnd;
  return { status: 200, body: { dayStart, dayEnd } };
}
