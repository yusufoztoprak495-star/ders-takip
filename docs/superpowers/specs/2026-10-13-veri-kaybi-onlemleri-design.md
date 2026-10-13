# Veri Kaybı Önlemleri — Tasarım

Tarih: 2026-10-13

## Amaç ve kapsam

Veriler tarayıcının IndexedDB'sinde durduğu için tarayıcı veriyi silerse (disk dolması, site verilerinin temizlenmesi) tüm çalışma kayıtları kaybolur. Bu iş iki önlem ekler: kalıcı depolama izni ve otomatik yedek.

**Başarı ölçütü:**

- Ayarlar sayfasında kalıcı depolama izninin durumu görünür.
- Bilgisayarda bir yedek klasörü seçilince, günün ilk açılışında o klasöre tarihli bir JSON yedeği yazılır ve son 14 yedek tutulur.
- Klasör yedeğini desteklemeyen tarayıcılarda (telefon gibi) "Yedeği indir" düğmesi ve haftalık hatırlatma çalışır.

**Kapsam dışı:** Bulut yedeği, şifreli yedek, yedeklerin birleştirilmesi (geri yükleme tüm veriyi değiştirir), yeni bağımlılık.

## Mevcut durum (koddan tespit)

- Ayarlar sayfası, "Yedeği indir" düğmesi ve hatırlatma **yoktur**; bu işte sıfırdan yapılır.
- `client/src/data/database.js` içinde hazır: `snapshot()` (tüm verinin kopyası) ve `replaceAll(data)` (doğrulayarak tüm veriyi değiştirir). Yedek dosyasının içeriği `snapshot()` çıktısıdır.
- `client/src/data/storage.js` ana veriyi `ders-takip` IndexedDB'sinde (sürüm 1) tek kayıt olarak tutar. Bu sürüm değiştirilmez.

## Adımlar

Her adım ayrı geliştirilir, test edilir ve ayrı commit'lenir (tek özellik kuralı).

### Adım 1 — Ayarlar sayfası + kalıcı depolama

- Menüye "Ayarlar" (`/ayarlar`) eklenir; rota `App.jsx`'e eklenir.
- Uygulama açılışında `navigator.storage.persist()` çağrılır (zaten izinliyse `persisted()` ile öğrenilir, tekrar istenmez).
- Ayarlar'da durum yazısı: "Kalıcı: Evet", "Kalıcı: Hayır (tarayıcı vermedi)" ya da "Bu tarayıcı desteklemiyor".
- Not: tarayıcı izni soruyla ya da sessizce verebilir ya da reddedebilir; uygulama yalnızca durumu gösterir.

### Adım 2 — Yedeği indir / yükle + haftalık hatırlatma

- **İndir:** `snapshot()` JSON olarak `yedek-YYYY-AA-GG.json` adıyla indirilir.
- **Yükle:** Seçilen dosya okunur, JSON ve şekil doğrulanır; geçerliyse onay sorulur (bu işlem mevcut verinin yerine geçer), sonra `replaceAll()` çağrılır. Geçersiz dosya Türkçe mesajla reddedilir, veriye dokunulmaz.
- **Son yedek tarihi** `localStorage`'da tutulur (indirme ya da klasör yedeği başarılı olunca güncellenir). Okuma/yazma `try/catch` içindedir; erişilemezse hatırlatma çalışmaz ama uygulama bozulmaz.
- **Hatırlatma:** Son yedek yoksa ya da 7 günden eskiyse Ana sayfada küçük bir uyarı ve Ayarlar'a bağlantı çıkar. Klasör yedeği etkin ve güncelse hatırlatma çıkmaz.

### Adım 3 — Klasöre otomatik yedek

- Ayarlar'da "Yedek klasörü seç" düğmesi (`window.showDirectoryPicker`, yalnızca destek varsa görünür). Seçilen klasörün tutamacı (`FileSystemDirectoryHandle`) ayrı bir IndexedDB'de (`ders-takip-ayar`) saklanır; ana veri tabanına dokunulmaz.
- **Günlük yedek:** Uygulama açılışında tutamaç okunur, izin `queryPermission` ile kontrol edilir. İzin varsa klasörde bugünün (yerel gün) `yedek-YYYY-AA-GG.json` dosyası aranır; yoksa yazılır.
- **Döndürme:** Klasörde adı `yedek-YYYY-AA-GG.json` desenine uyan dosyalar tarihe göre sıralanır; en yeni 14'ü kalır, eskileri silinir. Desene uymayan dosyalara dokunulmaz.
- **İzin düşmüşse:** Tarayıcı yeni oturumda klasör iznini kendiliğinden vermeyebilir ve izin ancak bir tıklamayla istenebilir. Bu durumda Ayarlar'da ve Ana sayfadaki hatırlatma alanında "Yedeklemeyi sürdür" düğmesi çıkar; tıklanınca `requestPermission` çağrılır, ardından günlük yedek çalışır.
- **Hata durumları:** Klasör silinmiş/taşınmış ya da yazma başarısız olursa hata Ayarlar'da Türkçe mesajla gösterilir; uygulamanın geri kalanı etkilenmez ve eski indirme yolu çalışmaya devam eder. "Klasörü kaldır" düğmesi tutamacı siler.
- Destek yoksa bölüm gizlenir; adım 2'deki indirme ve hatırlatma yeterlidir.

## Kod yapısı

- `client/src/lib/backup.js` (saf fonksiyonlar): yedek dosya adı üretme (yerel gün), "bugünün yedeği var mı", "silinecek eski yedekleri seç" (14 sınırı), yedek dosyası doğrulama, hatırlatma gerekli mi.
- `client/src/data/backupFolder.js`: klasör tutamacını saklama/okuma (ayrı IndexedDB) ve tutamaç üzerinden yazma/listeleme/silme; tutamaç dışarıdan verilir, böylece sahte klasörle test edilir.
- `client/src/pages/Settings.jsx`: kalıcılık durumu, indir/yükle, klasör bölümü.
- Ana sayfada hatırlatma bileşeni; `App.jsx`'te açılışta persist isteği ve günlük yedek tetikleyicisi.
- Doğrulama kuralı: yedek dosyası doğrulaması veri katmanında (`replaceAll`/`normalize`) kalır; arayüz yalnızca kolaylıktır.

## Test

- Önce başarısız test: `lib/backup.js` fonksiyonları (ad üretme, yerel gün sınırı, 14 sınırı ve desene uymayan dosyaya dokunmama, hatırlatma eşiği).
- `backupFolder.js` sahte klasör tutamacıyla: yoksa yazar, varsa yazmaz, fazlayı siler, yazma hatasında hata döner.
- Sayfalar `npm run dev` ile gerçekten açılıp denenir (indirme, yükleme, klasör seçme). Tarayıcıdaki klasör iznini otomatik test edemeyiz; bu kısım elle denenir ve sonucu dürüstçe bildirilir.
- README'ye yedekleme özellikleri ve tarayıcı desteği notu eklenir.
