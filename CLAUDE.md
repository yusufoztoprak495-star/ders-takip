# CLAUDE.md

## Proje

Kişisel ders çalışma takip uygulaması. YKS (sayısal) hazırlığı sırasında kendim kullanacağım ve GitHub profilimde portfolyo projesi olarak duracak. Uygulama mağazalarında yayınlanmayacak.

## Temel Özellikler

- Pomodoro zamanlayıcı
- Günlük çalışma süresi kaydı (ders/konu bazında)
- Çözülen soru sayısı kaydı (ders, konu, doğru/yanlış/boş)
- Kaynak ve video takibi (hangi kitap/video seti, nerede kaldım)
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

Node.js 22+ ve Express (sunucu), SQLite / better-sqlite3 (veritabanı), React + Vite ve React Router `HashRouter` (arayüz), Chart.js (grafikler), Vitest + Supertest (test). Tasarım: `docs/superpowers/specs/`, uygulama planı: `docs/superpowers/plans/`.

### Komutlar (proje kökünden)

- `npm install`: bağımlılıkları kurar (npm workspaces: `server` ve `client`).
- `npm start`: arayüzü derler ve sunucuyu başlatır (`http://localhost:3000`).
- `npm run dev`: sunucu + Vite geliştirme sunucusu (`http://localhost:5173`, `/api` isteklerini 3000'e yönlendirir).
- `npm test`: sunucu ve arayüz testlerinin hepsi. Tek paket: `npm test -w server` / `npm test -w client`.
- Ayarlar `.env` içinde (`PORT`, `DB_PATH`); örnek: `.env.example`. Veritabanı `data/calisma.db` (Git'e eklenmez).

### Klasör yapısı

- `server/src/`: `app.js` (`createApp(db, { clientDist })`), `db.js`, `seed.js`, `validation.js`, `stats.js`, `routes/`. Testler `server/tests/` (bellek içi veritabanıyla, `makeTestApp()`).
- `client/src/`: `pages/`, `components/`, `hooks/`, `context/` (Pomodoro sayacı durumu), `lib/` (saf yardımcılar). Testler `client/tests/`.

### Proje kuralları (kodda uyulan)

- **Doğrulama sunucudadır.** Arayüz kontrolleri yalnızca kolaylıktır; her girdiyi sunucu `400` + Türkçe mesajla reddeder.
- **Net saklanmaz**, hesaplanır: `net = doğru − yanlış / 4` (`server/src/stats.js` → `netOf`; arayüzde `client/src/lib/charts.js`).
- **Gün sınırı yereldir:** çalışma kayıtları UTC saklanır, istatistikler `date(started_at, 'localtime')` ile yerel güne göre gruplanır.
- **Önce test:** sunucu mantığı ve saf arayüz fonksiyonları için önce başarısız test yazılır. Sayfaların görünümü tarayıcıda gerçekten açılıp denenir (testler görsel hataları yakalamaz).
- Silinen konu/kaynağa bağlı kayıtlar silinmez, bağlantıları boşalır (`ON DELETE SET NULL`).
- Kapsam dışı: PDF'ten soru üretme (ileride).
