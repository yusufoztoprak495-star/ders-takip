# Veri Kaybı Önlemleri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tarayıcı verisinin silinmesine karşı kalıcı depolama izni, indir/yükle yedeği, haftalık hatırlatma ve klasöre günlük otomatik yedek eklemek.

**Architecture:** Saf mantık (`lib/persistence.js`, `lib/backup.js`) ve klasör işlemleri (`data/backupFolder.js`, sahte klasörle test edilir) arayüzden ayrıdır. Yedek doğrulaması veri katmanındadır (`replaceAll`). Klasör yedeğinin durumu bir React context'inde (`BackupProvider`) tutulur; Ayarlar ve Ana sayfa onu okur.

**Tech Stack:** React 19, Vite, HashRouter, Vitest, tarayıcı API'leri (`navigator.storage.persist`, File System Access API). Yeni bağımlılık yok.

**Spec:** `docs/superpowers/specs/2026-10-13-veri-kaybi-onlemleri-design.md`

## Global Constraints

- Yeni bağımlılık eklenmez (fake-indexeddb dahil); `ders-takip` IndexedDB sürümü 1 kalır, klasör tutamacı ayrı `ders-takip-ayar` veri tabanında durur.
- Yedek dosya adı `yedek-YYYY-AA-GG.json` (yerel gün); en yeni **14** yedek tutulur; desene uymayan dosyalara dokunulmaz.
- Hatırlatma eşiği **7 gün**.
- Yorumlar Türkçe, kullanıcıya görünen metinler Türkçe, isimler İngilizce olabilir.
- Doğrulama veri katmanındadır (`HttpError(400, ...)`, Türkçe mesaj); arayüz yalnızca kolaylıktır.
- `localStorage` her okuma/yazmada `try/catch` içindedir.
- Önce başarısız test; her görev sonunda `npm test` yeşil, ayrı commit. Commit mesajı sonuna `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` eklenir.
- Komutlar proje kökünden çalışır (`npm test`, `npm run dev`).

## Review Focus

- Bozuk/yanlış şekilli yedek dosyası (JSON olmayan metin, dizi, boş nesne, tablosu dizi olmayan nesne) yüklenirse reddedilir ve mevcut veriye dokunulmaz (Görev 2).
- Gece 00:30 yerel saatte yedek adı UTC'ye göre değil yerel güne göre üretilir (Görev 2).
- `localStorage` erişilemezse son yedek tarihi okunamaz; hatırlatma uygulamayı bozmadan "yedek yok" gibi davranır (Görev 3).
- Klasörde `yedek-notlar.json`, `yedek-2026-10-13.json.bak` gibi desene uymayan dosyalar silinmez (Görev 4).
- Bugünün yedeği yazılamazsa (disk dolu) hiçbir eski yedek silinmez (Görev 4).

---

## Dosya yapısı

- Create `client/src/lib/persistence.js`: kalıcı depolama isteği ve durum yazısı (saf).
- Create `client/src/lib/backup.js`: dosya adı, döndürme, hatırlatma, son yedek tarihi (saf, `localStorage` hariç).
- Modify `client/src/data/validation.js`, `client/src/data/database.js`: yedek doğrulaması ve `replaceAll` bağlantısı.
- Create `client/src/data/backupFolder.js`: klasör tutamacı deposu, izin, günlük yedek.
- Create `client/src/context/BackupContext.jsx`: klasör yedeği durumu ve eylemleri.
- Create `client/src/pages/Settings.jsx`, `client/src/components/BackupReminder.jsx`.
- Modify `client/src/App.jsx`, `client/src/pages/Home.jsx`, `client/src/components/Icons.jsx`, `README.md`.
- Tests: `client/tests/persistence.test.js`, `client/tests/backup.test.js`, `client/tests/data/backup-validation.test.js`, `client/tests/data/backup-folder.test.js`.

---

### Görev 1: Ayarlar sayfası + kalıcı depolama

**Files:**

- Create: `client/src/lib/persistence.js`, `client/src/pages/Settings.jsx`
- Modify: `client/src/App.jsx` (NAV_ITEMS'a `/ayarlar` satırı, `<Route>`, açılışta istek), `client/src/components/Icons.jsx` (`SettingsIcon`, mevcut ikonların stilinde)
- Test: `client/tests/persistence.test.js`

**Interfaces:**

- Produces: `requestPersistence(storage = globalThis.navigator?.storage): Promise<"granted"|"denied"|"unsupported">`; `persistenceLabel(status: "checking"|"granted"|"denied"|"unsupported"): string`.

- [ ] **Step 1: Başarısız testleri yaz** (`persistence.test.js`, sahte `storage` nesneleriyle):
  - `persisted()` true dönerse `persist` çağrılmaz, sonuç `"granted"`.
  - `persisted()` false, `persist()` true → `"granted"`; `persist()` false → `"denied"`.
  - `storage` undefined ya da `persist` fonksiyonu yok → `"unsupported"`.
  - `persist()` hata fırlatırsa `"denied"` (çökmez).
  - `persistenceLabel("granted")` `"Kalıcı: Evet"`, `"denied"` `"Kalıcı: Hayır (tarayıcı izin vermedi)"`, `"unsupported"` `"Bu tarayıcı desteklemiyor"`, `"checking"` `"Denetleniyor…"`.
- [ ] **Step 2:** `npx vitest run client/tests/persistence.test.js` → FAIL (modül yok).
- [ ] **Step 3: `persistence.js`'i yaz** (imzalar yukarıda; hatalar `"denied"` olur).
- [ ] **Step 4:** Aynı komut → PASS.
- [ ] **Step 5: `Settings.jsx` iskeleti ve bağlantılar.** Sayfa `<h1>Ayarlar</h1>` ve "Veri güvenliği" panelinde `persistenceLabel` yazısını gösterir (mevcut `panel` / `panel-label` sınıfları, diğer sayfalar gibi). `App.jsx`: `useEffect` ile açılışta bir kez `requestPersistence()` çağrılır; Settings kendi içinde `requestPersistence()` ile durumu okuyup state'e koyar. Menü: `{ to: '/ayarlar', label: 'Ayarlar', short: 'Ayarlar', Icon: SettingsIcon }`.
- [ ] **Step 6: Doğrula.** `npm test` yeşil; `npm run dev` ile `/#/ayarlar` açılır, durum yazısı görünür, menü ve mobil dar genişlikte düzen bozulmaz (tarayıcıda gerçekten bak).
- [ ] **Step 7: Commit** `feat(ayarlar): Ayarlar sayfasi ve kalici depolama izni`

---

### Görev 2: Yedek mantığı ve veri katmanı doğrulaması

**Files:**

- Create: `client/src/lib/backup.js`
- Modify: `client/src/data/validation.js` (yeni `parseBackupText`), `client/src/data/database.js` (`replaceAll` doğrular)
- Test: `client/tests/backup.test.js`, `client/tests/data/backup-validation.test.js`

**Interfaces:**

- Consumes: `toLocalDateString(date)` (`lib/dates.js`), `HttpError(status, message)`, `emptyState()`.
- Produces (`lib/backup.js`): `BACKUP_KEEP = 14`; `REMINDER_DAYS = 7`; `backupFileName(date: Date): string`; `isBackupFileName(name: string): boolean`; `hasBackupForDay(names: string[], date: Date): boolean`; `namesToDelete(names: string[], keep = BACKUP_KEEP): string[]`; `needsReminder(lastBackupIso: string|null, now = new Date()): boolean`.
- Produces (`validation.js`): `parseBackupText(text: string): object` (yalnızca bilinen beş tabloyu içeren ve hepsi dizi olan durum nesnesi; geçersizse `HttpError(400, "Yedek dosyası geçersiz: ...")`); `validateBackup(data: unknown): object` (aynı kural, nesne alır). `replaceAll(data)` içinde `validateBackup` çağrılır ve yanlış veride depoya yazmadan hata fırlatır.

- [ ] **Step 1: Başarısız testleri yaz.**
  - `backup.test.js`: `backupFileName(new Date(2026, 9, 13, 0, 30))` → `"yedek-2026-10-13.json"` (yerel gün, UTC değil); `isBackupFileName` `"yedek-2026-10-13.json"` için true, `"yedek-notlar.json"`, `"yedek-2026-10-13.json.bak"`, `"yedek-2026-13-45.json"` için false; `hasBackupForDay` bugünün adı listede varsa true, yoksa false; `namesToDelete` 16 geçerli ad + `"notlar.txt"` verince en eski 2 geçerli adı döndürür ve `"notlar.txt"`'i döndürmez; 14 ya da daha azında `[]`; `needsReminder(null)` true, 6 gün önce false, 8 gün önce true, geçersiz metin (`"abc"`) true.
  - `backup-validation.test.js`: `parseBackupText` şunları 400 ile reddeder: `"{bozuk"`, `"[]"`, `"{}"`, `'{"subjects":"x"}'`, `"null"`; geçerli `JSON.stringify(emptyState())` kabul edilir; bilinmeyen alanlar (`{"subjects":[],"foo":1}`) çıktıdan atılır. `replaceAll` geçersiz veride reddeder **ve** `snapshot()` önceki veriyle aynı kalır (`makeTestApp` ile).
- [ ] **Step 2:** `npx vitest run client/tests/backup.test.js client/tests/data/backup-validation.test.js` → FAIL.
- [ ] **Step 3: `lib/backup.js`'i yaz.** Ad deseni `^yedek-(\d{4})-(\d{2})-(\d{2})\.json$` ve ay/gün aralığı kontrolü; sıralama ad üzerinden (tarih sıralı olduğu için metin sırası yeterli).
- [ ] **Step 4: `validateBackup` / `parseBackupText` ve `replaceAll` bağlantısını yaz** (mevcut `requireBody` ile aynı mesaj üslubu).
- [ ] **Step 5:** Aynı komut → PASS; ardından `npm test` tümü yeşil.
- [ ] **Step 6: Commit** `feat(yedek): yedek dosya adi, dondurme, hatirlatma mantigi ve yedek dogrulamasi`

---

### Görev 3: Yedeği indir / yükle + haftalık hatırlatma

**Files:**

- Modify: `client/src/lib/backup.js` (`readLastBackup`, `writeLastBackup`), `client/src/pages/Settings.jsx`, `client/src/pages/Home.jsx`
- Create: `client/src/components/BackupReminder.jsx`
- Test: `client/tests/backup.test.js` (ek)

**Interfaces:**

- Consumes: Görev 2'nin `backupFileName`, `needsReminder`, `parseBackupText`; `getDatabase()` (`api.js`) → `snapshot()`, `replaceAll()`.
- Produces: `LAST_BACKUP_KEY = "ders-takip-son-yedek"`; `readLastBackup(): string|null` (hata/yoksa null); `writeLastBackup(date = new Date()): void` (ISO metin yazar, hata yutulur).

- [ ] **Step 1: Başarısız testleri yaz.** `localStorage`'ı `vi.stubGlobal` ile sahtele: yazılan değer `readLastBackup()` ile geri okunur; `getItem` fırlatan bir `localStorage` ile `readLastBackup()` `null` döner ve `writeLastBackup()` fırlatmaz.
- [ ] **Step 2:** `npx vitest run client/tests/backup.test.js` → FAIL.
- [ ] **Step 3: `readLastBackup` / `writeLastBackup`'ı yaz** (`useTheme.js`'teki `try/catch` üslubu).
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5: Ayarlar'a "Yedekleme" paneli ekle.**
  - "Yedeği indir": `snapshot()` → `Blob` (JSON, `application/json`) → geçici `<a download={backupFileName(new Date())}>` ile indirir; başarıda `writeLastBackup()`.
  - "Yedekten yükle": `<input type="file" accept=".json,application/json">`; dosya `text()` ile okunur, `parseBackupText` ile doğrulanır, `window.confirm("Mevcut verilerin yerine geçecek. Devam edilsin mi?")` sonrası `replaceAll`, ardından `window.location.reload()`. `HttpError` mesajı `ErrorBanner` ile gösterilir.
  - "Son yedek" satırı `readLastBackup()` tarihini (yoksa "Henüz yedek alınmadı") gösterir.
- [ ] **Step 6: `BackupReminder.jsx`** `needsReminder(readLastBackup())` ise "Son yedeğin 7 günden eski (ya da hiç yok) — Ayarlar'dan yedek al" uyarısını `Link to="/ayarlar"` ile gösterir, değilse null döner; Ana sayfada başlığın altına konur.
- [ ] **Step 7: Doğrula (tarayıcıda).** İndir → dosya iner ve içeriği JSON; birkaç kayıt ekle, indir, kaydı sil, yükle → kayıt geri gelir; `{"a":1}` içeren dosya reddedilir ve veri değişmez; yedek alınınca Ana sayfadaki uyarı kaybolur.
- [ ] **Step 8: Commit** `feat(yedek): yedegi indir/yukle ve haftalik hatirlatma`

---

### Görev 4: Klasör yedeği mantığı

**Files:**

- Create: `client/src/data/backupFolder.js`
- Test: `client/tests/data/backup-folder.test.js`

**Interfaces:**

- Consumes: Görev 2'nin `backupFileName`, `isBackupFileName`, `hasBackupForDay`, `namesToDelete`.
- Produces:
  - `runDailyBackup(dir, getSnapshot: () => Promise<object>, now = new Date()): Promise<{ status: "written"|"skipped", deleted: string[] }>`. `dir` şu yüzeyi kullanır: `dir.keys()` (async iterator, ad), `dir.getFileHandle(name, {create:true})` → `{ createWritable() → { write(text), close() } }`, `dir.removeEntry(name)`. Bugünün yedeği varsa `"skipped"` (yine de döndürme yapılmaz). Önce bugünün dosyası yazılır, **başarılı olursa** `namesToDelete` ile eskiler silinir; yazma hata verirse hata yukarı fırlar ve hiçbir şey silinmez.
  - `getFolderPermission(handle, request = false): Promise<"granted"|"prompt"|"denied">` (`queryPermission({mode:"readwrite"})`; `request` true ise `requestPermission`).
  - `saveFolderHandle(handle)`, `loadFolderHandle(): Promise<handle|null>`, `clearFolderHandle()` (ayrı `ders-takip-ayar` IndexedDB'si, depo `ayar`, anahtar `yedekKlasoru`; hata olursa `loadFolderHandle` null döner).
  - `backupIfDue({ loadHandle, getSnapshot, now, markBackedUp, requestPermission = false }): Promise<{ status: "no-folder"|"needs-permission"|"skipped"|"written"|"error", message?: string }>`; "written" ve "skipped" durumunda `markBackedUp()` çağrılır (bugünün yedeği hazır demektir).

- [ ] **Step 1: Başarısız testleri yaz** (bellek içi sahte klasör: ad→metin `Map`, yukarıdaki yüzeyi uygular; yazma hatası için `failWrite` bayrağı):
  - Klasör boşken `runDailyBackup` bugünün adıyla dosyayı yazar, içeriği `JSON.stringify` edilmiş snapshot'tır, sonuç `"written"`.
  - Bugünün dosyası varsa `getSnapshot` çağrılmaz, sonuç `"skipped"`.
  - Klasörde 14 eski + yeni yazılan = 15 yedek varsa en eskisi silinir; `deleted` onu içerir.
  - `yedek-notlar.json`, `yedek-2026-10-13.json.bak`, `foto.png` hiç silinmez (Review Focus).
  - `failWrite` açıkken `runDailyBackup` reddeder ve klasördeki eski yedekler olduğu gibi kalır (Review Focus).
  - `backupIfDue`: `loadHandle` null → `"no-folder"`; izin `"prompt"` ve `requestPermission` false → `"needs-permission"` ve `markBackedUp` çağrılmaz; izin verilmişse `"written"` ve `markBackedUp` bir kez çağrılır; yazma hatasında `"error"` ve `message` Türkçe dolu.
- [ ] **Step 2:** `npx vitest run client/tests/data/backup-folder.test.js` → FAIL.
- [ ] **Step 3: `backupFolder.js`'i yaz.** Tutamaç deposu `indexedDB` ile ince tutulur (node'da test edilmez; Görev 5'te elle denenir). `backupIfDue` hataları yakalayıp `{status:"error", message}` döner, fırlatmaz.
- [ ] **Step 4:** Test → PASS; `npm test` tümü yeşil.
- [ ] **Step 5: Commit** `feat(yedek): klasore gunluk yedek ve son 14'u tutma mantigi`

---

### Görev 5: Klasör yedeği arayüzü, açılış tetikleyicisi ve README

**Files:**

- Create: `client/src/context/BackupContext.jsx`
- Modify: `client/src/App.jsx` (`BackupProvider` sarmalı), `client/src/pages/Settings.jsx`, `client/src/components/BackupReminder.jsx`, `README.md` ("Veriler ve yedekleme" bölümü ve Özellikler)

**Interfaces:**

- Consumes: Görev 4'ün `backupIfDue`, `saveFolderHandle`, `loadFolderHandle`, `clearFolderHandle`, `getFolderPermission`; Görev 3'ün `writeLastBackup`.
- Produces: `useBackup(): { supported: boolean, status: "idle"|"no-folder"|"needs-permission"|"ok"|"error", message: string|null, folderName: string|null, pickFolder(): Promise<void>, resume(): Promise<void>, removeFolder(): Promise<void> }`; `BackupProvider({children})`.

- [ ] **Step 1: `BackupContext.jsx`'i yaz.** `supported = typeof window.showDirectoryPicker === "function"`. Desteklenmiyorsa hiçbir şey çalışmaz (`status: "idle"`). Açılışta bir kez `backupIfDue({ ..., getSnapshot: () => getDatabase().snapshot(), markBackedUp: writeLastBackup })` çalışır. `pickFolder`: `showDirectoryPicker({ mode: "readwrite" })` → `saveFolderHandle` → hemen `backupIfDue` (`requestPermission: true`); kullanıcı seçimi iptal ederse (`AbortError`) sessizce çıkar. `resume`: `backupIfDue({ requestPermission: true })`. `removeFolder`: `clearFolderHandle()`, durum `"no-folder"`.
- [ ] **Step 2: `Settings.jsx`'e "Yedek klasörü" bölümü** (yalnızca `supported` ise): klasör adı (`folderName`), durum yazısı, "Yedek klasörü seç" / "Klasörü kaldır" düğmeleri, `status === "needs-permission"` ise "Yedeklemeyi sürdür", `error` ise `ErrorBanner`. Desteklenmiyorsa kısa not: "Bu tarayıcı klasöre yedeklemeyi desteklemiyor; yukarıdaki indirme yolunu kullan."
- [ ] **Step 3: `BackupReminder.jsx`'e `needs-permission` dalı**: klasör seçiliyken izin düşmüşse "Yedeklemeyi sürdür" düğmesi (`resume`).
- [ ] **Step 4: Elle doğrulama (Chrome/Edge, `npm run dev`).** (a) Klasör seç → anında `yedek-<bugün>.json` oluşur, içi geçerli JSON. (b) Sayfayı yenile → ikinci dosya oluşmaz. (c) Klasöre 15 sahte `yedek-2026-09-XX.json` + `notlar.txt` koy, yenile ve gün değiştirmek için bugünün dosyasını sil → yalnız en yeni 14 yedek kalır, `notlar.txt` durur. (d) Tarayıcıyı kapatıp aç: izin düştüyse "Yedeklemeyi sürdür" çıkar ve tıklayınca yedek yazılır. (e) Klasörü sil → Ayarlar'da Türkçe hata, uygulama çalışmaya devam eder. (f) Firefox'ta (destek yok) klasör bölümü gizli, indir/yükle çalışır. Gerçek sonucu olduğu gibi bildir.
- [ ] **Step 5: README'yi güncelle**: yedekleme özellikleri, tarayıcı desteği (klasör yedeği yalnızca Chromium tabanlı masaüstü tarayıcılarda), "tarayıcı verisi silinirse kaybolur" uyarısı ve kalıcı depolama notu.
- [ ] **Step 6:** `npm test` ve `npm run build` yeşil.
- [ ] **Step 7: Commit** `feat(yedek): yedek klasoru secimi, acilista gunluk yedek, README`
