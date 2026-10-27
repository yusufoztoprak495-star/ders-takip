import { HttpError } from "../errors.js";
import { nextId } from "../ids.js";
import { activeSubjectIds } from "../seed.js";
import { WEEKS, isMonth, monthLabel, shiftMonth as shiftMonthBy } from "../../lib/months.js";
import { optionalString, parseId, requireBody, requireDate, requireInt, requireOneOf, requireString } from "../validation.js";

// Aylık plan: her ay, her ders için "bu ay bitireceğim" diye seçilen konuların tablosu.
//  monthPlans: { id, track, month ('YYYY-AA'), subjectId, title, note, doneAt (bitiş günü ya da null), week (1–4 ya da null) }
// week: konunun ayın hangi haftasına dağıtıldığı (dağıtılmadıysa null). Eski kayıtlarda alan yoktur, null sayılır.
// Konular Konular sayfasındaki listeden bağımsızdır: konu adı serbest metindir (yazarken öneri çıkar),
// böylece "Türev - 2 kaynak bitir" gibi kendi cümlenle de plan yapılabilir.

const TITLE_MAX = 100;
const NOTE_MAX = 100;
// Bir ders bir ayda bundan fazla konu alamaz (yanlışlıkla yüzlerce satır eklenmesin, yedek de şişmesin)
export const PER_SUBJECT_MAX = 60;
// Tek seferde en çok kaç konu taşınır / haftaya yazılır
const BATCH_MAX = 500;
// Kabul edilen yıl aralığı (tarihlerle aynı): bunun dışı yazım hatasıdır
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export function requireMonth(value) {
  if (isMonth(value)) {
    const year = Number(value.slice(0, 4));
    if (year >= MIN_YEAR && year <= MAX_YEAR) return value;
  }
  throw new HttpError(400, "Ay geçerli olmalı (YYYY-AA)");
}

const track = (state) => state.settings.track;
const lower = (text) => text.toLocaleLowerCase("tr");
// Eski kayıtlarda week alanı yoktur: dışarıya hep sayı ya da null gider
const out = (row) => ({ ...row, week: row.week ?? null });
const mine = (state) => state.monthPlans.filter((r) => r.track === track(state));

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
  const clash = mine(state).some(
    (r) => r.id !== exceptId && r.month === month && r.subjectId === subjectId && lower(r.title) === lower(title),
  );
  if (clash) throw new HttpError(400, `"${title}" bu ay için zaten planında var`);
}

function assertRoom(count) {
  if (count >= PER_SUBJECT_MAX) {
    throw new HttpError(400, `Bir ders için bir ayda en fazla ${PER_SUBJECT_MAX} konu planlanabilir`);
  }
}

export function listMonthPlans({ state, query }) {
  const month = requireMonth(query.get("month") ?? undefined);
  const rows = mine(state)
    .filter((r) => r.month === month)
    .sort((a, b) => a.id - b.id)
    .map(out);
  return { status: 200, body: rows };
}

export function createMonthPlan({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  const month = requireMonth(body.month);
  const subjectId = requireInt(body.subjectId, "Ders");
  if (!activeSubjectIds(state).has(subjectId)) throw new HttpError(400, "Ders bulunamadı");
  const fields = parseTextFields(body);
  assertNoDuplicate(state, { month, subjectId, title: fields.title }, null);
  assertRoom(mine(state).filter((r) => r.month === month && r.subjectId === subjectId).length);
  const row = { id: nextId(state.monthPlans), track: track(state), month, subjectId, ...fields, doneAt: null, week: null };
  state.monthPlans.push(row);
  return { status: 201, body: out(row) };
}

// Yalnızca konu adı ve not değişir; ay ve ders sabittir (başka aya taşımak için /carry kullanılır)
export function updateMonthPlan({ state, params, body: rawBody }) {
  const row = findOwn(state, params.id);
  const fields = parseTextFields(requireBody(rawBody));
  assertNoDuplicate(state, { month: row.month, subjectId: row.subjectId, title: fields.title }, row.id);
  Object.assign(row, fields);
  return { status: 200, body: out(row) };
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

// Toplu iş gövdesinden konu kimlikleri: boş, dev ya da yinelenen liste reddedilir
function requireIdList(list, what) {
  if (!Array.isArray(list) || list.length === 0) throw new HttpError(400, "En az bir konu seçmelisin");
  if (list.length > BATCH_MAX) throw new HttpError(400, `Tek seferde en fazla ${BATCH_MAX} konu ${what}`);
  return list;
}

// Konuların haftasını toplu yazar: { month, weeks: [{ id, week (1–4 ya da null) }] }.
// Dağıtma sonucu buradan kaydedilir. Hepsi ya da hiçbiri: bir satır hatalıysa hiçbiri değişmez.
export function setMonthPlanWeeks({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  const month = requireMonth(body.month);
  const list = requireIdList(body.weeks, "güncellenebilir");
  const seen = new Set();
  const changes = list.map((item) => {
    const data = requireBody(item);
    const id = requireInt(data.id, "Konu kimliği");
    if (seen.has(id)) throw new HttpError(400, "Aynı konu iki kez yazılmış");
    seen.add(id);
    const row = mine(state).find((r) => r.id === id && r.month === month);
    if (!row) throw new HttpError(400, "Konu bulunamadı");
    const week = data.week === null ? null : requireInt(data.week, "Hafta", { min: 1, max: WEEKS });
    return { row, week };
  });
  for (const { row, week } of changes) row.week = week;
  const rows = mine(state)
    .filter((r) => r.month === month)
    .sort((a, b) => a.id - b.id)
    .map(out);
  return { status: 200, body: rows };
}

// Konuları başka aya taşır ya da kopyalar: { month (hedef), ids, mode: 'move' | 'copy' }.
//  move: konu hedef aya geçer (haftası sıfırlanır), eski ayda kalmaz. Önceki aydan bitmeyenler ve
//        sonraki ayı öne çekme böyle yapılır.
//  copy: hedef ayda yeni, bitmemiş bir satır açılır; eskisi yerinde kalır. Önceki ayı tekrar böyle yapılır;
//        nota kaynak ay yazılır ("Tekrar · Eylül 2026").
// Hedef ayda aynı ders ve konu varsa ya da ders 60 konuyu aşarsa hiçbiri uygulanmaz.
export function carryMonthPlans({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  const month = requireMonth(body.month);
  const mode = requireOneOf(body.mode, "Tür", ["move", "copy"]);
  const list = requireIdList(body.ids, "taşınabilir");
  const seen = new Set();
  const rows = list.map((rawId) => {
    const id = requireInt(rawId, "Konu kimliği");
    if (seen.has(id)) throw new HttpError(400, "Aynı konu iki kez seçilmiş");
    seen.add(id);
    const row = mine(state).find((r) => r.id === id);
    if (!row) throw new HttpError(400, "Konu bulunamadı");
    if (row.month === month) throw new HttpError(400, `"${row.title}" zaten bu ayda`);
    return row;
  });

  // Önce hepsi denetlenir; sonra uygulanır
  const keyOf = (subjectId, title) => `${subjectId}|${lower(title)}`;
  const taken = new Set(mine(state).filter((r) => r.month === month).map((r) => keyOf(r.subjectId, r.title)));
  const perSubject = new Map();
  for (const r of mine(state).filter((x) => x.month === month)) {
    perSubject.set(r.subjectId, (perSubject.get(r.subjectId) ?? 0) + 1);
  }
  for (const row of rows) {
    const key = keyOf(row.subjectId, row.title);
    if (taken.has(key)) throw new HttpError(400, `"${row.title}" bu ay için zaten planında var`);
    taken.add(key);
    assertRoom(perSubject.get(row.subjectId) ?? 0);
    perSubject.set(row.subjectId, (perSubject.get(row.subjectId) ?? 0) + 1);
  }

  const result = rows.map((row) => {
    if (mode === "move") {
      row.month = month;
      row.week = null;
      return out(row);
    }
    const copy = {
      id: nextId(state.monthPlans),
      track: track(state),
      month,
      subjectId: row.subjectId,
      title: row.title,
      note: `Tekrar · ${monthLabel(row.month)}`,
      doneAt: null,
      week: null,
    };
    state.monthPlans.push(copy);
    return out(copy);
  });
  return { status: 200, body: { count: result.length, rows: result } };
}

// Planı aya göre kaydırır: `from` ayından (dahil) sonraki bütün aylık plan konuları ve haftaya özel bloklar
// `by` ay ileri (+) ya da geri (−) gider. Haftalar, notlar ve bitiş günleri korunur.
// Sonuçta aynı ayda aynı konu iki kez ya da bir ders ayda 60'tan fazla konu olacaksa hiçbiri uygulanmaz.
export function shiftMonthPlans({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  const from = requireMonth(body.from);
  const by = requireInt(body.by, "Kaydırma");
  if (by === 0 || Math.abs(by) > 12) throw new HttpError(400, "Kaydırma 1 ile 12 ay arasında olmalı (geriye için eksi)");

  const target = (month) => requireMonth(shiftMonthBy(month, by));
  target(from); // yıl sınırının dışına çıkıyorsa daha baştan reddedilir
  const moved = mine(state).filter((r) => r.month >= from);
  const targets = moved.map((r) => target(r.month));
  const weekRows = state.weekPlans.filter((r) => r.track === track(state) && r.month >= from);
  const weekTargets = weekRows.map((r) => target(r.month));

  // Kaydırılmış hâlin tamamı denetlenir
  const seen = new Set();
  const perMonthSubject = new Map();
  const finalRows = [
    ...mine(state).filter((r) => r.month < from).map((r) => ({ row: r, month: r.month })),
    ...moved.map((r, i) => ({ row: r, month: targets[i] })),
  ];
  for (const { row, month } of finalRows) {
    const key = `${month}|${row.subjectId}|${lower(row.title)}`;
    if (seen.has(key)) throw new HttpError(400, `"${row.title}" ${monthLabel(month)} ayında zaten planında var`);
    seen.add(key);
    const group = `${month}|${row.subjectId}`;
    perMonthSubject.set(group, (perMonthSubject.get(group) ?? 0) + 1);
    assertRoom(perMonthSubject.get(group) - 1);
  }

  moved.forEach((r, i) => {
    r.month = targets[i];
  });
  weekRows.forEach((r, i) => {
    r.month = weekTargets[i];
  });
  return { status: 200, body: { count: moved.length, weekCount: weekRows.length } };
}
