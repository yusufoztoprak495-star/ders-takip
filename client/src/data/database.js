import { HttpError } from "./errors.js";
import { resolveRoute } from "./router.js";
import { emptyState, prepareState } from "./seed.js";
import { validateBackup } from "./validation.js";

// Depolama (yazma/okuma) başarısız olduysa: sunucuya ulaşılamıyor demenin tarayıcıdaki karşılığı
export class StorageError extends Error {}

// Kayıtlı veriyi güncel şekle getirir: eksik tablolar boş dizi olur.
// Ayar burada eklenmez: ayarı olmayan eski veri prepareState içinde ayrıca tanınır.
function normalize(saved) {
  const { settings, ...tables } = emptyState();
  const data = { ...tables, ...(saved ?? {}) };
  if (!data.settings) delete data.settings;
  return data;
}

// Tarayıcıdaki "veritabanı". Eskiden sunucuya giden /api isteklerini burada, yerelde cevaplar.
// İstekler sırayla işlenir (aynı anda iki yazma birbirinin üstüne binmesin).
export function createDatabase(storage) {
  let state = null;
  let queue = Promise.resolve();

  // Başka sekme veriyi değiştirdiyse bellekteki kopya eskidir: bir sonraki istekte yeniden okunur
  storage.onExternalChange?.(() => {
    state = null;
  });

  async function ensureLoaded() {
    if (state) return;
    let saved;
    try {
      saved = await storage.load();
    } catch {
      throw new StorageError(
        "Veriler okunamadı (tarayıcı depolaması kullanılamıyor)",
      );
    }
    const loaded = normalize(saved);
    // İlk açılışta (ve eski veride) ayar eklenir, seçili hedefin ders listesi yüklenir ve hemen kaydedilir
    if (prepareState(loaded)) await persist(loaded);
    state = loaded;
  }

  async function persist(data) {
    try {
      await storage.save(data);
    } catch {
      throw new StorageError(
        "Veriler kaydedilemedi (tarayıcı depolaması kullanılamıyor)",
      );
    }
  }

  async function handle(method, path, body) {
    await ensureLoaded();
    const { route, params, query } = resolveRoute(method, path);
    if (!route.mutates) {
      return route.handler({ state, params, query, body });
    }
    // Hata olursa (doğrulama ya da kaydetme) bellekteki veri işlem öncesine döner
    const before = structuredClone(state);
    try {
      const result = route.handler({ state, params, query, body });
      await persist(state);
      return result;
    } catch (error) {
      state = before;
      throw error;
    }
  }

  return {
    // { status, body } döner; geçersiz istekte HttpError, depolama sorununda StorageError fırlatır
    request(method, path, body) {
      const task = () => handle(method, path, body);
      const result = queue.then(task, task);
      queue = result.catch(() => {});
      return result;
    },
    // Tüm verinin kopyası (yedek almak için)
    async snapshot() {
      return queue.then(async () => {
        await ensureLoaded();
        return structuredClone(state);
      });
    },
    // Tüm veriyi verilen veriyle değiştirir (yedek yüklemek için). Geçersiz veri HttpError(400) ile reddedilir.
    replaceAll(data) {
      const task = async () => {
        const next = normalize(validateBackup(data));
        prepareState(next, { seed: false });
        await persist(next);
        state = next;
      };
      const result = queue.then(task, task);
      queue = result.catch(() => {});
      return result;
    },
  };
}

