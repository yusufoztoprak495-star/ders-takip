# Ders Çalışma Takip Uygulaması

YKS (sayısal) hazırlığı için kişisel bir çalışma takip uygulaması. Pomodoro zamanlayıcı, çalışma süresi ve çözülen soru kaydı, kaynak/video takibi ve grafiklerle ilerleme görme özelliklerini içerecek.

> **Durum:** Geliştirme aşamasında. Şu an sunucu iskeleti hazır; özellikler adım adım ekleniyor.

## Gereksinimler

- [Node.js](https://nodejs.org) 20 veya üstü

## Kurulum ve çalıştırma

```bash
npm install
cp .env.example .env   # ayarları istersen değiştir
npm start
```

`npm start` arayüzü derler ve sunucuyu başlatır. Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

**Geliştirme modu:** `npm run dev` sunucuyu ve arayüzü birlikte başlatır; arayüz `http://localhost:5173` adresinde açılır ve kodu değiştirdikçe kendiliğinden yenilenir. İki mod da aynı veritabanı dosyasını kullanır.

## Testler

```bash
npm test
```

## Veritabanı

Veriler tek bir SQLite dosyasında (`data/calisma.db`) tutulur; dosya ilk çalıştırmada kendiliğinden oluşur. Yedeklemek için bu dosyayı kopyalamak yeterli. İlk kurulumda TYT/AYT ders ve konu listesi otomatik yüklenir.

## API (şimdilik)

| Uç                                          | Açıklama                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `GET /api/health`                           | Sunucu çalışıyor mu                                                                          |
| `GET /api/subjects`                         | Dersler, konularıyla birlikte                                                                |
| `POST /api/topics`                          | Konu ekle (`{ subjectId, name }`)                                                            |
| `PUT /api/topics/:id`                       | Konuyu yeniden adlandır (`{ name }`)                                                         |
| `DELETE /api/topics/:id`                    | Konuyu sil                                                                                   |
| `GET /api/sessions?from=&to=`               | Çalışma kayıtları (tarih aralığı isteğe bağlı, yerel tarihe göre)                            |
| `POST /api/sessions`                        | Çalışma kaydı ekle (`{ subjectId, topicId, startedAt, durationSeconds, entryType }`)         |
| `PUT /api/sessions/:id`                     | Kaydı güncelle (tüm alanlar gönderilir)                                                      |
| `DELETE /api/sessions/:id`                  | Kaydı sil                                                                                    |
| `GET /api/resources`                        | Kitap/video kaynakları (ilerleme yüzdesiyle)                                                 |
| `POST /api/resources`                       | Kaynak ekle (`{ name, type, subjectId, totalUnits, currentUnit? }`)                          |
| `PUT /api/resources/:id`                    | Kaynağı güncelle (`currentUnit` verilmezse mevcut değer korunur)                             |
| `DELETE /api/resources/:id`                 | Kaynağı sil                                                                                  |
| `GET /api/questions?from=&to=`              | Soru kayıtları, net ile birlikte (tarih aralığı isteğe bağlı)                                |
| `POST /api/questions`                       | Soru kaydı ekle (`{ date, subjectId, topicId?, correct, wrong, blank, resourceId? }`)        |
| `PUT /api/questions/:id`                    | Kaydı güncelle                                                                               |
| `DELETE /api/questions/:id`                 | Kaydı sil                                                                                    |
| `GET /api/stats/daily?from=&to=&subjectId=` | Gün gün çalışma süresi, soru sayıları ve net (`from`/`to` zorunlu, `subjectId` isteğe bağlı) |
| `GET /api/stats/by-subject?from=&to=`       | Ders bazında toplamlar (8 dersin hepsi, verisiz olanlar sıfırla)                             |

**Net hesabı:** `net = doğru − yanlış / 4`. Net veritabanında saklanmaz, her seferinde hesaplanır.

## Özellikler

- **Pomodoro:** Ders (ve isteğe bağlı konu) seçip çalışma sayacını başlatırsın. Süre dolunca çalışma otomatik kaydedilir ve mola başlar. Çalışma/mola süreleri ayarlanabilir (varsayılan 25/5 dk). Sayaç, başka sayfaya geçsen de menüde görünür ve devam eder. "Vazgeç" kayıt oluşturmaz. Kayıt sunucuya ulaşamazsa süre ekranda kalır ve "Tekrar dene" ile kaydedilebilir.
- **Çalışma günlüğü:** Pomodoro kullanmadığın çalışmaları ders, konu, tarih ve dakika girerek elle eklersin. Bugünün kayıtları (Pomodoro ve elle girilenler) toplam süreyle listelenir, istediğini silebilirsin.
- **Soru kaydı:** Tarih, ders, konu ve doğru/yanlış/boş sayılarını girersin (isteğe bağlı kaynak seçebilirsin). Net (doğru − yanlış/4) otomatik hesaplanır. Son 30 günün kayıtları listelenir; düzenleyebilir ve silebilirsin.
- **Kaynaklar:** Kitap ve video setlerini ders ve toplam birim sayısıyla (sayfa, test ya da video) eklersin. Her kaynakta ilerleme çubuğu ve "kaldığım yer" alanı vardır; sayıyı güncelledikçe yüzde hesaplanır. Silerken onay istenir; kaynağı silsen de ona bağlı soru kayıtların kaybolmaz.

## Teknolojiler

Node.js + Express (sunucu), SQLite (veritabanı), React + Vite (arayüz), Vitest + Supertest (test). Grafikler için Chart.js eklenecek.

## Ayarlar (`.env`)

| Değişken  | Açıklama                                                      | Varsayılan        |
| --------- | ------------------------------------------------------------- | ----------------- |
| `PORT`    | Sunucunun portu                                               | `3000`            |
| `DB_PATH` | SQLite dosyasının yolu (göreli yol proje köküne göre çözülür) | `data/calisma.db` |

`.env` dosyası Git'e eklenmez; örnek değerler `.env.example` içindedir.
