# CLAUDE.md

## Proje

Kişisel ders çalışma takip uygulaması. YKS (sayısal), DGS ya da üniversite dersleri için kullanılır (çalışma hedefi seçilir); kendim kullanacağım ve GitHub profilimde portfolyo projesi olarak duracak. Uygulama mağazalarında yayınlanmayacak.

## Temel Özellikler

- Pomodoro zamanlayıcı
- Günlük çalışma süresi kaydı (ders/konu bazında)
- Çözülen soru sayısı kaydı (ders, konu, doğru/yanlış/boş)
- Kaynak takibi: test kitapları (kitap, yayınevi, ders, çözülen test sayısı, son çözüm tarihi, elimde/bitirdim)
- Grafiklerle ilerleme takibi (günlük, haftalık, ders bazında)

### Kapsam Dışı (şimdilik YAPILMAYACAK)

- PDF'ten soru üretme (ileride eklenecek; şimdi bu yönde kod, altyapı veya bağımlılık ekleme)

## Kullanıcı Hakkında

- Bilgisayar programcılığı 2. sınıf öğrencisi, kodlamaya yeni başlıyor.
- Hedef: projeyi hem bitirmek hem de yaparken öğrenmek.
- Açıklamalar sade olmalı; jargon kullanılırsa kısaca açıklanmalı.

## Çalışma Kuralları

### İletişim

- Her zaman **Türkçe** cevap ver.
- Kod içindeki değişken ve fonksiyon isimleri İngilizce olabilir, **yorumlar Türkçe** olsun.
- Önemli kararları ve nedenini kısaca açıkla, kullanıcı öğrensin.

### İlerleme

- **Küçük adımlarla** ilerle. Bir seferde **tek bir özellik** üzerinde çalış.
- **Teknoloji seçimi henüz yapılmadı.** Brainstorming'de seçenekleri artı ve eksileriyle anlat, kararı birlikte ver. Kullanıcı onaylamadan teknoloji dayatma.
- Proje brainstorming ile detaylandırılacak; o aşamadan önce kod yazma.

### Git

- Çalışan her adımdan sonra **anlamlı bir mesajla commit** at.
- Çalışmayan veya test edilmemiş hâli commit'leme.

### Güvenlik

- API anahtarı, şifre gibi gizli bilgileri **asla koda yazma**.
- Gizli bilgiler için `.env` kullan ve `.env` dosyasını `.gitignore`'a ekle. Repoya örnek olarak `.env.example` konabilir (gerçek değer içermeden).

### Dokümantasyon

- Proje GitHub'da görüneceği için **README.md'yi güncel tut** (ne yaptığı, nasıl kurulur/çalıştırılır, özellikler).

### Doğrulama

- Bir şey "bitti" demeden önce **çalıştırıp test et**; sonucu dürüstçe bildir.

## Teknoloji ve Komutlar

### Teknoloji yığını

Sunucusuz, tamamen statik bir web uygulaması (PWA olarak yayınlanacak): React + Vite, React Router `HashRouter`, veriler tarayıcıda IndexedDB'de, elle çizilmiş SVG grafikler (kütüphanesiz), `@fontsource` ile gömülü yazı tipleri (Cormorant Garamond, Figtree), Vitest (test). Node.js sunucusu ve SQLite kaldırıldı (`pwa` branch'i; eski hâli `master`'da). Tasarım: `docs/superpowers/specs/`, uygulama planı: `docs/superpowers/plans/`.

### Komutlar (proje kökünden)

- `npm install`: bağımlılıkları kurar (npm workspace: `client`).
- `npm run dev`: Vite geliştirme sunucusu (`http://localhost:5173`).
- `npm run build` / `npm run preview`: derler (`client/dist`) / derlenmiş hâli dener (`http://localhost:4173`).
- `npm test`: tüm testler.
- Eski `data/calisma.db` yalnızca tek seferlik yedek dönüştürmesi için durur (Git'e eklenmez).

### Klasör yapısı

- `client/src/`: `pages/`, `components/`, `hooks/`, `context/` (Pomodoro sayacı durumu), `lib/` (saf yardımcılar), `data/` (tarayıcıdaki veritabanı katmanı). Testler `client/tests/` (veri katmanı testleri `client/tests/data/`).
- `client/src/data/`: `database.js` (`createDatabase(storage)`), `storage.js` (IndexedDB ve bellek içi depo), `router.js` + `routes/` (eski API uçlarının yerel karşılığı), `validation.js`, `stats.js`, `seed.js`.
- `client/src/api.js`: `apiFetch('/api/...')` çağrıları aynen duruyor; artık sunucuya değil yerel veritabanına gider. Sayfalar bu yüzden değişmedi.

### Proje kuralları (kodda uyulan)

- **Doğrulama veri katmanındadır** (`client/src/data/`). Arayüz kontrolleri yalnızca kolaylıktır; her girdiyi veri katmanı Türkçe mesajla reddeder (`HttpError` 400 → `ApiError`).
- **Net saklanmaz**, hesaplanır: `net = doğru − yanlış / 4` (`client/src/data/stats.js` → `netOf`; arayüzde `client/src/lib/charts.js`).
- **Gün sınırı yereldir:** çalışma kayıtları UTC saklanır, istatistikler yerel güne (`sessionDay`) göre gruplanır.
- **Önce test:** veri katmanı mantığı ve saf arayüz fonksiyonları için önce başarısız test yazılır. Sayfaların görünümü tarayıcıda gerçekten açılıp denenir (testler görsel hataları yakalamaz).
- Silinen konu/kaynağa bağlı kayıtlar silinmez, bağlantıları boşalır (veri katmanı bağlantıyı `null` yapar). Kaydı olan ders silinmez.
- **Çalışma hedefi:** `state.settings.track` (`yks`/`dgs`/`uni`, `client/src/lib/tracks.js`). Her dersin `track` alanı vardır; listeler ve istatistikler `activeSubjectIds` ile seçili hedefe süzülür. Hazır listeler `seedData.js` → `SEED_BY_TRACK`, göç `seed.js` → `prepareState`.
- Kapsam dışı: PDF'ten soru üretme (ileride).
