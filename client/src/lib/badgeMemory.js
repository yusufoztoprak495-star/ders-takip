// Hangi rozetlerin kullanıcıya gösterildiği (yeni rozet kutlaması bir kez çıksın). Bu cihazda tutulur.
const KEY = "rozetler-gorulen";

export function readSeenBadges() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list.filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}

export function rememberBadges(ids) {
  try {
    const seen = new Set(readSeenBadges() ?? []);
    for (const id of ids) seen.add(id);
    localStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    // kaydedilemedi: kutlama bir dahaki açılışta yine çıkabilir
  }
}
