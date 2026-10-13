import { createDatabase, StorageError } from "./data/database.js";
import { HttpError } from "./data/errors.js";
import { indexedDbStorage } from "./data/storage.js";

// Doğrulama ya da bulunamadı gibi, kullanıcıya gösterilecek Türkçe mesaj taşıyan hata (örn. "Ders zorunlu")
export class ApiError extends Error {}

// Uygulamanın tek veritabanı: tarayıcının IndexedDB'sini kullanır. İlk istekte açılır.
let database = null;
export function getDatabase() {
  if (!database) database = createDatabase(indexedDbStorage());
  return database;
}

// Testlerde gerçek tarayıcı deposu yerine bellek içi veritabanı vermek için
export function setDatabase(db) {
  database = db;
}

// Eskiden sunucuya giden istek, artık aynı yol ve aynı gövdeyle yerel veritabanına gider; böylece
// sayfalar değişmeden çalışır. `path` /api ile başlayan yoldur (örn. '/api/subjects').
// Geçersiz isteklerde kullanıcıya gösterilebilecek Türkçe mesajla ApiError fırlatır.
export async function apiFetch(path, { method = "GET", body } = {}) {
  let result;
  try {
    // Gövde, eskiden olduğu gibi JSON'a çevrilip geri açılır: sayfalar ve veri aynı nesneyi paylaşmaz
    const payload =
      body === undefined ? undefined : JSON.parse(JSON.stringify(body));
    result = await getDatabase().request(method, path, payload);
  } catch (error) {
    if (error instanceof HttpError) throw new ApiError(error.message);
    // Depolama kapalıysa (gizli pencere, dolu disk): kayıt tekrar denenebilir, düz hata verilir
    if (error instanceof StorageError) throw new Error(error.message);
    throw new ApiError("Bir şeyler ters gitti");
  }
  return result.status === 204 ? null : result.body;
}
