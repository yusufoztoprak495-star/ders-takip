import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { WEEKS } from "../../lib/months.js";
import { clashIn, ofTrack, parsePlanFields, planLabel, spanText, track } from "./schedule.js";
import { requireMonth } from "./monthPlans.js";
import { parseId, requireBody, requireInt } from "../validation.js";

// Haftaya özel bloklar: ortak şablona (ders programı + haftalık plan) ek olarak, ayın yalnızca bir haftasına konan
// bloklar (örn. 3. hafta vize, 2. hafta aile yemeği).
//  weekPlans: { id, track, month ('YYYY-AA'), week (1–4), day (0 = pazartesi), start, end, kind, title, subjectId }
// Blok alanları ve kuralları ortak bloklarla aynıdır (parsePlanFields). Gün adıyla tutulduğu için son haftada
// (22–31) bir gün adı iki kez geçerse blok ikisine de uygulanır (bkz. lib/months.js).

const byTime = (a, b) => a.week - b.week || a.day - b.day || a.start - b.start || a.id - b.id;

function parseWeekPlan(state, body) {
  return { week: requireInt(body.week, "Hafta", { min: 1, max: WEEKS }), ...parsePlanFields(state, body) };
}

// Hafta bloğu ders saatine, ortak bloklara ve aynı haftadaki başka bloklara denk gelemez
function assertFits(state, month, fields, exceptId) {
  const lesson = clashIn(ofTrack(state.classes, state), fields.day, fields, null);
  if (lesson) {
    throw new HttpError(400, `Bu saatte ders programında "${lesson.title}" var (${spanText(lesson)}); bloğu boş bir saate koy`);
  }
  const common = clashIn(ofTrack(state.plans, state), fields.day, fields, null);
  if (common) {
    throw new HttpError(400, `Bu saat ortak "${planLabel(state, common)}" bloğuyla çakışıyor (${spanText(common)})`);
  }
  const sameWeek = ofTrack(state.weekPlans, state).filter((p) => p.month === month && p.week === fields.week);
  const other = clashIn(sameWeek, fields.day, fields, exceptId);
  if (other) {
    throw new HttpError(400, `Bu saat "${planLabel(state, other)}" bloğuyla çakışıyor (${spanText(other)})`);
  }
}

function findOwn(state, rawId) {
  const id = parseId(rawId);
  const row = ofTrack(state.weekPlans, state).find((p) => p.id === id);
  if (!row) throw new HttpError(404, "Bulunamadı");
  return row;
}

export function listWeekPlans({ state, query }) {
  const month = requireMonth(query.get("month") ?? undefined);
  const rows = ofTrack(state.weekPlans, state)
    .filter((p) => p.month === month)
    .sort(byTime)
    .map((p) => ({ ...p }));
  return { status: 200, body: rows };
}

export function createWeekPlan({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  const month = requireMonth(body.month);
  const fields = parseWeekPlan(state, body);
  assertFits(state, month, fields, null);
  const row = { id: nextId(state.weekPlans), track: track(state), month, ...fields };
  state.weekPlans.push(row);
  return { status: 201, body: { ...row } };
}

// Ay sabittir; hafta, gün, saat ve içerik değişebilir.
// Elle düzenlenen önerilen blok artık kullanıcınındır: "önerilen" işareti kalkar, yeniden öneride silinmez.
export function updateWeekPlan({ state, params, body: rawBody }) {
  const row = findOwn(state, params.id);
  const fields = parseWeekPlan(state, requireBody(rawBody));
  assertFits(state, row.month, fields, row.id);
  Object.assign(row, fields);
  delete row.auto;
  return { status: 200, body: { ...row } };
}

// --- Önerilen bloklar (Haftayı planla) ---
// Akıllı öneri bir haftanın çalışma bloklarını tek seferde yazar. Bu bloklar `auto: true` ile işaretlenir;
// aynı hafta için yeniden öneri alınınca yalnızca bunlar silinip yenileri konur, elle eklenen bloklara dokunulmaz.
// Bir blok bile geçersizse ya da çakışıyorsa hiçbir şey değişmez (veritabanı hata olunca işlemi geri alır).
export const AUTO_MAX = 200;

export function replaceAutoWeekPlans({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  const month = requireMonth(body.month);
  const week = requireInt(body.week, "Hafta", { min: 1, max: WEEKS });
  if (!Array.isArray(body.blocks)) throw new HttpError(400, "Bloklar bir liste olmalı");
  if (body.blocks.length > AUTO_MAX) throw new HttpError(400, `Bir haftaya tek seferde en fazla ${AUTO_MAX} blok eklenebilir`);

  const isOld = (p) => p.auto === true && p.track === track(state) && p.month === month && p.week === week;
  const removed = state.weekPlans.filter(isOld).length;
  state.weekPlans = state.weekPlans.filter((p) => !isOld(p));

  const created = body.blocks.map((block) => {
    if (block === null || typeof block !== "object" || Array.isArray(block)) throw new HttpError(400, "Blok geçersiz");
    const fields = parseWeekPlan(state, { ...block, week });
    if (fields.kind !== "study") throw new HttpError(400, "Önerilen blok bir çalışma bloğu olmalı");
    assertFits(state, month, fields, null);
    const row = { id: nextId(state.weekPlans), track: track(state), month, ...fields, auto: true };
    state.weekPlans.push(row);
    return { ...row };
  });
  return { status: 201, body: { removed, created } };
}

export function deleteWeekPlan({ state, params }) {
  const row = findOwn(state, params.id);
  state.weekPlans = state.weekPlans.filter((p) => p !== row);
  return { status: 204, body: null };
}
