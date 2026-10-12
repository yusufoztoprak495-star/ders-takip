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

## Teknolojiler

Node.js + Express (sunucu), SQLite (veritabanı), Vitest + Supertest (test). Arayüz için React + Vite ve grafikler için Chart.js eklenecek.

## Ayarlar (`.env`)

| Değişken  | Açıklama               | Varsayılan          |
| --------- | ---------------------- | ------------------- |
| `PORT`    | Sunucunun portu        | `3000`              |
| `DB_PATH` | SQLite dosyasının yolu | `./data/calisma.db` |

`.env` dosyası Git'e eklenmez; örnek değerler `.env.example` içindedir.
