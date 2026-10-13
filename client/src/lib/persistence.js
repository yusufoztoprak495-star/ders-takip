// Kalıcı depolama izni: verilirse tarayıcı, disk dolsa bile site verilerini kendiliğinden silmez.
// Tarayıcı izni sorabilir, sessizce verebilir ya da reddedebilir; biz yalnızca sonucu öğreniriz.

// "granted" (kalıcı), "denied" (verilmedi) ya da "unsupported" (tarayıcıda yok) döner.
// `storage` testlerde sahte nesne vermek içindir.
export async function requestPersistence(
  storage = globalThis.navigator?.storage,
) {
  if (!storage || typeof storage.persist !== "function") return "unsupported";
  try {
    if (
      typeof storage.persisted === "function" &&
      (await storage.persisted())
    ) {
      return "granted";
    }
    return (await storage.persist()) ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

const LABELS = {
  checking: "Denetleniyor…",
  granted: "Kalıcı: Evet",
  denied: "Kalıcı: Hayır (tarayıcı izin vermedi)",
  unsupported: "Bu tarayıcı desteklemiyor",
};

// Ayarlar sayfasında gösterilen durum yazısı
export function persistenceLabel(status) {
  return LABELS[status] ?? LABELS.checking;
}
