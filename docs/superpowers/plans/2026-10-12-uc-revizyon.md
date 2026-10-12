# Üç Revizyon (Kaynaklar, İlerleme, Tasarım) Uygulama Planı

> **Uygulayacak ajan için:** Bu planı `superpowers:executing-plans` ile (aynı oturumda, görev görev) uygula. Adımlar `- [ ]` kutularıyla izlenir. **Her bölümün sonunda DUR**, kullanıcıya test etmesi için haber ver, onayını al, ancak sonra commit at ve sonraki bölüme geç.

**Amaç:** Kaynakları yalnızca test kitabına çevirmek, ilerleme sayfasını üç katmanlı (özet → ders → konu) yapmak, tasarıma yeni font ve el çizimi süslemeler eklemek.

**Mimari:** Sunucu tarafında şema sürümlü (`PRAGMA user_version`) bir geçiş (migration) ve yeni istatistik uçları. İstemcide yeni sayfalar `HashRouter` altında iç içe adreslerle, mevcut SVG grafik bileşenleri yeniden kullanılarak. Süslemeler tek bir `Doodles.jsx` içinde özel SVG.

**Teknoloji:** Mevcut yığın (Express, better-sqlite3, React + Vite, Vitest + Supertest). Yeni bağımlılık yalnızca Bölüm 3'te seçilen fontların `@fontsource` paketleri.

**Spec:** Kullanıcının bu sohbetteki üç bölümlük isteği (ayrı spec dosyası yok). Mevcut tasarım: `docs/superpowers/specs/2026-10-12-ders-takip-design.md`.

## Genel Kısıtlar

- Dal: `redesign` üzerinden yeni `revizyon` dalı açılır (eski tasarım dalı bozulmasın, geri dönülebilsin).
- **Veritabanında herhangi bir değişiklikten önce** `data/calisma.db` yedeklenir (`data/yedek/` altına, `data/` zaten Git dışı). Geçiş kodu da dosya veritabanını değiştirmeden önce kendi yedeğini alır.
- Mevcut veriler kaybolmaz: kitap olan kaynaklar korunur, soru kayıtlarının kitap bağlantıları korunur.
- Doğrulama sunucudadır; geçersiz girdi `400` + Türkçe mesaj. Net hesabı `doğru − yanlış / 4`, saklanmaz.
- Yorumlar Türkçe, isimler İngilizce. Önce başarısız test, sonra kod. Sayfalar tarayıcıda gerçekten açılıp denenir.
- Hazır ikon paketi yok; tüm çizimler özel SVG. Font dosyaları projeye gömülü (internetsiz çalışır).
- Kapsam dışı: PDF'ten soru üretme.
- Her bölümden sonra kullanıcı onayı olmadan commit atılmaz.

## Review Focus

- Geçiş çalışırken `question_logs.resource_id` bağlantıları silinmemeli (`resources` tablosu yeniden kurulurken `ON DELETE SET NULL` tetiklenebilir; `foreign_keys` kapatılarak yapılır). Test: kitaba bağlı soru kaydı geçişten sonra aynı kitaba bağlı kalır.
- Geçiş iki kez çalışırsa (ya da boş/yeni veritabanında) veri bozulmamalı. Test: ikinci `openDb` çağrısı satırları değiştirmez.
- Videoya bağlı soru kaydı silinmez, yalnızca bağlantısı boşalır. Test.
- Hiç soru çözülmemiş konuda doğruluk oranı `null` olur (sıfıra bölme yok), sayfa "henüz soru yok" der. Test (sunucu + arayüz).
- Olmayan ders/konu adresi ya da konunun başka derse ait olması: sunucu `404`, sayfa anlaşılır mesaj gösterir. Test.
- Çözülen test sayısı toplamı aşamaz; "bitirdim" durumu geçersiz değerle verilemez. Test.
- Süslemeler, veri/grafik/form alanlarının üstüne binmez (dar ekranda gizlenir). Tarayıcıda ölçülerek doğrulanır.

---

# BÖLÜM 1: Kaynaklar (yalnızca test kitapları)

**Kararlar:**

- Yeni `resources` sütunları: `name`, `publisher` (yayınevi, boş olabilir), `subject_id`, `status` (`'elimde'` | `'bitirdim'`), `total_tests` (≥1), `solved_tests` (0..total). Eski `type`, `total_units`, `current_unit` kalkar.
- Video kaynakları geçişte silinir; onlara bağlı soru kayıtlarının `resource_id` değeri `NULL` olur (kayıtlar kalır).
- Eski kitapların `total_units → total_tests`, `current_unit → solved_tests`; `current_unit = total_units` ise durum `bitirdim`, değilse `elimde`.
- Soru kaydı formunda kitap seçimi zaten var; yalnızca kitap etiketine yayınevi eklenir ve `bitirdim` kitaplar listeden çıkar (düzenlenen kaydın kendi kitabı hariç).

### Görev 1: Yedek ve şema geçişi

**Dosyalar:** Değiştir `server/src/db.js`; Test `server/tests/db.test.js`.

**Arayüzler:**

- Üretir: `openDb(filePath)` aynı imzayla; yeni veritabanında `user_version = 1`, eski veritabanında geçiş sonrası 1. Dosya veritabanı geçişe girmeden önce `<dosya>.yedek-YYYYMMDD-HHMMSS` kopyası alınır.

- [ ] **Adım 1: Elle yedek al.** `data/yedek/calisma-bolum1-oncesi.db` olarak kopyala, boyutunu kontrol et. Kullanıcıya yedeğin yolunu bildir.
- [ ] **Adım 2: Başarısız testler** (`db.test.js`, geçici dosya veritabanıyla, eski şemayı elle kurup `openDb` çağırarak): `eski kitap yeni sütunlara taşınır` (total_units 40, current_unit 12 → total_tests 40, solved_tests 12, status `elimde`); `tamamlanmış kitap bitirdim olur`; `video silinir ve bağlı soru kaydı kalır, resource_id null`; `kitaba bağlı soru kaydı aynı kitaba bağlı kalır`; `ikinci openDb veriyi değiştirmez`; `geçişten önce yedek dosyası oluşur`; `yeni bellek içi veritabanı doğrudan yeni şemayla kurulur`.
- [ ] **Adım 3: Çalıştır, hata aldığını doğrula.** `npm test -w server -- db` → FAIL.
- [ ] **Adım 4: Uygula.** `SCHEMA` yeni `resources` tanımını içerir. `migrate(db, filePath)`: `user_version < 1` ve `resources` tablosunda `type` sütunu varsa → yedek kopyası al, `PRAGMA foreign_keys = OFF`, tek işlemde `resources_new` oluştur, kitapları kopyala, videoya bağlı soru kayıtlarını `NULL` yap, eski tabloyu sil, yeniden adlandır, `PRAGMA foreign_key_check` boş olmalı, `user_version = 1`; sonra `foreign_keys = ON`. Yeni veritabanında `user_version = 1` doğrudan yazılır.
- [ ] **Adım 5: Testler geçer.** `npm test -w server -- db` → PASS.

### Görev 2: Kaynak ucu (sunucu)

**Dosyalar:** Değiştir `server/src/routes/resources.js`, `server/src/validation.js` (gerekirse); Test `server/tests/resources.test.js` (baştan yazılır).

**Arayüzler:** `GET/POST/PUT/DELETE /api/resources`. Gövde ve yanıt alanları: `{ id, name, publisher, subjectId, status, totalTests, solvedTests, progressPercent }`. `status ∈ {'elimde','bitirdim'}`. `publisher` en çok 100 karakter, boş olabilir. `totalTests` 1..10000. `solvedTests` 0..`totalTests`, verilmezse POST'ta 0, PUT'ta mevcut değer. `type` alanı artık yok (gönderilirse yok sayılır).

- [ ] **Adım 1: Başarısız testler:** `kitap oluşturulur ve ilerleme yüzdesi hesaplanır`; `status verilmezse elimde olur`; `geçersiz status 400`; `solvedTests totalTests'i aşarsa 400 ve Türkçe mesaj`; `olmayan ders 400`; `PUT solvedTests vermeden ad değişince ilerleme korunur`; `kitap silinince soru kaydı kalır, resource_id null`; `404`.
- [ ] **Adım 2:** Çalıştır, FAIL gör.
- [ ] **Adım 3:** `resources.js` yeni alanlarla yeniden yaz (`toResource`, `parseResourceBody`).
- [ ] **Adım 4:** `npm test -w server` tümü PASS.

### Görev 3: Kaynaklar sayfası (arayüz)

**Dosyalar:** Değiştir `client/src/pages/Resources.jsx`, `client/src/components/ResourceCard.jsx`, `client/src/index.css`.

- [ ] **Adım 1:** Form: kitap adı, yayınevi, ders, toplam test. Tür seçimi kalkar. Metinler "kitap/test" diline çevrilir.
- [ ] **Adım 2:** Kart: ad, yayınevi, ders, `X / Y test` ve ilerleme çubuğu, "Çözülen test" alanı + Kaydet, durum rozeti (`Elimde` / `Bitirdim`) ve tek tıkla durum değiştirme (Bitirdim'e geçerken çözülen test = toplam yapılır). Listede iki bölüm: **Elimde** ve **Bitirdim**.
- [ ] **Adım 3:** `Questions.jsx`: kitap seçeneği etiketi `Ad (Yayınevi)`, `bitirdim` kitaplar dışarıda (düzenlenen kaydın kendi kitabı hariç).
- [ ] **Adım 4:** `npm test`, tarayıcıda: kitap ekle / çözülen test güncelle / bitirdim yap / sil, soru kaydında kitap seç. Mobil genişlikte bak.

### Görev 4: Video izlerini temizle

**Dosyalar:** `README.md`, `CLAUDE.md`, `client` ve `server` içinde `video` geçen her yer (`grep -rni video`).

- [ ] **Adım 1:** `grep` ile kalan "video" ifadelerini bul ve kaldır/güncelle; README'deki kaynaklar bölümü, API tablosu ve ekran görüntüsü (`kaynaklar.png`) yenilenir.
- [ ] **Adım 2:** `npm test` tümü PASS, `npm start` ile gerçek veritabanıyla açılıp eski kitapların göründüğü doğrulanır.

### >>> BÖLÜM 1 SONU: DUR. Kullanıcıya test etmesini söyle, onayını al, sonra commit at.

---

# BÖLÜM 2: İlerleme (özet → ders → konu)

**Kararlar:**

- Adresler: `#/ilerleme`, `#/ilerleme/ders/:subjectId`, `#/ilerleme/ders/:subjectId/konu/:topicId`.
- **Doğruluk oranı** = `doğru / (doğru + yanlış + boş)`, yüzde (tam sayıya yuvarlı); soru yoksa `null`.
- **Zayıf → güçlü sıralama:** doğruluk oranı artan; hiç soru çözülmemiş konular listenin sonunda "henüz soru yok" notuyla. Eşitlikte çok soru çözülen önce. Her satırda çözülen soru sayısı görünür (az sayıdan çıkan yanıltıcı oranı fark etmek için).
- Ana sayfada mevcut tarih aralığı süzgeci ve beş grafik **korunur**; üstüne dört göstergeli özet ve ders listesi eklenir. Ders sayfası aynı aralık süzgecini ve ilgili grafikleri kullanır. Konu sayfası tüm zamanı gösterir.

### Görev 5: Doğruluk ve konu istatistikleri (sunucu)

**Dosyalar:** Değiştir `server/src/stats.js`, `server/src/routes/stats.js`; Test `server/tests/stats.test.js`.

**Arayüzler:**

- `accuracyOf(correct, wrong, blank): number | null`
- `subjectStats` satırlarına `accuracy` eklenir.
- `topicStats(db, { subjectId, from, to })` → `[{ topicId, topicName, totalSeconds, correct, wrong, blank, net, accuracy }]` (dersin tüm konuları, verisizler sıfırla).
- `topicDetail(db, topicId)` → `{ topicId, topicName, subjectId, subjectName, examType, totalSeconds, correct, wrong, blank, net, accuracy, lastStudiedAt: 'YYYY-MM-DD' | null, books: [{ resourceId | null, name, publisher, correct, wrong, blank }], daily: [{ date, correct, wrong, blank, accuracy }] }` (`books` içinde kitapsız kayıtlar `resourceId: null`, ad "Kitapsız"; `lastStudiedAt` çalışma ve soru kaydı tarihlerinin en yenisi, yerel gün).
- Uçlar: `GET /api/stats/by-topic?subjectId=&from=&to=`, `GET /api/stats/topic/:id`.

- [ ] **Adım 1: Başarısız testler:** `accuracyOf` (3 doğru 1 yanlış 0 boş → 75; hepsi 0 → null); `by-topic her konuyu döner, verisiz konu accuracy null`; `by-topic yerel gün sınırına uyar`; `topic detayı toplamları, kitap kırılımını ve son çalışma tarihini verir`; `kitapsız kayıtlar Kitapsız altında toplanır`; `olmayan konu 404`; `by-topic eksik/geçersiz subjectId 400`.
- [ ] **Adım 2:** FAIL gör. **Adım 3:** Uygula. **Adım 4:** `npm test -w server` PASS.

### Görev 6: Arayüz yardımcıları ve sıralama

**Dosyalar:** Oluştur `client/src/lib/topics.js`; Test `client/tests/topics.test.js`. Değiştir `client/src/lib/format.js` (`formatPercent`).

**Arayüzler:** `sortWeakestFirst(rows): rows` (kurallar yukarıda; girdiyi değiştirmez), `formatPercent(accuracy: number | null): string` (`75 → '%75'`, `null → '—'`).

- [ ] **Adım 1: Başarısız testler:** accuracy artan sıralanır; `null` olanlar sona; eşit oranda çok soru çözülen önce; girdi dizisi değişmez; boş dizi; `formatPercent(null)`.
- [ ] **Adım 2–4:** FAIL gör, uygula, PASS.

### Görev 7: Sayfa iskeleti, breadcrumb ve ana özet

**Dosyalar:** Oluştur `client/src/components/Breadcrumb.jsx`. Değiştir `client/src/App.jsx` (rotalar; `/ilerleme/*` menüde "İlerleme" aktif kalır), `client/src/pages/Progress.jsx`. Oluştur `client/src/pages/ProgressSubject.jsx`, `client/src/pages/ProgressTopic.jsx` (boş iskelet).

- [ ] **Adım 1:** `Breadcrumb({ items: [{ label, to? }] })`: son öğe bağlantısız, `aria-label="Konum"`, ayraç `›`.
- [ ] **Adım 2:** `Progress.jsx`: dört gösterge (süre, soru, net, doğruluk) + ders listesi (ad, süre, soru, net, doğruluk; satır bağlantısı ders sayfasına) + mevcut beş grafik.
- [ ] **Adım 3:** Tarayıcıda: ana sayfadan derse tıklama çalışır, tarayıcı geri tuşu çalışır.

### Görev 8: Ders sayfası

**Dosyalar:** `client/src/pages/ProgressSubject.jsx`, `client/src/components/ProgressCharts.jsx`.

- [ ] **Adım 1:** Breadcrumb `İlerleme › Matematik`. Aralık süzgeci, o dersin göstergeleri, günlük/haftalık süre ve net grafiği (mevcut bileşenler, `subjectId` süzgeciyle).
- [ ] **Adım 2:** Konu listesi: `sortWeakestFirst` ile; satırda konu adı, doğruluk çubuğu/yüzdesi, çözülen soru, süre; bağlantı konu sayfasına.
- [ ] **Adım 3:** Geçersiz ders adresi anlaşılır mesaj + İlerleme'ye dönüş bağlantısı. Boş durum: o derste kayıt yoksa yönlendirici metin.

### Görev 9: Konu sayfası

**Dosyalar:** `client/src/pages/ProgressTopic.jsx`, `client/src/components/ProgressCharts.jsx` (`NetLine`, değer seçicili genel `TrendLine`'a dönüştürülür; `NetLine` ince bir sarmalayıcı olarak kalır, `AccuracyLine` eklenir), `client/src/index.css`.

- [ ] **Adım 1:** Breadcrumb `İlerleme › Matematik › Türev`. Göstergeler: toplam çalışma süresi, çözülen soru, net, doğruluk, son çalıştığı gün ("3 gün önce · 09.10.2026" biçimi, hiç yoksa "Henüz çalışılmadı").
- [ ] **Adım 2:** Doğru/yanlış/boş dağılımı (tek yığılmış çubuk, açıklamalı), zaman içinde doğruluk çizgi grafiği (en az 2 gün veri yoksa grafik yerine açıklama), "Hangi kitaplardan" listesi (kitap, yayınevi, çözülen soru, doğruluk).
- [ ] **Adım 3:** Konu başka derse aitse ya da yoksa mesaj. Hiç soru yoksa doğruluk `—`.
- [ ] **Adım 4:** `npm test` PASS; tarayıcıda üç katmanı gez, breadcrumb bağlantılarını dene, mobil genişlikte bak. README ve ekran görüntüleri güncellenir.

### >>> BÖLÜM 2 SONU: DUR. Kullanıcıya test etmesini söyle, onayını al, sonra commit at.

---

# BÖLÜM 3: Tasarım (font ve el çizimi süslemeler)

### Görev 10: Font seçimi (kullanıcı kararı gerekir)

- [ ] **Adım 1:** `frontend-design` skill'i yüklenir. Kullanıcıya 2–3 eşleşme sunulur ve biri seçtirilir (öneriler: **A** Fraunces başlık + Figtree metin; **B** Bricolage Grotesque başlık + Literata metin; **C** Young Serif başlık + Hanken Grotesk metin). Seçilmeden kod yazılmaz.
- [ ] **Adım 2:** Seçilen fontların `@fontsource-variable/*` paketleri kurulur, `main.jsx` importları ve `--font-display` / `--font-ui` güncellenir, eski font paketleri kaldırılır.
- [ ] **Adım 3 (internetsiz doğrulama):** `npm run build` sonrası `dist` içinde `woff2` dosyaları var; `grep -r "fonts.googleapis" client/dist` boş; tarayıcıda ağ istekleri listesinde dış alan adı yok.

### Görev 11: Çizim seti

**Dosyalar:** Oluştur `client/src/components/Doodles.jsx`, `client/src/index.css`.

**Arayüzler:** Küçük çizimler: `Book, Pencil, Ruler, Coffee, Paperclip, Note` (hepsi `({ size = 72 })`, `viewBox 0 0 64 64`). Büyük boş durum çizimleri: `EmptyBook, EmptyNote, EmptyChart` (`viewBox 0 0 160 120`). Ortak kurallar: tek renk (`currentColor` = `--doodle`), `stroke-width: 1.5` ve `vector-effect: non-scaling-stroke` (boyuttan bağımsız aynı kalınlık), yuvarlak uçlar, dolgu yok, hafif elle çizilmiş eğrilik, `aria-hidden`.

- [ ] **Adım 1:** 6 küçük + 3 büyük çizim yazılır; hepsi aynı çizgi dili.
- [ ] **Adım 2:** Geçici bir önizleme sayfasında (`#/cizimler`, iş bitince silinir) yan yana bakılır; tutarlılık kontrol edilir.

### Görev 12: Süslemelerin yerleşimi

**Dosyalar:** Oluştur `client/src/components/Decor.jsx`; Değiştir `client/src/App.jsx`, `client/src/index.css`.

**Arayüzler:** `Decor({ items: [{ Doodle, corner: 'tr' | 'br' | 'bl', size, rotate }] })`. Süsler `position: fixed`, `pointer-events: none`, `aria-hidden`, `z-index: 0`; yalnızca içerik kutusunun dışındaki boş kenar boşluklarına konur. İçerik alanı yeterince geniş değilse (boş kenar < 160px) süs **gizlenir**. Opaklık `0.14`. Sayfaya göre çizim eşlemesi: Ana sayfa kahve + kalem; Pomodoro kahve; Günlük not + ataç; Soru kaydı kalem + cetvel; Kaynaklar kitap; Konular cetvel; İlerleme kalem.

- [ ] **Adım 1:** `Decor` ve CSS yazılır (boş kenar genişliği CSS ile hesaplanır, eşik altında `display: none`).
- [ ] **Adım 2 (çakışma testi):** Playwright ile 1280, 1440, 1920, 1000 ve 390 genişliğinde her sayfada, süslerin `getBoundingClientRect()` kutuları ile `.page` içindeki `h1, form, .list, .chart-card, .tile, table, .kpis` kutuları kesişmiyor mu denetlenir; sonuç raporlanır.

### Görev 13: Boş durumlar

**Dosyalar:** Oluştur `client/src/components/EmptyState.jsx`; Değiştir `Resources.jsx`, `Questions.jsx`, `StudyLog.jsx`, `ChartCard.jsx`, `Progress*.jsx`.

**Arayüzler:** `EmptyState({ Doodle, title, hint, action? })`: büyük çizim (opaklık 0.3), kısa başlık, tek cümle yönlendirme, isteğe bağlı bağlantı/düğme.

- [ ] **Adım 1:** "Henüz kaynak yok", "Bugün kayıt yok", "Bu aralıkta kayıt yok", "Henüz soru yok" gibi tüm boş durumlar `EmptyState` kullanır (metinler eylem yönlendirir: "İlk kitabını ekle").
- [ ] **Adım 2:** `npm test`; tarayıcıda boş veritabanıyla her sayfa gezilir; tüm sayfalarda masaüstü + mobil ekran görüntüsü kontrol edilir; README ve ekran görüntüleri güncellenir.

### >>> BÖLÜM 3 SONU: DUR. Kullanıcıya test etmesini söyle, onayını al, sonra commit at.
