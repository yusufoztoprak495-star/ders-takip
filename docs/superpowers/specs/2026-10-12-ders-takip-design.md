# Ders Çalışma Takip Uygulaması — Tasarım

Tarih: 2026-10-12

## Amaç ve kapsam

YKS (sayısal) hazırlığında kendi çalışmamı takip etmek için kişisel bir uygulama. Aynı zamanda GitHub'da portfolyo projesi olarak durur. Tek kullanıcı, bilgisayarda kullanım, mağazalarda yayınlanmayacak.

**Başarı ölçütü:** Günlük gerçekten kullanılabilen, kodu anlaşılıp anlatılabilen, çalışan bir uygulama. Başka biri projeyi indirip `npm install` + `npm start` ile kendi bilgisayarında çalıştırabilmeli.

**Öğrenme hedefi:** Web geliştirme (HTML/CSS/JS, React, Node.js). Kullanıcı C#/Java, Python ve temel web bilgisine sahip, kodlamaya yeni başlıyor.

**Özellikler:**

- Pomodoro zamanlayıcı
- Günlük çalışma süresi kaydı (ders/konu bazında)
- Çözülen soru sayısı kaydı (doğru/yanlış/boş)
- Kaynak ve video takibi (nerede kaldım)
- Grafiklerle ilerleme takibi (günlük, haftalık, ders bazında)

**Kapsam dışı:** PDF'ten soru üretme (ileride). Şimdi bu yönde kod, altyapı ya da bağımlılık eklenmez. Kullanıcı hesabı, mobil arayüz, canlı demo/yayınlama da kapsam dışı.

## Genel yapı

```
Tarayıcı (arayüz)  ⇄  Yerel sunucu (API)  ⇄  SQLite dosyası
   React + Vite         Node.js + Express      calisma.db
```

- **Arayüz:** React + Vite. Grafikler için Chart.js (React sarmalayıcısıyla).
- **Sunucu:** Node.js + Express. İstekleri doğrular, veritabanıyla konuşur. Gizli anahtarlar (ileride) yalnızca burada `.env` içinde durur.
- **Veritabanı:** Tek SQLite dosyası. Yedekleme dosyayı kopyalamakla olur.
- **Çalıştırma:** `npm install`, `npm start`, tarayıcıda `localhost` adresi.

## Veri modeli

1. **subjects:** Dersler. Alanlar: ad, sınav türü (TYT/AYT). Örnek: Matematik (TYT), Fizik (AYT).
2. **topics:** Konular. Alanlar: ders, ad. Her konu bir derse bağlıdır.
3. **study_sessions:** Çalışma kayıtları. Alanlar: ders, konu (isteğe bağlı), başlangıç zamanı, süre (saniye), giriş türü (pomodoro/elle).
4. **question_logs:** Soru kayıtları. Alanlar: tarih, ders, konu, doğru, yanlış, boş, kaynak (isteğe bağlı). Net kayıtta tutulmaz, hesaplanır.
5. **resources:** Kitap/video setleri. Alanlar: ad, tür, ders, toplam birim sayısı, mevcut birim ("kaldığım yer"). İlerleme yüzdesi hesaplanır.

**İlk kurulumda hazır veri:** YKS sayısal ders ve konu listesi (TYT/AYT) otomatik yüklenir. Kullanıcı sonradan düzenleyebilir.

**Doğrulama kuralları:** Doğru/yanlış/boş negatif olamaz. Süre sıfırdan büyük olmalı. Ders zorunlu. Tarih geçerli olmalı.

**Bilerek yok (YAGNI):** Kullanıcı tablosu, Pomodoro ayar tablosu (süreler tarayıcıda saklanır), kaynak ilerleme geçmişi.

## Ekranlar

1. **Pomodoro:** Ders (+ isteğe bağlı konu) seçilir, sayaç çalışır. Çalışma bitince süre otomatik kaydedilir. Mola süresi kaydedilmez.
2. **Çalışma günlüğü:** Elle süre ekleme ve bugünün kayıt listesi.
3. **Soru kaydı:** Ders, konu, doğru/yanlış/boş girişi. Son kayıtlar, düzenleme ve silme.
4. **Kaynaklar:** Kitap/video listesi, ilerleme çubuğu, "kaldığım yer" alanı.
5. **İlerleme:** Günlük ve haftalık çalışma süresi, ders bazında süre dağılımı, ders bazında doğru/yanlış/boş ve net değişimi.

## Sunucu uçları (REST)

```
GET/POST/PUT/DELETE  /api/sessions
GET/POST/PUT/DELETE  /api/questions
GET/POST/PUT/DELETE  /api/resources
GET                  /api/subjects  (konularla birlikte)
GET                  /api/stats/daily?from=&to=
GET                  /api/stats/by-subject?from=&to=
```

`stats` uçları grafik verisini sunucuda hesaplayıp hazır döner.

**Pomodoro süre hesabı:** Sayaç tarayıcıda çalışır ve sunucuya yalnızca bittiğinde kayıt gönderir. Arka plandaki sekmelerde tarayıcı sayaçları yavaşlatabildiği için kalan süre "başlangıç zamanından beri geçen süre" olarak hesaplanır, saniye sayarak değil.

## Hata yönetimi

- Sunucu her ekleme/güncellemede veriyi doğrular. Geçersizse `400` ve Türkçe hata mesajı döner. Güvence sunucudadır, arayüz kontrolleri yalnızca kolaylıktır.
- Olmayan kayıt için `404`.
- Beklenmeyen hatada sunucu çökmez, hatayı konsola yazar ve arayüze genel bir mesaj yollar. İç ayrıntı arayüze sızmaz.
- Arayüz, başarısız istekte kullanıcıya uyarı gösterir. Pomodoro bitişinde kayıt başarısız olursa süre ekranda kalır ve yeniden denenebilir (veri kaybı olmasın diye).
- `.env` dosyası ayarlar için hazırdır ve `.gitignore`'dadır. Şimdilik gizli anahtar yok.

## Test

- **Sunucu:** Vitest + Supertest. Her uç için başarılı ve başarısız senaryolar, geçici veritabanıyla. Net ve istatistik hesapları ayrıca test edilir.
- **Arayüz:** Yalnızca mantık içeren küçük parçalar (ör. Pomodoro süre hesabı). Görünüş testi yok.
- **Elle kontrol:** Her özellik bittiğinde uygulama çalıştırılıp denenir.
- **Yapılmayacak:** Uçtan uca tarayıcı testleri, otomatik görsel testler.

## İş akışı notları

- Küçük adımlarla, her seferinde tek özellik. Her çalışan adımdan sonra commit.
- README.md güncel tutulur.
- Gizli bilgi koda yazılmaz.
