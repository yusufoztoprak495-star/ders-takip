// Görsel deposu: hata defterindeki soru fotoğrafları. Ana veriden ayrı tutulur çünkü ana veri her
// değişiklikte baştan yazılır; fotoğraflar orada olsaydı her kayıtta megabaytlarca veri yazılırdı.
// Fotoğraflar Blob olarak IndexedDB'de durur, yedek dosyasına data: adresi (base64) olarak girer.
import { HttpError } from "./errors.js";

export const IMAGE_ID_PATTERN = /^[a-z0-9-]{8,40}$/;
// Bir fotoğrafın yedekteki en büyük boyu (karakter): sıkıştırılmış bir fotoğraf ~100-300 KB tutar
export const MAX_IMAGE_CHARS = 1_500_000;
// Yalnızca piksel görseller: SVG içinde betik olabileceği için kabul edilmez
const DATA_URL = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]*={0,2}$/;

// Yedekteki "images" alanını denetler: { kimlik: "data:image/...;base64,..." }. Güvenilmez veri.
export function cleanBackupImages(value) {
  if (value === undefined || value === null) return {};
  const bad = () => new HttpError(400, "Yedek dosyası geçersiz: görsellerden biri bozuk");
  if (typeof value !== "object" || Array.isArray(value)) throw bad();
  const out = Object.create(null);
  for (const key of Object.keys(value)) {
    const data = value[key];
    if (!IMAGE_ID_PATTERN.test(key) || typeof data !== "string" || data.length > MAX_IMAGE_CHARS || !DATA_URL.test(data)) {
      throw bad();
    }
    out[key] = data;
  }
  return { ...out };
}

export async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  // Büyük dizileri tek seferde String.fromCharCode'a vermek yığını taşırır: parça parça
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || "image/jpeg"};base64,${btoa(binary)}`;
}

export function dataUrlToBlob(dataUrl) {
  const [head, base64] = dataUrl.split(",");
  const type = /^data:([^;]+);base64$/.exec(head)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

// Ortak arayüz: put(id, blob), get(id) → Blob|null, remove(id), exportAll() → {id: dataUrl}, replaceAll({id: dataUrl})
export function memoryImageStore() {
  const map = new Map();
  return {
    async put(id, blob) {
      map.set(id, blob);
    },
    async get(id) {
      return map.get(id) ?? null;
    },
    async remove(id) {
      map.delete(id);
    },
    async exportAll() {
      const out = {};
      for (const [id, blob] of map) out[id] = await blobToDataUrl(blob);
      return out;
    },
    async replaceAll(images) {
      map.clear();
      for (const [id, data] of Object.entries(images)) map.set(id, dataUrlToBlob(data));
    },
  };
}

// Tarayıcıdaki gerçek depo: ayrı bir IndexedDB veritabanı (ana veritabanının sürümüne dokunmamak için)
export function indexedDbImageStore() {
  let connection = null;
  const open = () => {
    if (!connection) {
      connection = new Promise((resolve, reject) => {
        const request = indexedDB.open("ders-takip-gorseller", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("img");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      connection.catch(() => {
        connection = null;
      });
    }
    return connection;
  };
  // Tek işlemlik yardımcı: mode okuma/yazma, work(store) bir istek döndürür (ya da hiçbir şey)
  const run = async (mode, work) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("img", mode);
      const request = work(tx.objectStore("img"));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  };
  return {
    put: (id, blob) => run("readwrite", (s) => s.put(blob, id)),
    get: async (id) => (await run("readonly", (s) => s.get(id))) ?? null,
    remove: (id) => run("readwrite", (s) => s.delete(id)),
    async exportAll() {
      const db = await open();
      const entries = await new Promise((resolve, reject) => {
        const out = [];
        const request = db.transaction("img").objectStore("img").openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return resolve(out);
          out.push([cursor.key, cursor.value]);
          cursor.continue();
        };
        request.onerror = () => reject(request.error);
      });
      const result = {};
      for (const [id, blob] of entries) result[id] = await blobToDataUrl(blob);
      return result;
    },
    async replaceAll(images) {
      const blobs = Object.entries(images).map(([id, data]) => [id, dataUrlToBlob(data)]);
      await run("readwrite", (s) => {
        s.clear();
        for (const [id, blob] of blobs) s.put(blob, id);
      });
    },
  };
}

let shared = null;
// Uygulamanın tek görsel deposu (testlerde bellek içi)
export function getImageStore() {
  if (!shared) shared = typeof indexedDB === "undefined" ? memoryImageStore() : indexedDbImageStore();
  return shared;
}
