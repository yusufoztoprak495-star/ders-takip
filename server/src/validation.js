import { HttpError } from "./errors.js";

// Tüm doğrulayıcılar geçersiz girdide HttpError(400, ...) fırlatır.
// `field` kullanıcıya gösterilen alan adıdır (örn. 'Ders').

// İstek gövdesi bir nesne değilse (gövde yok, dizi, metin) 400 verir
export function requireBody(req) {
  const body = req.body;
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "İstek gövdesi eksik veya geçersiz");
  }
  return body;
}

// Kabul edilen tarihlerin yıl aralığı: bunun dışı yazım hatasıdır (örn. 1900, 20260)
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

// Yalnızca gerçek tam sayıları kabul eder: "5", 1.5, NaN reddedilir.
// isSafeInteger: 1e300 gibi "tam sayı" sayılan ama toplamları bozan dev değerler de reddedilir.
export function requireInt(value, field, { min, max } = {}) {
  if (!Number.isSafeInteger(value)) {
    throw new HttpError(400, `${field} tam sayı olmalı`);
  }
  if (min !== undefined && value < min) {
    throw new HttpError(400, `${field} en az ${min} olmalı`);
  }
  if (max !== undefined && value > max) {
    throw new HttpError(400, `${field} en fazla ${max} olabilir`);
  }
  return value;
}

// Boş (null/undefined) bırakılabilen tam sayı alanı
export function optionalInt(value, field, opts) {
  if (value === null || value === undefined) return null;
  return requireInt(value, field, opts);
}

// Kırpılmış, boş olmayan metin
export function requireString(value, field, { maxLength } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `${field} boş olamaz`);
  }
  const trimmed = value.trim();
  if (maxLength !== undefined && trimmed.length > maxLength) {
    throw new HttpError(
      400,
      `${field} en fazla ${maxLength} karakter olabilir`,
    );
  }
  return trimmed;
}

// URL'deki :id parametresini sayıya çevirir; sayı değilse kayıt yok demektir (404)
export function parseId(param) {
  const id = Number(param);
  if (!Number.isInteger(id)) {
    throw new HttpError(404, "Bulunamadı");
  }
  return id;
}

// 'YYYY-MM-DD' biçiminde, takvimde gerçekten var olan bir gün (örn. 30 Şubat reddedilir)
export function requireDate(value, field) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    // Date taşan günleri sonraki aya kaydırır; geri çevirince aynı çıkmıyorsa tarih geçersizdir
    const sameDay =
      date.getUTCFullYear() === y &&
      date.getUTCMonth() === m - 1 &&
      date.getUTCDate() === d;
    if (sameDay && y >= MIN_YEAR && y <= MAX_YEAR) {
      return value;
    }
  }
  throw new HttpError(400, `${field} geçerli bir tarih olmalı (YYYY-AA-GG)`);
}

// Saat bilgisi içeren ISO zamanı; her zaman UTC ISO biçimine çevrilerek saklanır
export function requireIsoDateTime(value, field) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const time = new Date(value);
    const year = time.getUTCFullYear();
    if (!Number.isNaN(time.getTime()) && year >= MIN_YEAR && year <= MAX_YEAR) {
      return time.toISOString();
    }
  }
  throw new HttpError(400, `${field} geçerli bir zaman olmalı`);
}

// Değer izin verilen listede değilse reddeder
export function requireOneOf(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw new HttpError(
      400,
      `${field} şunlardan biri olmalı: ${allowed.join(", ")}`,
    );
  }
  return value;
}

export function assertSubjectExists(db, subjectId) {
  if (!db.prepare("SELECT 1 FROM subjects WHERE id = ?").get(subjectId)) {
    throw new HttpError(400, "Ders bulunamadı");
  }
}

// Konu seçilmişse var olmalı ve seçilen derse ait olmalı (null = konu seçilmedi)
export function assertTopicMatchesSubject(db, topicId, subjectId) {
  if (topicId === null) return;
  const topic = db
    .prepare("SELECT subject_id FROM topics WHERE id = ?")
    .get(topicId);
  if (!topic) throw new HttpError(400, "Konu bulunamadı");
  if (topic.subject_id !== subjectId) {
    throw new HttpError(400, "Konu seçilen derse ait değil");
  }
}
