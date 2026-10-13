import { backupFileName, hasBackupForDay, namesToDelete } from "../lib/backup.js";

// Klasöre otomatik yedek (File System Access API). Klasör (`dir`) şu yüzeyle kullanılır:
// keys() (adları veren async iterator), getFileHandle(ad, { create }), removeEntry(ad).
// Böylece testlerde gerçek klasör yerine sahte bir nesne verilebilir.

async function listNames(dir) {
  const names = [];
  for await (const name of dir.keys()) names.push(name);
  return names;
}

// Bugünün yedeği yoksa yazar, ardından en yeni 14'ü dışındaki eski yedekleri siler.
// Yazma başarısız olursa hata fırlar ve HİÇBİR şey silinmez (eski yedekler son güvencedir).
// Silme sırasındaki hatalar yutulur: yazma bittikten sonra yedek zaten alınmıştır.
// Dosya, `close()` çağrılana kadar asıl yerine yazılmaz; yarım dosya kalmaz.
export async function runDailyBackup(dir, getSnapshot, now = new Date()) {
  const names = await listNames(dir);
  if (hasBackupForDay(names, now)) return { status: "skipped", deleted: [] };

  const name = backupFileName(now);
  const data = await getSnapshot();
  const file = await dir.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();

  // Bugünün yedeği artık güvende: eski yedeği silememek (örn. başka sekme zaten sildi) hata sayılmaz
  const deleted = [];
  for (const old of namesToDelete([...names, name])) {
    try {
      await dir.removeEntry(old);
      deleted.push(old);
    } catch {
      // bir sonraki günlük yedekte yeniden denenir
    }
  }
  return { status: "written", deleted };
}

// Klasör iznini sorar ("granted" | "prompt" | "denied"). `request` true ise (kullanıcı tıklaması
// sırasında) izin istenir; tarayıcı yeni oturumda izni kendiliğinden vermeyebilir.
export async function getFolderPermission(handle, request = false) {
  const options = { mode: "readwrite" };
  const current = await handle.queryPermission(options);
  if (current === "granted" || !request) return current;
  return handle.requestPermission(options);
}

// Açılışta çağrılır: klasör seçili ve izinliyse günlük yedeği yapar. Hiçbir zaman fırlatmaz.
// "written" ve "skipped" bugünün yedeğinin hazır olduğu anlamına gelir; markBackedUp çağrılır.
export async function backupIfDue({
  loadHandle,
  getSnapshot,
  now = new Date(),
  markBackedUp,
  requestPermission = false,
}) {
  try {
    const handle = await loadHandle();
    if (!handle) return { status: "no-folder" };
    const permission = await getFolderPermission(handle, requestPermission);
    if (permission !== "granted") return { status: "needs-permission" };
    const result = await runDailyBackup(handle, getSnapshot, now);
    markBackedUp();
    return { status: result.status };
  } catch (error) {
    return {
      status: "error",
      message: `Yedek klasörüne yazılamadı: ${error?.message ?? "bilinmeyen hata"}`,
    };
  }
}

// --- Klasör tutamacının saklanması ---
// Tutamaç, ana veriyi tutan veri tabanına dokunmamak için ayrı bir IndexedDB'de durur.
const SETTINGS_DB = "ders-takip-ayar";
const SETTINGS_STORE = "ayar";
const FOLDER_KEY = "yedekKlasoru";

function openSettingsDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SETTINGS_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(SETTINGS_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const db = await openSettingsDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = action(db.transaction(SETTINGS_STORE, mode).objectStore(SETTINGS_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export function saveFolderHandle(handle) {
  return withStore("readwrite", (store) => store.put(handle, FOLDER_KEY));
}

// Kayıtlı klasör yoksa ya da depo okunamazsa null
export async function loadFolderHandle() {
  try {
    return (await withStore("readonly", (store) => store.get(FOLDER_KEY))) ?? null;
  } catch {
    return null;
  }
}

export function clearFolderHandle() {
  return withStore("readwrite", (store) => store.delete(FOLDER_KEY));
}
