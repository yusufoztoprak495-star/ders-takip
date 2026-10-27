import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { activeSubjectIds } from "../seed.js";
import { isMonth } from "../../lib/months.js";
import { optionalString, parseId, requireBody, requireDate, requireInt, requireString } from "../validation.js";

// Aylık plan: her ay, her ders için "bu ay bitireceğim" diye seçilen konuların tablosu.
//  monthPlans: { id, track, month ('YYYY-AA'), subjectId, title, note, doneAt (bitiş günü ya da null) }
// Konular Konular sayfasındaki listeden bağımsızdır: konu adı serbest metindir (yazarken öneri çıkar),
// böylece "Türev - 2 kaynak bitir" gibi kendi cümlenle de plan yapılabilir.

const TITLE_MAX = 100;
const NOTE_MAX = 100;
// Bir ders bir ayda bundan fazla konu alamaz (yanlışlıkla yüzlerce satır eklenmesin, yedek de şişmesin)
export const PER_SUBJECT_MAX = 60;
// Kabul edilen yıl aralığı (tarihlerle aynı): bunun dışı yazım hatasıdır
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

function requireMonth(value) {
  if (isMonth(value)) {
    const year = Number(value.slice(0, 4));
    if (year >= MIN_YEAR && year <= MAX_YEAR) return value;
  }
  throw new HttpError(400, "Ay geçerli olmalı (YYYY-AA)");
}

const track = (state) => state.settings.track;
const lower = (text) => text.toLocaleLowerCase("tr");

function findOwn(state, rawId) {
  const id = parseId(rawId);
  const row = state.monthPlans.find((r) => r.id === id && r.track === track(state));
  if (!row) throw new HttpError(404, "Bulunamadı");
  return row;
}

function parseTextFields(body) {
  return {
    title: requireString(body.title, "Konu adı", { maxLength: TITLE_MAX }),
    note: optionalString(body.note, "Not", { maxLength: NOTE_MAX }),
  };
}

// Aynı ayda aynı derse aynı konu ikinci kez eklenemez (düzenlenen satırın kendisi hariç)
function assertNoDuplicate(state, { month, subjectId, title }, exceptId) {
  const clash = state.monthPlans.some(
    (r) => r.id !== exceptId && r.track === track(state) && r.month === month && r.subjectId === subjectId && lower(r.title) === lower(title),
  );
  if (clash) throw new HttpError(400, `"${title}" bu ay için zaten planında var`);
}

export function listMonthPlans({ state, query }) {
  const month = requireMonth(query.get("month") ?? undefined);
  const rows = state.monthPlans
    .filter((r) => r.track === track(state) && r.month === month)
    .sort((a, b) => a.id - b.id)
    .map((r) => ({ ...r }));
  return { status: 200, body: rows };
}

export function createMonthPlan({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  const month = requireMonth(body.month);
  const subjectId = requireInt(body.subjectId, "Ders");
  if (!activeSubjectIds(state).has(subjectId)) throw new HttpError(400, "Ders bulunamadı");
  const fields = parseTextFields(body);
  assertNoDuplicate(state, { month, subjectId, title: fields.title }, null);
  const count = state.monthPlans.filter((r) => r.track === track(state) && r.month === month && r.subjectId === subjectId).length;
  if (count >= PER_SUBJECT_MAX) {
    throw new HttpError(400, `Bir ders için bir ayda en fazla ${PER_SUBJECT_MAX} konu planlanabilir`);
  }
  const row = { id: nextId(state.monthPlans), track: track(state), month, subjectId, ...fields, doneAt: null };
  state.monthPlans.push(row);
  return { status: 201, body: { ...row } };
}

// Yalnızca konu adı ve not değişir; ay ve ders sabittir (başka aya taşımak için silip yeniden eklenir)
export function updateMonthPlan({ state, params, body: rawBody }) {
  const row = findOwn(state, params.id);
  const fields = parseTextFields(requireBody(rawBody));
  assertNoDuplicate(state, { month: row.month, subjectId: row.subjectId, title: fields.title }, row.id);
  Object.assign(row, fields);
  return { status: 200, body: { ...row } };
}

// "Bitti" işareti hangi gün konulduğunu tutar (bugünü sayfa gönderir: gün sınırı yereldir)
export function setMonthPlanDone({ state, params, body: rawBody }) {
  const row = findOwn(state, params.id);
  const body = requireBody(rawBody);
  const today = requireDate(body.today, "Bugünün tarihi");
  if (typeof body.done !== "boolean") throw new HttpError(400, "Bitti bilgisi doğru/yanlış olmalı");
  row.doneAt = body.done ? today : null;
  return { status: 200, body: { id: row.id, doneAt: row.doneAt } };
}

export function deleteMonthPlan({ state, params }) {
  const row = findOwn(state, params.id);
  state.monthPlans = state.monthPlans.filter((r) => r !== row);
  return { status: 204, body: null };
}
