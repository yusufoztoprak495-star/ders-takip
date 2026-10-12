# Ders Çalışma Takip Uygulaması Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** YKS sayısal hazırlığı için Pomodoro, çalışma süresi, soru sayısı, kaynak takibi ve grafikli ilerleme sunan, `npm install` + `npm start` ile çalışan yerel bir web uygulaması.

**Architecture:** React + Vite arayüzü, Express API'si ve tek bir SQLite dosyası. Sunucu istekleri doğrular, istatistikleri hesaplar ve derlenmiş arayüzü de servis eder. Sunucu `createApp(db)` fabrikasıyla kurulur, böylece testler bellek içi veritabanıyla çalışır.

**Tech Stack:** Node.js 22+, Express, better-sqlite3, dotenv, React, Vite, react-router-dom (HashRouter), Chart.js + react-chartjs-2, Vitest, Supertest.

**Spec:** `docs/superpowers/specs/2026-10-12-ders-takip-design.md`

## Global Constraints

- Tek kullanıcı: hesap sistemi, mobil arayüz, canlı demo/yayınlama yok.
- PDF'ten soru üretme için kod, altyapı veya bağımlılık eklenmez.
- Teknolojiler: React + Vite, Chart.js, Node.js + Express, SQLite, Vitest + Supertest. Başka çatı veya kütüphane eklenmez.
- Projeyi indiren `npm install` + `npm start` ile çalıştırır ve `localhost` adresini açar.
- Doğrulama sunucudadır: doğru/yanlış/boş negatif olamaz, süre sıfırdan büyük olmalı, ders zorunlu, tarih geçerli. Geçersiz istek `400` + Türkçe mesaj, olmayan kayıt `404`, beklenmeyen hata `500` + genel mesaj (iç ayrıntı sızmaz).
- Net kayıtta saklanmaz, hesaplanır.
- Gizli bilgi koda yazılmaz; ayarlar `.env` içindedir ve `.env` `.gitignore`'dadır.
- Değişken/fonksiyon isimleri İngilizce, kod yorumları Türkçe. API alanları camelCase, veritabanı sütunları snake_case.
- Her görev sonunda commit; mesaj Türkçe (ASCII karakterlerle) ve şu satırla biter: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. README.md her görevde ilgili kısmı güncel tutulur.
- Bir görev, çalıştırılıp (testler + elle kontrol) doğrulanmadan bitti sayılmaz.

## Kararlar (spec'in açık bıraktığı yerler)

- **Net formülü:** `net = doğru − yanlış / 4`, 2 ondalığa yuvarlanır (YKS kuralı). Tek yerde: `server/src/stats.js` → `netOf`.
- **Gün sınırı:** İstatistikler ve `from`/`to` filtreleri yerel tarihe göre çalışır (`date(started_at, 'localtime')`). Gece 00:30'da başlayan çalışma o günün sayılır.
- **Konu düzenleme:** Spec "liste sonradan düzenlenebilir" diyor ama uç tanımlamıyor. Konu ekleme/yeniden adlandırma/silme için `/api/topics` uçları ve küçük bir "Konular" sayfası eklenir. Dersler sabittir.
- **Silme davranışı:** Konu silinirse kayıtlardaki `topic_id`, kaynak silinirse `question_logs.resource_id` NULL olur; kayıtlar silinmez.
- **Pomodoro:** Duraklatma yok. Erken "Vazgeç" kayıt oluşturmaz. Varsayılan 25 dk çalışma / 5 dk mola, `localStorage`'da tutulur.
- **Haftalık grafik:** Sunucuda ayrı uç yok; arayüz günlük veriyi Pazartesi başlangıçlı haftalara toplar.
- **Çalışma günlüğü:** Elle girilen kayıt seçilen günün 12:00'sine yazılır. Kayıtlar yalnızca silinebilir (düzenleme yok).

## Review Focus

1. Gece yarısı sonrası (örn. 00:30) başlayan çalışma ve soru kayıtları doğru güne düşmeli (Task 3, 6).
2. Hiç veri yokken istatistik uçları hata/NaN vermemeli; boş dizi ya da sıfırlı satırlar dönmeli (Task 6).
3. Seçilen konu seçilen derse ait değilse veya ders/konu/kaynak yoksa `400` (Task 3, 5).
4. Kaynak ya da konu silinince bağlı çalışma/soru kayıtları kaybolmamalı (Task 2, 5).
5. Yanlış tipte girdi (sayı yerine `"5"`, `1.5`, eksik gövde, bozuk JSON, 0/0/0 soru kaydı) `500` değil `400` döndürmeli (Task 1, 3, 5).

---

## Dosya Yapısı

```
package.json                     kök: workspaces, start/dev/test betikleri
.env.example                     PORT, DB_PATH
server/
  package.json
  src/server.js                  .env'i okur, db'yi açar, dinler
  src/app.js                     createApp(db, options)
  src/db.js                      openDb, şema
  src/seed.js, seedData.js       ilk ders/konu verisi
  src/errors.js                  HttpError, notFoundHandler, errorHandler
  src/validation.js              giriş doğrulayıcıları
  src/stats.js                   netOf, istatistik sorguları
  src/routes/{subjects,topics,sessions,resources,questions,stats}.js
  tests/                         her dosya için *.test.js, helpers.js
client/
  package.json, vite.config.js, index.html
  src/main.jsx, App.jsx, api.js
  src/lib/{dates,pomodoro,charts}.js (+ testleri)
  src/components/ErrorBanner.jsx
  src/pages/{Pomodoro,StudyLog,Questions,Resources,Topics,Progress}.jsx
```

---

### Task 1: Sunucu iskeleti ve hata yönetimi

**Files:**

- Create: `package.json`, `.env.example`, `server/package.json`, `server/src/app.js`, `server/src/server.js`, `server/src/errors.js`, `server/tests/app.test.js`, `server/tests/errors.test.js`, `README.md`

**Interfaces:**

- Produces: `createApp(): Express` (`/api/health`, JSON gövde okuma, 404 ve hata yakalayıcı), `class HttpError extends Error { constructor(status: number, message: string) }`, `notFoundHandler(req, res)`, `errorHandler(err, req, res, next)`.

- [ ] **Step 1: Testleri yaz** (`app.test.js`, `errors.test.js`, Supertest ile)
  - `GET /api/health` → 200, `{ status: 'ok' }`
  - `GET /api/yok` → 404, `{ error: 'Bulunamadı' }`
  - `POST /api/health` gövdesi `{bad` (Content-Type: application/json) → 400, `{ error: 'Geçersiz JSON' }`
  - `errors.test.js`: küçük bir Express uygulamasında `throw new HttpError(400, 'x')` → 400 `{ error: 'x' }`; düz `throw new Error('gizli')` → 500, `{ error: 'Bir şeyler ters gitti' }` ve gövdede `gizli` ve `stack` geçmez.
- [ ] **Step 2: Testlerin başarısız olduğunu doğrula:** `npm test` → FAIL (modül yok).
- [ ] **Step 3: Uygula.** Kök `package.json`: `workspaces: ["server"]`, betikler `start` (`node server/src/server.js`) ve `test` (`npm test --workspaces --if-present`). `server/package.json`: `type: module`, bağımlılıklar express, better-sqlite3, dotenv; devDependencies vitest, supertest; betikler `test` (`vitest run`) ve `dev` (`node --watch src/server.js`). `server.js` `PORT` (varsayılan 3000) değerini `.env`'den okur. `.env.example` içinde `PORT=3000` ve `DB_PATH=./data/calisma.db`. README'ye proje tanımı, gereksinimler (Node 20+), kurulum ve çalıştırma yazılır.
- [ ] **Step 4: Testlerin geçtiğini doğrula:** `npm test` → PASS. Elle: `npm start`, `curl localhost:3000/api/health`.
- [ ] **Step 5: Commit** (`server/data/` `.gitignore`'da `*.db` ile zaten kapsanır).

---

### Task 2: Veritabanı, ilk veri, dersler ve konular

**Files:**

- Create: `server/src/db.js`, `server/src/seed.js`, `server/src/seedData.js`, `server/src/validation.js`, `server/src/routes/subjects.js`, `server/src/routes/topics.js`, `server/tests/helpers.js`, `server/tests/db.test.js`, `server/tests/subjects.test.js`, `server/tests/topics.test.js`
- Modify: `server/src/app.js`, `server/src/server.js`, `server/tests/app.test.js`

**Interfaces:**

- Consumes: Task 1 `HttpError`.
- Produces:
  - `openDb(filePath: string): Database` (`':memory:'` desteklenir; `foreign_keys = ON`; spec'teki 5 tabloyu yoksa oluşturur). Sütunlar: `subjects(id, name, exam_type)`, `topics(id, subject_id, name)`, `study_sessions(id, subject_id, topic_id NULL, started_at, duration_seconds, entry_type)`, `question_logs(id, date, subject_id, topic_id NULL, correct, wrong, blank, resource_id NULL)`, `resources(id, name, type, subject_id, total_units, current_unit)`. `topic_id` ve `resource_id` yabancı anahtarları `ON DELETE SET NULL`; ders silinemez.
  - `seedIfEmpty(db: Database): void` (tablo doluysa hiçbir şey yapmaz).
  - `createApp(db: Database): Express`; `server.js` bunu `openDb(process.env.DB_PATH ?? './data/calisma.db')` ile çağırır (klasör yoksa oluşturur).
  - `makeTestApp(): { app, db }` (`helpers.js`; bellek içi db + `seedIfEmpty`).
  - `validation.js`: `requireString(value, field, { maxLength? }): string` (kırpılmış, boş olamaz), `requireInt(value, field, { min?, max? }): number` (yalnızca gerçek tam sayı; `"5"`, `1.5`, `NaN` reddedilir), `optionalInt(value, field, opts): number | null`. Hata: `HttpError(400, '<field> ...')`.
  - API: `GET /api/subjects` → `[{ id, name, examType, topics: [{ id, name }] }]`; `POST /api/topics` `{ subjectId, name }` → 201 `{ id, subjectId, name }`; `PUT /api/topics/:id` `{ name }`; `DELETE /api/topics/:id` → 204.

- [ ] **Step 1: Testleri yaz**
  - `db.test.js`: 5 tablo var; geçersiz `subject_id` ile `topics` ekleme hata verir (yabancı anahtar açık).
  - `db.test.js`: `topic_id` olan bir `study_sessions` satırı varken konu silinince satır durur ve `topic_id` NULL olur (Review Focus 4).
  - `subjects.test.js`: seed sonrası 8 ders (TYT: Türkçe, Sosyal Bilimler, Matematik, Fen Bilimleri; AYT: Matematik, Fizik, Kimya, Biyoloji); `seedIfEmpty` iki kez çağrılınca ders sayısı değişmez; her derste en az 5 konu.
  - `topics.test.js`: geçerli ekleme 201; boş ad 400; olmayan `subjectId` 400; `subjectId: "1"` 400; PUT yeniden adlandırır; silme 204, tekrar silme 404.
  - `validation` birimleri (`requireInt`: `'5'`, `1.5`, `undefined`, `min` altı reddedilir; `requireString`: `'  '` reddedilir).
- [ ] **Step 2: Başarısızlığı doğrula:** `npm test -w server` → FAIL.
- [ ] **Step 3: Uygula.** `seedData.js` ders ve konu başlıklarını düz veri olarak tutar (konular ÖSYM YKS konu başlıklarından; ders başına ana başlıklar yeterli). Rotalar `Router` döndüren `subjectsRouter(db)` / `topicsRouter(db)` fonksiyonlarıdır ve `app.js` içinde `/api` altına bağlanır.
- [ ] **Step 4: Doğrula:** testler PASS; elle `npm start` ve `curl localhost:3000/api/subjects`; ders/konu listesini birlikte gözden geçirip eksik/yanlış konu varsa düzelt. README'ye veritabanı bölümü ekle.
- [ ] **Step 5: Commit.**

---

### Task 3: Çalışma kayıtları (`/api/sessions`)

**Files:**

- Create: `server/src/routes/sessions.js`, `server/tests/sessions.test.js`
- Modify: `server/src/validation.js`, `server/src/app.js`

**Interfaces:**

- Consumes: Task 2 `requireInt`, `optionalInt`, `makeTestApp`.
- Produces: `requireDate(value, field): string` (`YYYY-MM-DD`, takvimde var olan gün), `requireIsoDateTime(value, field): string`, `requireOneOf(value, field, allowed: string[]): string`, `assertSubjectExists(db, subjectId): void`, `assertTopicMatchesSubject(db, topicId: number | null, subjectId: number): void` (konu yoksa veya başka derse aitse 400). `sessionsRouter(db)`. Kayıt biçimi: `{ id, subjectId, topicId, startedAt, durationSeconds, entryType }`; `entryType` ∈ `pomodoro | manual`. `GET /api/sessions?from=&to=` (yerel tarihe göre, uçlar dahil; verilmezse hepsi, `startedAt` azalan sırada).

- [ ] **Step 1: Testleri yaz**
  - Geçerli `POST` → 201 ve doğru alanlar; `GET` listeler.
  - 400: `durationSeconds` 0, -5, `"60"`, 1.5; `subjectId` eksik; olmayan ders; `entryType: 'x'`; `startedAt: 'dün'`; topic başka derse ait (Review Focus 3, 5); gövde boş.
  - `from`/`to` filtresi: `new Date(2026, 9, 12, 0, 30).toISOString()` ile eklenen kayıt `from=to=2026-10-12` sorgusunda gelir, `2026-10-11` sorgusunda gelmez (Review Focus 1; saat dilimi fark etmez).
  - `PUT` alanları günceller; olmayan id → 404; `DELETE` 204, tekrar 404.
  - `validation`: `requireDate('2026-02-30')` reddedilir, `'2026-10-12'` kabul edilir.
- [ ] **Step 2: Başarısızlığı doğrula:** `npm test -w server -- sessions` → FAIL.
- [ ] **Step 3: Uygula.** `PUT` tüm alanları ister (kısmi güncelleme yok), aynı doğrulayıcıları kullanır.
- [ ] **Step 4: Doğrula:** tüm testler PASS; elle `curl -X POST` ile geçerli ve geçersiz kayıt dene. README'ye API satırlarını ekle.
- [ ] **Step 5: Commit.**

---

### Task 4: Kaynaklar (`/api/resources`)

**Files:**

- Create: `server/src/routes/resources.js`, `server/tests/resources.test.js`
- Modify: `server/src/app.js`

**Interfaces:**

- Consumes: Task 2-3 doğrulayıcıları ve `assertSubjectExists`.
- Produces: `resourcesRouter(db)`. Kayıt: `{ id, name, type, subjectId, totalUnits, currentUnit, progressPercent }`; `type` ∈ `kitap | video`; `totalUnits > 0`; `0 <= currentUnit <= totalUnits`; `progressPercent = Math.round(currentUnit / totalUnits * 100)`. `GET` listeler; `POST`/`PUT`/`DELETE` standart.

- [ ] **Step 1: Testleri yaz:** geçerli ekleme (`progressPercent` doğru, örn. 30/120 → 25); `totalUnits` 0, `currentUnit` -1, `currentUnit > totalUnits`, `type: 'dergi'`, boş ad, olmayan ders → 400; `PUT` ile `currentUnit` güncellenir; `PUT`'ta `totalUnits` mevcut `currentUnit`'in altına düşürülürse 400; olmayan id 404; silme 204.
- [ ] **Step 2: Başarısızlığı doğrula.**
- [ ] **Step 3: Uygula.**
- [ ] **Step 4: Doğrula:** testler PASS; README API listesi güncel.
- [ ] **Step 5: Commit.**

---

### Task 5: Soru kayıtları (`/api/questions`)

**Files:**

- Create: `server/src/routes/questions.js`, `server/src/stats.js` (yalnızca `netOf`), `server/tests/questions.test.js`, `server/tests/stats.test.js` (yalnızca `netOf` testi)
- Modify: `server/src/app.js`

**Interfaces:**

- Consumes: Task 3 `requireDate`, `assertTopicMatchesSubject`; Task 4 `resources` tablosu.
- Produces: `netOf(correct: number, wrong: number): number` (`correct − wrong/4`, 2 ondalık). `questionsRouter(db)`. Kayıt: `{ id, date, subjectId, topicId, correct, wrong, blank, resourceId, net }`. `GET /api/questions?from=&to=` (tarih alanına göre, uçlar dahil, `date` azalan).

- [ ] **Step 1: Testleri yaz**
  - `netOf(10, 4) === 9`, `netOf(0, 0) === 0`, `netOf(3, 1) === 2.75`.
  - Geçerli ekleme 201 ve `net` doğru.
  - 400: negatif doğru/yanlış/boş; 0/0/0 (toplam soru 0); `"5"`; 1.5; `date: '2026-02-30'`; olmayan ders; topic başka derse ait; olmayan `resourceId`.
  - `resourceId` ve `topicId` isteğe bağlıdır (`null` kabul).
  - Kaynak silinince bağlı soru kaydı durur, `resourceId` null olur (Review Focus 4).
  - `PUT`/`DELETE` ve 404 davranışı.
- [ ] **Step 2: Başarısızlığı doğrula.**
- [ ] **Step 3: Uygula.**
- [ ] **Step 4: Doğrula:** tüm sunucu testleri PASS; README güncel.
- [ ] **Step 5: Commit.**

---

### Task 6: İstatistik uçları (`/api/stats`)

**Files:**

- Modify: `server/src/stats.js`, `server/src/app.js`, `server/tests/stats.test.js` (Task 5'te açılan dosyaya eklenir)
- Create: `server/src/routes/stats.js`

**Interfaces:**

- Consumes: `netOf`, `requireDate`, `requireInt`/`optionalInt`.
- Produces: `statsRouter(db)`.
  - `GET /api/stats/daily?from=&to=[&subjectId=]` → `[{ date, totalSeconds, correct, wrong, blank, net }]`, yalnızca verisi olan günler, `date` artan. `from`/`to` zorunlu ve `from <= to`, değilse 400. Çalışma ve soru toplamları yerel güne göre birleştirilir.
  - `GET /api/stats/by-subject?from=&to=` → 8 dersin hepsi için `[{ subjectId, subjectName, examType, totalSeconds, correct, wrong, blank, net }]` (verisiz ders sıfırlarla).

- [ ] **Step 1: Testleri yaz**
  - Boş veritabanı: `daily` → `[]`; `by-subject` → 8 satır, hepsi sıfır, `net: 0`, hiçbir değer `NaN`/`null` değil (Review Focus 2).
  - Aynı güne ait iki çalışma ve iki soru kaydı tek satırda toplanır; `net` kayıt bazında değil toplam doğru/yanlıştan hesaplanır.
  - Gece 00:30'da başlayan çalışma yerel güne yazılır (Task 3'teki yöntemle).
  - `subjectId` filtresi yalnızca o dersi sayar; `from`/`to` dışındaki kayıtlar dışlanır; `from > to`, eksik `from`, `from: 'abc'` → 400.
- [ ] **Step 2: Başarısızlığı doğrula.**
- [ ] **Step 3: Uygula.** Tarih gruplama için SQL'de `date(started_at, 'localtime')` kullan.
- [ ] **Step 4: Doğrula:** tüm sunucu testleri PASS; elle bir kaç kayıt ekleyip uçları `curl` ile kontrol et. README güncel.
- [ ] **Step 5: Commit.**

---

### Task 7: Arayüz iskeleti ve tek komutla çalıştırma

**Files:**

- Create: `client/package.json`, `client/vite.config.js`, `client/index.html`, `client/src/main.jsx`, `client/src/App.jsx`, `client/src/api.js`, `client/src/components/ErrorBanner.jsx`, `client/src/lib/dates.js`, `client/tests/api.test.js`, `client/tests/dates.test.js`, `server/tests/static.test.js`
- Modify: `package.json` (workspaces'e `client`, betikler), `server/src/app.js`, `server/src/server.js`, `README.md`

**Interfaces:**

- Produces:
  - `apiFetch(path: string, options?: { method?, body? }): Promise<any>` (`/api` önekli yolu alır; gövde JSON; 204'te `null` döner). Sunucu `{ error }` döndürürse `ApiError` (`message` = sunucu mesajı); ağ hatasında `Error('Sunucuya ulaşılamıyor')` fırlatır.
  - `toLocalDateString(date: Date): string` → yerel `YYYY-MM-DD`.
  - `<ErrorBanner message={string | null} />`.
  - `createApp(db, options?: { clientDist?: string })`: `clientDist` varsa statik servis eder; `/api` dışındaki yollar için `index.html`'e düşmez (HashRouter kullanıldığı için gerek yok).
  - Kök betikler: `build` (`npm run build -w client`), `start` (`npm run build && node server/src/server.js`), `dev` (`concurrently` ile sunucu + `vite`; Vite `/api` isteklerini `localhost:3000`'e yönlendirir), `test`.
  - `App.jsx`: üstte menü ve `<Routes>`; her sonraki görev kendi sayfasını ve menü öğesini ekler. Başlangıçta yalnızca bir karşılama sayfası vardır.

- [ ] **Step 1: Testleri yaz**
  - `api.test.js` (`fetch` mock'lanır): 400 + `{ error: 'Ders zorunlu' }` → `ApiError`, `message === 'Ders zorunlu'`; `fetch` reddedilirse `message === 'Sunucuya ulaşılamıyor'`; 204 → `null`.
  - `dates.test.js`: `toLocalDateString(new Date(2026, 9, 12, 0, 30)) === '2026-10-12'`.
  - `static.test.js`: geçici klasörde `index.html` varken `GET /` → 200 HTML; `GET /api/yok` hâlâ JSON 404.
- [ ] **Step 2: Başarısızlığı doğrula.**
- [ ] **Step 3: Uygula.**
- [ ] **Step 4: Doğrula:** `npm test` PASS; `npm start` ile tarayıcıda `localhost:3000` açılır ve karşılama sayfası görünür; `npm run dev` ile `localhost:5173` de çalışır. README kurulum/çalıştırma bölümü güncellenir.
- [ ] **Step 5: Commit.**

---

### Task 8: Pomodoro sayfası

**Files:**

- Create: `client/src/lib/pomodoro.js`, `client/tests/pomodoro.test.js`, `client/src/pages/Pomodoro.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**

- Consumes: `apiFetch`, `ErrorBanner`, `GET /api/subjects`, `POST /api/sessions`.
- Produces: `remainingSeconds(startedAtMs: number, durationSeconds: number, nowMs: number): number` (0'ın altına inmez), `loadSettings(): { workMinutes: number, breakMinutes: number }` (`localStorage`'da `pomodoro.settings`; bozuk/yoksa/erişilemezse `{25, 5}`), `saveSettings(settings): void` (hata yutulur).

- [ ] **Step 1: Testleri yaz**
  - `remainingSeconds(0, 1500, 10_000) === 1490`; `now` başlangıçtan 25 dk sonra veya sonrasında `0`; sekme arka planda kalıp `now` bir anda +600 sn atlasa sonuç yine başlangıca göre hesaplanır (`remainingSeconds(0, 1500, 600_000) === 900`).
  - `loadSettings`: bozuk JSON, eksik alan, negatif/0 dakika, `localStorage` hata fırlatması → `{25, 5}`.
- [ ] **Step 2: Başarısızlığı doğrula.**
- [ ] **Step 3: Uygula.** Sayfa: ders (+ konu, seçilen derse göre süzülür) seçimi, süre ayarı, Başlat / Vazgeç. Çalışma bitince `POST /api/sessions` (`entryType: 'pomodoro'`, `durationSeconds` = çalışma süresi, `startedAt` = başlangıç anı) ve ardından mola sayacı. Kayıt başarısız olursa "Kaydedilemedi" uyarısı ve **Tekrar dene** düğmesi çıkar; süre ekranda kalır, başarıyla kaydedilene kadar silinmez. Vazgeç kayıt oluşturmaz.
- [ ] **Step 4: Doğrula:** testler PASS. Elle: 1 dakikalık süreyle tam bir tur çalıştır, kaydın `GET /api/sessions` ile geldiğini gör; sunucuyu kapatıp bitir, "Tekrar dene"nin süreyi koruduğunu ve sunucu açılınca kaydettiğini gör; sekmeyi arka plana atıp süre doğruluğunu kontrol et.
- [ ] **Step 5: Commit.**

---

### Task 9: Çalışma günlüğü sayfası

**Files:**

- Create: `client/src/pages/StudyLog.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**

- Consumes: `toLocalDateString`, `apiFetch`, `GET/POST/DELETE /api/sessions`.

- [ ] **Step 1: Uygula.** Form: ders, konu (isteğe bağlı), tarih (varsayılan bugün), dakika. Gönderince `startedAt` = seçilen günün 12:00'si (yerel), `durationSeconds = dakika * 60`, `entryType: 'manual'`. Altında bugünün kayıtları (`from=to=bugün`) ders/konu adıyla, süreyle ve **Sil** düğmesiyle listelenir. Sunucu hataları `ErrorBanner`'da görünür.
- [ ] **Step 2: Doğrula (elle):** geçerli kayıt eklenir ve listede görünür; 0 dakika ya da boş ders sunucu mesajıyla reddedilir; silme çalışır. `npm test` hâlâ PASS.
- [ ] **Step 3: Commit.**

---

### Task 10: Soru kaydı sayfası

**Files:**

- Create: `client/src/pages/Questions.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**

- Consumes: `GET/POST/PUT/DELETE /api/questions`, `GET /api/resources` (kaynak seçimi).

- [ ] **Step 1: Uygula.** Form: tarih (varsayılan bugün), ders, konu, doğru/yanlış/boş, kaynak (isteğe bağlı). Altında son 30 günün kayıtları net değeriyle; her satırda **Düzenle** (aynı formu doldurur, `PUT`) ve **Sil**.
- [ ] **Step 2: Doğrula (elle):** ekleme, düzenleme, silme; negatif sayı ve 0/0/0 sunucu mesajıyla reddedilir; kayıtlı net sunucudaki `net` ile aynı gösterilir.
- [ ] **Step 3: Commit.**

---

### Task 11: Kaynaklar sayfası

**Files:**

- Create: `client/src/pages/Resources.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**

- Consumes: `GET/POST/PUT/DELETE /api/resources`.

- [ ] **Step 1: Uygula.** Kaynak listesi: ad, tür, ders, ilerleme çubuğu (`progressPercent`), "kaldığım yer" sayı alanı (`currentUnit`) ve güncelle düğmesi; yeni kaynak formu (ad, tür, ders, toplam birim); **Sil**.
- [ ] **Step 2: Doğrula (elle):** kaynak ekle, "kaldığım yer"i güncelle, çubuğun yüzdesi sunucudakiyle aynı; `currentUnit > totalUnits` reddedilir; silince bağlı soru kayıtları durur.
- [ ] **Step 3: Commit.**

---

### Task 12: Konular sayfası

**Files:**

- Create: `client/src/pages/Topics.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**

- Consumes: `GET /api/subjects`, `POST/PUT/DELETE /api/topics`.

- [ ] **Step 1: Uygula.** Derse göre gruplanmış konu listesi; her derse konu ekleme, konu adını değiştirme, silme.
- [ ] **Step 2: Doğrula (elle):** eklenen konu Pomodoro ve Soru sayfalarındaki konu seçiminde görünür; kullanımda olan bir konu silinince eski kayıtlar listeden kaybolmaz.
- [ ] **Step 3: Commit.**

---

### Task 13: İlerleme sayfası (grafikler)

**Files:**

- Create: `client/src/lib/charts.js`, `client/tests/charts.test.js`, `client/src/pages/Progress.jsx`
- Modify: `client/src/App.jsx`, `client/package.json` (chart.js, react-chartjs-2)

**Interfaces:**

- Consumes: `GET /api/stats/daily`, `GET /api/stats/by-subject`, `toLocalDateString`.
- Produces: `fillMissingDays(daily: DailyStat[], from: string, to: string): DailyStat[]` (verisiz günler sıfırlarla), `groupByWeek(daily: DailyStat[]): WeeklyStat[]` — Pazartesi başlangıçlı, `{ weekStart, totalSeconds, correct, wrong, blank, net }`, `net` toplam doğru/yanlıştan `correct − wrong/4` ile yeniden hesaplanır.

- [ ] **Step 1: Testleri yaz**
  - `fillMissingDays` 3 günlük aralıkta bir günlük veriyle 3 satır döner, boşlar 0.
  - `groupByWeek`: Pazar (2026-10-11) ve Pazartesi (2026-10-12) farklı haftalara düşer; aynı haftadaki günler toplanır; `groupByWeek([]) → []`.
- [ ] **Step 2: Başarısızlığı doğrula.**
- [ ] **Step 3: Uygula.** Grafikler: son 14 gün günlük çalışma (dakika, çubuk), son 8 hafta haftalık çalışma (çubuk), ders bazında süre dağılımı (halka), ders bazında doğru/yanlış/boş (yığılmış çubuk), seçilen ders için günlük net değişimi (çizgi, `subjectId` süzgeciyle). Tarih aralığı seçimi: 7 / 30 / 90 gün. Veri yoksa grafik yerine "Henüz kayıt yok" mesajı.
- [ ] **Step 4: Doğrula:** testler PASS. Elle: birkaç gün ve ders için kayıt girip her grafiği kontrol et; boş veritabanında sayfa hata vermeden mesaj gösterir.
- [ ] **Step 5: Commit.**

---

### Task 14: Son kontrol ve README

**Files:**

- Modify: `README.md`

- [ ] **Step 1:** README'yi tamamla: proje açıklaması, özellikler, ekran görüntüleri (gerçek uygulamadan), kurulum (`npm install`, `npm start`), `.env.example` açıklaması, test komutu, klasör yapısı, "ileride: PDF'ten soru üretme".
- [ ] **Step 2:** Temiz bir klasöre klonlayıp (`git clone` → `npm install` → `npm start`) uygulamanın açıldığını doğrula; `npm test` tüm paketlerde PASS olmalı.
- [ ] **Step 3:** `CLAUDE.md`'nin "Teknoloji ve Komutlar" bölümünü gerçek yığın, komutlar ve klasör yapısıyla doldur.
- [ ] **Step 4: Commit.**
