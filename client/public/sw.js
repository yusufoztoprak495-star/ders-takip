// Basit servis çalışanı: açılan dosyaları önbelleğe alır, internet yokken oradan verir.
// Sürüm adı değişince eski önbellek silinir (yeni tasarım/özellik gelince artırılır).
const CACHE = "ders-takip-v3";

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
        // Yalnızca başarılı cevaplar saklanır: 404 ya da hata sayfası önbelleğe girip
        // çevrimdışıyken doğru dosyanın yerine verilmesin
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Sayfa açılışıysa (adres çubuğu) uygulamanın ana sayfası verilir; dosyaysa hata
        if (req.mode === "navigate") {
          const home = await caches.match("./");
          if (home) return home;
        }
        return Response.error();
      }),
  );
});
