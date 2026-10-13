// Basit servis çalışanı: açılan dosyaları önbelleğe alır, internet yokken oradan verir.
const CACHE = "ders-takip-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  // Eski sürümlerin önbelleğini temizle
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // Önce internetten dene (güncel kalsın), olmazsa önbellekten ver
  event.respondWith(
    fetch(req)
      .then((res) => {
        const kopya = res.clone();
        caches.open(CACHE).then((c) => c.put(req, kopya));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("./"))),
  );
});
