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

// Yalnızca gerçek tam sayıları kabul eder: "5", 1.5, NaN reddedilir
export function requireInt(value, field, { min, max } = {}) {
  if (!Number.isInteger(value)) {
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
