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

// --- Yedek dosyasının denetimi ---
// Yedek dosyası dışarıdan gelir (başkası gönderebilir, elle düzenlenebilir), bu yüzden güvenilmez sayılır:
// - Yalnızca bilinen tablolar ve bilinen alanlar alınır; diğer her şey (__proto__, constructor gibi
//   prototipi kirletmeye çalışan anahtarlar dahil) atılır. Kayıtlar sıfırdan, düz nesne olarak kurulur.
// - Bir alan VARSA türü doğru olmalı (eski sürüm yedeklerinde eksik alan olabilir, o yüzden zorunlu değil).
// - Metinler uzunluk sınırını aşamaz; dosyanın kendisi de MAX_BACKUP_BYTES'tan büyük olamaz.

// 80 MB: yıllarca kayıt birkaç MB tutar; payın çoğu hata defterindeki fotoğraflar için (~200 KB/fotoğraf)
export const MAX_BACKUP_BYTES = 80 * 1024 * 1024;
const MAX_TEXT = 2000;

const isInt = (v) => Number.isSafeInteger(v);
const isText = (v) => typeof v === "string" && v.length <= MAX_TEXT;
const intOrNull = (v) => v === null || isInt(v);
const textOrNull = (v) => v === null || isText(v);
// Hata defteri fotoğraf kimliği: yalnızca küçük harf, rakam ve tire (görsel deposundaki anahtar)
const imageIdOrNull = (v) => v === null || (typeof v === "string" && /^[a-z0-9-]{8,40}$/.test(v));
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Deneme sonuçları: { bölümId: { correct, wrong, blank } } — iç içe olduğu için ayrıca temizlenir
function cleanResults(value) {
  if (!isPlainObject(value)) return undefined;
  const out = {};
  for (const [key, r] of Object.entries(value)) {
    if (!/^[a-z]{1,20}$/.test(key) || !isPlainObject(r)) return undefined;
    if (![r.correct, r.wrong, r.blank].every((n) => n === undefined || isInt(n))) return undefined;
    out[key] = { correct: r.correct ?? 0, wrong: r.wrong ?? 0, blank: r.blank ?? 0 };
  }
  return out;
}

// Denemede yanlış yapılan konular: [{ topicId, count }] — yalnızca bu iki alan, tam sayı olarak alınır
function cleanWrongTopics(value) {
  if (!Array.isArray(value) || value.length > 200) return undefined;
  const out = [];
  for (const w of value) {
    if (!isPlainObject(w) || !isInt(w.topicId) || !isInt(w.count)) return undefined;
    out.push({ topicId: w.topicId, count: w.count });
  }
  return out;
}

// Tablo başına alanlar ve denetleyicileri. Denetleyici true/false ya da (temizleyen) bir değer döndürür.
const ROW_SCHEMAS = {
  subjects: { name: isText, examType: isText, track: isText },
  topics: { subjectId: isInt, name: isText, doneAt: isText, reviewStep: isInt, nextReview: textOrNull, note: isText },
  sessions: { subjectId: isInt, topicId: intOrNull, startedAt: isText, durationSeconds: isInt, entryType: isText },
  questions: {
    subjectId: isInt,
    topicId: intOrNull,
    resourceId: intOrNull,
    date: isText,
    correct: isInt,
    wrong: isInt,
    blank: isInt,
  },
  resources: {
    name: isText,
    publisher: isText,
    subjectId: isInt,
    status: isText,
    solvedTests: isInt,
    lastSolvedAt: textOrNull,
  },
  classes: { track: isText, day: isInt, start: isInt, end: isInt, title: isText, place: isText, subjectId: intOrNull },
  plans: { track: isText, day: isInt, start: isInt, end: isInt, kind: isText, title: isText, subjectId: intOrNull },
  planChecks: { planId: isInt, date: isText },
  mistakes: {
    track: isText,
    subjectId: isInt,
    topicId: intOrNull,
    source: isText,
    note: isText,
    answer: isText,
    imageId: imageIdOrNull,
    createdAt: isText,
    reviewStep: isInt,
    nextReview: textOrNull,
    learnedAt: textOrNull,
    wrongCount: isInt,
  },
  exams: {
    track: isText,
    date: isText,
    name: isText,
    type: isText,
    results: "results",
    subjectId: isInt,
    questionCount: isInt,
    wrongTopics: "wrongTopics",
  },
};

const BACKUP_TABLES = Object.keys(ROW_SCHEMAS);

class BadField extends Error {}

function cleanRow(row, schema) {
  const clean = { id: row.id };
  for (const [field, check] of Object.entries(schema)) {
    if (!Object.prototype.hasOwnProperty.call(row, field) || row[field] === undefined) continue;
    const value = row[field];
    if (check === "results") {
      const results = cleanResults(value);
      if (!results) throw new BadField(field);
      clean[field] = results;
      continue;
    }
    if (check === "wrongTopics") {
      const list = cleanWrongTopics(value);
      if (!list) throw new BadField(field);
      clean[field] = list;
      continue;
    }
    if (!check(value)) throw new BadField(typeof value === "string" ? `${field}:uzun` : field);
    clean[field] = value;
  }
  return clean;
}

// Yedek verisini doğrular ve yalnızca bilinen tabloları ve alanları içeren temiz bir kopya verir.
// En az bir tablo bulunmalı; bulunan her tablo dizi olmalı (eksik tablolar sonradan boş dizi olur).
export function validateBackup(data) {
  if (!isPlainObject(data)) {
    throw new HttpError(400, "Yedek dosyası geçersiz: veri bir nesne olmalı");
  }
  const clean = {};
  for (const table of BACKUP_TABLES) {
    if (!Object.prototype.hasOwnProperty.call(data, table)) continue;
    if (!Array.isArray(data[table])) {
      throw new HttpError(400, `Yedek dosyası geçersiz: "${table}" bir liste olmalı`);
    }
    clean[table] = data[table].map((row, i) => {
      // Her kayıt bir nesne ve tamsayı id'li olmalı: aksi hâlde sayfalar yüklemeden sonra çöker
      if (!isPlainObject(row) || !isInt(row.id)) {
        throw new HttpError(400, `Yedek dosyası geçersiz: "${table}" listesinin ${i + 1}. kaydı bozuk`);
      }
      try {
        return cleanRow(row, ROW_SCHEMAS[table]);
      } catch (e) {
        if (!(e instanceof BadField)) throw e;
        const [field] = e.message.split(":");
        const reason = `"${field}" alanı geçersiz: türü yanlış ya da çok uzun`;
        throw new HttpError(400, `Yedek dosyası geçersiz: "${table}" listesinin ${i + 1}. kaydı bozuk (${reason})`);
      }
    });
  }
  if (Object.keys(clean).length === 0) {
    throw new HttpError(400, "Yedek dosyası geçersiz: tanıdığımız hiçbir veri yok");
  }
  // Ayarlar (çalışma hedefi) isteğe bağlıdır; varsa nesne olmalı. İçeriği yüklenirken cleanSettings temizler.
  if (Object.prototype.hasOwnProperty.call(data, "settings")) {
    if (!isPlainObject(data.settings)) {
      throw new HttpError(400, "Yedek dosyası geçersiz: ayarlar bir nesne olmalı");
    }
    clean.settings = data.settings;
  }
  return clean;
}

// Yedek dosyasının metnini okur ve doğrular (JSON değilse de aynı türde hata verir)
export function parseBackupText(text) {
  if (typeof text !== "string" || text.length > MAX_BACKUP_BYTES) {
    throw new HttpError(400, "Yedek dosyası çok büyük (en fazla 80 MB)");
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Yedek dosyası geçersiz: JSON olarak okunamadı");
  }
  return validateBackup(data);
}
