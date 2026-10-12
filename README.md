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

Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışır. Çalıştığını görmek için: `http://localhost:3000/api/health`

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

## Teknolojiler

Node.js + Express (sunucu), SQLite (veritabanı), Vitest + Supertest (test). Arayüz için React + Vite ve grafikler için Chart.js eklenecek.

## Ayarlar (`.env`)

| Değişken  | Açıklama               | Varsayılan          |
| --------- | ---------------------- | ------------------- |
| `PORT`    | Sunucunun portu        | `3000`              |
| `DB_PATH` | SQLite dosyasının yolu | `./data/calisma.db` |

`.env` dosyası Git'e eklenmez; örnek değerler `.env.example` içindedir.
