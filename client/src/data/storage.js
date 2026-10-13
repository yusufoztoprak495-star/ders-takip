// Depolama: tüm veri tek bir kayıt (anlık görüntü) olarak saklanır. Tek kayıt yazmak atomiktir:
// ya hepsi yazılır ya hiçbiri, yarım veri kalmaz. Veri küçük olduğu için (yıllık birkaç bin satır)
// bu hem basit hem yeterince hızlıdır.
//
// Bir depo iki iş yapar: load() kayıtlı veriyi (yoksa null) okur, save(state) yazar.

// Bellek içi depo: testlerde kullanılır, sayfa kapanınca her şey gider
export function memoryStorage(initial = null) {
  let saved = initial === null ? null : structuredClone(initial);
  return {
    async load() {
      return saved === null ? null : structuredClone(saved);
    },
    async save(state) {
      saved = structuredClone(state);
    },
  };
}

const DB_NAME = "ders-takip";
const STORE = "kv";
const KEY = "veri";
const CHANNEL = "ders-takip-veri";

// Gerçek depo: tarayıcının IndexedDB'si. Aynı uygulama başka sekmede açıksa, orada yapılan
// değişiklik haberleşme kanalıyla duyurulur ve bu sekme bir sonraki işleminde veriyi yeniden okur.
export function indexedDbStorage() {
  let connection = null;
  const channel =
    typeof BroadcastChannel === "function"
      ? new BroadcastChannel(CHANNEL)
      : null;
  let onExternalChange = () => {};
  if (channel) channel.onmessage = () => onExternalChange();

  function open() {
    if (!connection) {
      connection = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      // Açılış başarısız olursa bir sonraki denemede yeniden denenir
      connection.catch(() => {
        connection = null;
      });
    }
    return connection;
  }

  return {
    async load() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db.transaction(STORE).objectStore(STORE).get(KEY);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    },
    async save(state) {
      const db = await open();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(state, KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      channel?.postMessage("degisti");
    },
    // Başka bir sekme veriyi değiştirince çağrılacak işlevi kaydeder
    onExternalChange(callback) {
      onExternalChange = callback;
    },
  };
}
