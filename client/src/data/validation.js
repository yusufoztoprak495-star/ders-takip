import { HttpError } from "./errors.js";

// Tüm doğrulayıcılar geçersiz girdide HttpError(400, ...) fırlatır.
// `field` kullanıcıya gösterilen alan adıdır (örn. 'Ders').

// İstek gövdesi bir nesne değilse (gövde yok, dizi, metin) 400 verir
export function requireBody(body) {
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

// İsteğe bağlı kısa metin: verilmezse boş metin, verilirse kırpılır ve uzunluğu denetlenir
export function optionalString(value, field, { maxLength } = {}) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new HttpError(400, `${field} metin olmalı`);
  const trimmed = value.trim();
  if (maxLength !== undefined && trimmed.length > maxLength) {
    throw new HttpError(400, `${field} en fazla ${maxLength} karakter olabilir`);
  }
  return trimmed;
}

export function assertSubjectExists(state, subjectId) {
  if (!state.subjects.some((s) => s.id === subjectId)) {
    throw new HttpError(400, "Ders bulunamadı");
  }
}

// Soru kaydı ve test kitabı yalnızca sınav (YKS, DGS) derslerine eklenebilir
export function assertSubjectTracksQuestions(state, subjectId) {
  const subject = state.subjects.find((s) => s.id === subjectId);
  if (subject && subject.track === "uni") {
    throw new HttpError(400, "Üniversite derslerinde soru ve kitap takibi yok; yalnızca çalışma süresi tutulur");
  }
}

// Konu seçilmişse var olmalı ve seçilen derse ait olmalı (null = konu seçilmedi)
export function assertTopicMatchesSubject(state, topicId, subjectId) {
  if (topicId === null) return;
  const topic = state.topics.find((t) => t.id === topicId);
  if (!topic) throw new HttpError(400, "Konu bulunamadı");
  if (topic.subjectId !== subjectId) {
    throw new HttpError(400, "Konu seçilen derse ait değil");
  }
}

// Yedek dosyasındaki tablolar: hepsi dizi olmalı, başka alanlar atılır
const BACKUP_TABLES = ["subjects", "topics", "sessions", "questions", "resources"];

// Yedek verisini doğrular ve yalnızca bilinen tabloları içeren temiz bir kopya verir.
// En az bir tablo bulunmalı; bulunan her tablo dizi olmalı (eksik tablolar sonradan boş dizi olur).
export function validateBackup(data) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpError(400, "Yedek dosyası geçersiz: veri bir nesne olmalı");
  }
  const clean = {};
  for (const table of BACKUP_TABLES) {
    if (!(table in data)) continue;
    if (!Array.isArray(data[table])) {
      throw new HttpError(400, `Yedek dosyası geçersiz: "${table}" bir liste olmalı`);
    }
    // Her kayıt bir nesne ve tamsayı id'li olmalı: aksi hâlde sayfalar yüklemeden sonra çöker
    const bad = data[table].findIndex(
      (row) => row === null || typeof row !== "object" || Array.isArray(row) || !Number.isSafeInteger(row.id),
    );
    if (bad !== -1) {
      throw new HttpError(400, `Yedek dosyası geçersiz: "${table}" listesinin ${bad + 1}. kaydı bozuk`);
    }
    clean[table] = data[table];
  }
  if (Object.keys(clean).length === 0) {
    throw new HttpError(400, "Yedek dosyası geçersiz: tanıdığımız hiçbir veri yok");
  }
  // Ayarlar (çalışma hedefi) isteğe bağlıdır; varsa nesne olmalı. İçeriği yüklenirken temizlenir.
  if ("settings" in data) {
    const s = data.settings;
    if (s === null || typeof s !== "object" || Array.isArray(s)) {
      throw new HttpError(400, "Yedek dosyası geçersiz: ayarlar bir nesne olmalı");
    }
    clean.settings = s;
  }
  return clean;
}

// Yedek dosyasının metnini okur ve doğrular (JSON değilse de aynı türde hata verir)
export function parseBackupText(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Yedek dosyası geçersiz: JSON olarak okunamadı");
  }
  return validateBackup(data);
}
