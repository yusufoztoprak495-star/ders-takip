# Ders Takip

**YKS, DGS ve üniversite dersleri için kişisel çalışma takip uygulaması.** Pomodoro ile çalış, süreni ve çözdüğün soruları kaydet, test kitaplarında nerede kaldığını takip et, ilerlemeni grafiklerle gör.

[![Yayın](https://github.com/yusufoztoprak495-star/ders-takip/actions/workflows/pages.yml/badge.svg)](https://github.com/yusufoztoprak495-star/ders-takip/actions/workflows/pages.yml)
![React](https://img.shields.io/badge/React-19-149eca)
![Vite](https://img.shields.io/badge/Vite-8-646cff)
![PWA](https://img.shields.io/badge/PWA-çevrimdışı%20çalışır-5a0fc8)
![Testler](https://img.shields.io/badge/test-572%20geçiyor-2ea44f)

### 👉 [Uygulamayı aç](https://yusufoztoprak495-star.github.io/ders-takip/)

Kurulum yok, hesap yok. Veriler yalnızca senin tarayıcında durur, hiçbir sunucuya gönderilmez. Telefonda "Ana ekrana ekle" ile uygulama gibi kurulur ve internetsiz de açılır.

Önce nasıl göründüğüne bakmak istersen: **Ayarlar → Örnek verilerle dene** 200 günlük örnek bir YKS çalışma geçmişi yükler (kendi verin varsa önce yedek al).

![Ana sayfa: günün sözü, bugünün özeti, haftalık değişim, seri ve günün dersi](docs/screenshots/ana-sayfa.png)

## Neler yapabilir?

| | |
| --- | --- |
| 🎯 **Üç hedef** | YKS (TYT/AYT), DGS (sayısal/sözel) ya da üniversite dersleri. Her hedefin dersleri ve kayıtları ayrı tutulur; hedef değiştirince öbürü silinmez, gizlenir. |
| ⏱️ **Pomodoro** | Ders ve konu seçip sayacı başlat; süre dolunca çalışma kendiliğinden kaydedilir. Arkada odak sesi çalabilir: dört ölçülük cümlelerle sakin piyano, müzik kutusu, gece sentezi (arpej + bas + pad), derin ambiyans, damlalı yağmur ya da kahverengi gürültü. Hepsi tarayıcıda anlık üretilir, ses dosyası yok. |
| 📒 **Çalışma günlüğü** | Pomodoro dışındaki çalışmaları elle ekle. |
| 📝 **Denemeler** | Genel denemeler: TYT, AYT Sayısal / Eşit Ağırlık / Sözel ve DGS, bölüm bölüm; net grafiği, bir önceki denemeye göre değişim, en zayıf bölüm. Branş denemeleri: tek ders, kendi soru sayısıyla; ders başına ortalama ve net yüzdesi grafiği. |
| 🎯 **Hedefler ve geri sayım** | Sınav tarihine kalan gün ana sayfada; günlük çalışma hedefi bugünün özetinde çubuk olarak. |
| 🔁 **Konu tekrarı** | Bitirdiğin konuyu işaretle; 1, 3, 7 ve 30 gün sonra ana sayfadaki tekrar listesine düşer. |
| ✍️ **Soru kaydı** | Doğru / yanlış / boş gir; net (`doğru − yanlış / 4`) ve doğruluk otomatik hesaplanır. |
| 📚 **Kaynaklar** | Test kitaplarında kaçıncı testte olduğun ve son çözüm tarihi. |
| 📈 **İlerleme** | Günlük ve haftalık süre, net değişimi, derse göre karşılaştırma; derse ve konuya inip **en zayıf konunu** gör. |
| 🗓️ **Ders programı** | Okul, kurs ya da üniversite ders saatlerini haftalık gir (aynı saati birden çok güne tek seferde). Her günün şeridinde dersler ve 45 dakikadan uzun boşluklar süresiyle görünür. |
| 🕘 **Haftalık program** | Haftayı saat saat planla: ders programındaki dersler ızgaraya kendiliğinden gelir, boş saate tıklayıp çalışma / mola / diğer bloğu ekle, bir günü başka günlere kopyala. Gün başlığında planlanan ve gerçekten kaydedilen çalışma süresi yan yana. |
| 🗂️ **Dersler ve konular** | YKS sayısalın 15 dersi (TYT: Türkçe, Matematik, Geometri, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Felsefe, Din Kültürü; AYT: Matematik, Geometri, Fizik, Kimya, Biyoloji) tüm konularıyla, müfredat sırasında hazır gelir. Listeyi düzenle ya da kendi derslerini (dönemiyle) ekle. |
| ✨ **Canlılık** | Kartlar sırayla gelir, sayılar sayarak dolar, grafikler çizilerek açılır; pomodoro bitince, konu ya da ders tamamlanınca, yeni rekor nette ve günlük hedefe ulaşınca konfetili kutlama. "Hareketi azalt" açıksa hepsi kapanır. |
| 🎨 **Dört tema** | Gece (Samanyolu, Türkçe adlı takımyıldızlar, gezegen yörüngeleri, kayan yıldızlar), Kâğıt (teknik çizim paftası: antet, gönye, grafikler, kalemle beliren notlar), Neon (yağmurlu neon gece, bokeh ışıklar, yanıp sönen ODAK tabelası) ve Pastel (kalın çizgili çıkartma kartlar, kareli defter, fosforlu başlık). Yeni tema, tema düğmesinden daire hâlinde yayılarak gelir; "hareketi azalt" açıksa arka planlar durur. Masaüstünde sol menü, telefonda 4 ana sekme + Diğer paneli. |
| 📆 **Bugünün programı** | Ana sayfada bugünün dersleri ve çalışma blokları, şu anki blok vurgulu; bir bloktan tek dokunuşla Pomodoro başlat, tur bitince blok "yapıldı" olur. |
| 🔥 **Isı haritası** | Son bir yılın her günü bir kare (ana sayfada son dört ay): kaç gün çalıştın, en uzun günün. |
| 🔮 **Gidişat** | Deneme netinin tavana yaklaştıkça yavaşlayan eğriyle 3 aya kadar tahmini; konu bitirme hızına göre bitiş tarihi ve sınava yetişmek için haftada kaç konu gerektiği; günün hangi saatlerinde çalıştığın (verimli saatler). |
| 🧮 **Puan ve sıralama tahmini** | TYT ve SAY / EA / SÖZ netlerinden (son 3 deneme ortalamasıyla doldurulabilir) ve diploma notundan tahmini ham ve yerleştirme puanı; 2025-YKS puan dağılımından tahmini başarı sırası; hedef sıra için gereken puan. Katsayılar yaklaşıktır, ekranda tahmin olduğu yazar. |
| 🎯 **Yanlış konu analizi** | Denemeden sonra yanlış/boş soruların konusunu işle; "soru kaybettiren konular" sıralaması çıkar. |
| 📸 **Hata defteri** | Yanlış yaptığın sorunun fotoğrafını çek (tarayıcıda küçültülür), cevabı ve notunu ekle; 1-3-7-30 gün arayla yeniden karşına çıkar, dört kez üst üste doğru çözünce öğrenilmiş sayılır. |
| 🃏 **Bilgi kartları** | Formül ve tanımlar için çevrilen kartlar, Leitner kutularıyla (1-2-4-8-16 gün) tekrar; kartlardan 4 şıklı mini test. |
| 🗒️ **Konu notları** | Her konuya formül / püf noktası notu. |
| 🧠 **Akıllı plan önerisi** | Haftalık programdaki boş saatlere zayıf konulardan (denemede soru kaybettiren, doğruluğu düşük, tekrarı gelen) çalışma blokları önerir; istemediklerini çıkarıp ekle. |
| 🧘 **Odak modu ve mola sağlığı** | Tam ekran sade sayaç; turda sekmeden kaç kez çıktığın sayılır. Her 4 turda uzun mola, molada kısa öneriler, uzun turlarda 20-20-20 göz molası hatırlatması. |
| 🏅 **Başarılar** | 20 rozet (seri, saat, soru, deneme, odak, erkenci kuş…) ve her pomodoroda büyüyen, temaya göre değişen koleksiyon: Gece'de yıldızlar, Kâğıt'ta mürekkep yapraklar, Neon'da ışıklar, Pastel'de çıkartmalar. |
| 🖼️ **Haftalık rapor kartı** | Haftanın özetini temanın renkleriyle 1080×1920 PNG olarak indir ya da paylaş. |
| 🎓 **Dönem (üniversite)** | Ders başına kredi ve not bileşenleri, harf notu, hedef harf için finalden kaç alman gerektiği, dönem ortalaması; ders programından hesaplanan devamsızlık hakkı ve "Gitmedim" düğmesi; ödev teslimlerine geri sayım. |
| ⌨️ **Kısayollar ve hafif mod** | Tek harfle sayfa değiştir (`?` listeyi açar); haftalık programı ve sınav gününü `.ics` olarak takvimine aktar; eski cihazlar için animasyonları ve arka planı kapatan hafif mod; ana ekran simgesinde Pomodoro / Soru / Hafta kısayolları. |
| 💾 **Yedekleme** | Yedeği indir/yükle (hata defteri fotoğrafları dahil), haftalık hatırlatma, bilgisayarda bir klasöre günlük otomatik yedek. |

> Üniversite hedefinde sınav mantığı yoktur: soru kaydı, kaynaklar, net ve doğruluk gizlenir; onların yerine Dönem sayfası (not, devamsızlık, ödev) gelir.

## Ekran görüntüleri

| Isı haritası ve gidişat | Puan ve sıralama tahmini |
| --- | --- |
| ![İlerleme: yıllık ısı haritası, net gidişatı ve konu bitiş tahmini](docs/screenshots/ilerleme-isi-haritasi.png) | ![Denemeler: netlerden puan ve başarı sırası tahmini](docs/screenshots/puan-siralama.png) |

| Hata defteri | Bilgi kartları |
| --- | --- |
| ![Hata defteri kartları ve tekrar adımları](docs/screenshots/hata-defteri.png) | ![Çevrilen bilgi kartı](docs/screenshots/bilgi-kartlari.png) |

| Akıllı plan önerisi | Soru kaybettiren konular |
| --- | --- |
| ![Boş saatlere zayıf konulardan blok önerisi](docs/screenshots/akilli-oneri.png) | ![Denemelerden toplanan yanlış konular](docs/screenshots/yanlis-konular.png) |

| Başarılar | Odak modu |
| --- | --- |
| ![Rozetler ve yıldızlı gökyüzü koleksiyonu](docs/screenshots/basarilar.png) | ![Tam ekran sade sayaç](docs/screenshots/odak-modu.png) |

| Haftalık rapor kartı | Verimli saatler |
| --- | --- |
| <img src="docs/screenshots/haftalik-rapor.png" alt="Pastel temada haftalık rapor kartı" width="270"> | ![Günün saatlerine göre çalışma](docs/screenshots/verimli-saatler.png) |

| İlerleme | Ders ayrıntısı (konular zayıftan güçlüye) |
| --- | --- |
| ![İlerleme sayfası: göstergeler, ders listesi ve grafikler](docs/screenshots/ilerleme.png) | ![Ders sayfası](docs/screenshots/ilerleme-ders.png) |

| Pomodoro | Konu ayrıntısı |
| --- | --- |
| ![Çalışan Pomodoro sayacı ve odak sesi](docs/screenshots/pomodoro.png) | ![Konu sayfası: doğru/yanlış/boş dağılımı, doğruluk grafiği, kitaplar](docs/screenshots/ilerleme-konu.png) |

| Soru kaydı | Kaynaklar |
| --- | --- |
| ![Soru kaydı formu ve son kayıtlar](docs/screenshots/soru-kaydi.png) | ![Test kitapları](docs/screenshots/kaynaklar.png) |

| Haftalık program | Haftalık program (telefon) |
| --- | --- |
| ![Saat saat haftalık ızgara: taralı dersler, çalışma ve mola blokları](docs/screenshots/haftalik-program.png) | ![Telefonda tek gün görünümü](docs/screenshots/haftalik-telefon.png) |

| Denemeler |
| --- |
| ![Deneme girişi, net grafiği ve geçmiş denemeler](docs/screenshots/denemeler.png) |

| Ders programı |
| --- |
| ![Gün şeritleri: dersler ve boş zaman](docs/screenshots/ders-programi.png) |

| Gece | Kâğıt |
| --- | --- |
| ![Gece teması: yıldız haritası](docs/screenshots/tema-gece.png) | ![Kâğıt teması: çizim masası](docs/screenshots/tema-kagit.png) |

| Neon | Pastel |
| --- | --- |
| ![Neon teması: yağmurlu neon gece](docs/screenshots/tema-neon.png) | ![Pastel teması: çıkartma kartlar](docs/screenshots/tema-pastel.png) |

| Açık tema | Hedef seçimi |
| --- | --- |
| ![Açık temada ana sayfa](docs/screenshots/ana-sayfa-acik.png) | ![Ayarlar: YKS, DGS, Üniversite](docs/screenshots/hedef-secimi.png) |

| Üniversite: dersler | Üniversite: yalnızca süre |
| --- | --- |
| ![Kendi eklenen üniversite dersleri](docs/screenshots/universite-dersler.png) | ![Üniversite modunda İlerleme](docs/screenshots/universite-ilerleme.png) |

<p align="center"><img src="docs/screenshots/telefon.png" alt="Telefonda açık ve koyu tema" width="560"></p>

> Görüntülerdeki veriler örnektir.

---

## Geliştirme

**Gereksinim:** [Node.js](https://nodejs.org) 22+ (yalnızca geliştirmek için; uygulamayı kullanmak için gerekmez).

```bash
git clone https://github.com/yusufoztoprak495-star/ders-takip.git
cd ders-takip
npm install
npm run dev        # http://localhost:5173
```

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu, kod değiştikçe yenilenir |
| `npm test` | Tüm testler (Vitest) |
| `npm run build` | Derler (`client/dist`) |
| `npm run preview` | Derlenmiş hâli dener: `http://localhost:4173` |

Sunucu, veritabanı ya da `.env` yoktur. `master` dalına her gönderimde GitHub Actions testleri çalıştırır, derler ve GitHub Pages'e yayınlar (`.github/workflows/pages.yml`).

### Teknolojiler

| Katman | Seçim |
| --- | --- |
| Arayüz | React 19 + Vite, React Router (`HashRouter`: alt klasörde de çalışır) |
| Veri | Tarayıcıda IndexedDB, tek kayıt olarak (yazma atomik: ya hepsi ya hiçbiri) |
| Çevrimdışı | Manifest + servis çalışanı (`client/public/sw.js`) |
| Grafikler | Elle çizilmiş SVG, kütüphanesiz |
| Yazı tipi | Cormorant Garamond + Figtree, projeye gömülü (`@fontsource`) |
| Test | Vitest |

### Proje yapısı

```
client/
  public/            manifest, simge, servis çalışanı
  src/
    pages/           Ana sayfa, Pomodoro, Günlük, Soru Kaydı, Kaynaklar, Denemeler, Hata Defteri, Bilgi Kartları,
                     Dersler ve Konular, Ders Programı, Haftalık Program, İlerleme, Başarılar, Dönem, Ayarlar
    components/      ortak parçalar, hedef seçici, Pomodoro kadranı, SVG grafikler, çizimler
    context/         Pomodoro sayacı, çalışma hedefi, klasör yedeği
    hooks/, lib/     saf yardımcılar (tarih, süre, grafik, tema, hedefler, yedek, ders saatleri)
    data/            tarayıcıdaki veri katmanı (aşağıda)
    api.js           apiFetch('/api/...') çağrılarını yerel veri katmanına yönlendirir
  tests/             arayüz yardımcıları; tests/data/ veri katmanı
docs/                tasarım belgeleri, uygulama planları, ekran görüntüleri
```

### Veri katmanı

Proje önce Node.js + SQLite sunucusuyla yazıldı, sonra sunucusuz hâle getirildi. Sayfalar değişmesin diye `apiFetch('/api/...')` çağrıları aynen kaldı; artık ağa değil `client/src/data/` içindeki yerel veritabanına gidiyor.

| Yol | Açıklama |
| --- | --- |
| `/api/settings` | Seçili çalışma hedefi (`yks`, `dgs`, `uni`) |
| `/api/subjects` | Seçili hedefin dersleri, konularıyla; ders ekle / düzenle / sil |
| `/api/topics` | Konu ekle / yeniden adlandır / sil |
| `/api/sessions` | Çalışma kayıtları |
| `/api/questions` | Soru kayıtları (net hesaplanarak döner) |
| `/api/resources` | Test kitapları |
| `/api/classes` | Ders programı (seçili hedefin); bir dersi birden çok güne ekle / düzenle / sil. Aynı gün çakışan ders reddedilir |
| `/api/plans`, `/api/plans/copy` | Haftalık programın blokları (çalışma, mola, diğer); ders saatine ya da başka bloğa denk gelen blok reddedilir. Bir günü başka günlere kopyalama |
| `/api/schedule` | Gün aralığı (varsayılan 08:00–23:00): şerit ve ızgara bu saatlere göre çizilir |
| `/api/today`, `/api/plans/:id/done` | Bugünün programı ve blokların o güne özel "yapıldı" işareti |
| `/api/exams`, `/api/exams/:id/wrong-topics`, `/api/exams/wrong-topics` | Denemeler; denemede yanlış yapılan konular ve tüm denemelerden toplamı |
| `/api/goals`, `/api/reviews`, `/api/topics/:id/done`, `/review`, `/note` | Sınav tarihi ve günlük hedef; konu bitirme, 1-3-7-30 tekrar, konu notu |
| `/api/mistakes`, `/api/cards` | Hata defteri ve bilgi kartları (tekrar: `/:id/review`). Fotoğraflar ayrı bir IndexedDB deposunda (`data/images.js`) |
| `/api/courses`, `/api/absences`, `/api/assignments` | Üniversite: kredi ve not bileşenleri, devamsızlık, ödevler |
| `/api/weak-topics`, `/api/achievements` | Akıllı öneri için zayıf konular; rozetler için sayılar |
| `/api/stats/daily`, `hourly`, `by-subject`, `by-topic`, `topic/:id` | İstatistikler |

<details>
<summary><b>Kurallar</b> (doğrulama, net, gün sınırı, silme, hedefler)</summary>

- **Doğrulama veri katmanındadır.** Arayüzdeki kontroller yalnızca kolaylıktır; her girdiyi veri katmanı Türkçe mesajla reddeder (`HttpError` → arayüzde `ApiError`).
- **Net saklanmaz,** her seferinde `doğru − yanlış / 4` olarak hesaplanır. Doğruluk `doğru / (doğru + yanlış + boş)`; hiç soru yoksa `null` ("veri yok", sıfır değil).
- **Gün sınırı yereldir.** Çalışmalar UTC saklanır, istatistikler yerel güne göre ayrılır: gece 00:30'daki çalışma o günün sayılır.
- **Sınırlar:** bir çalışma en fazla 24 saat, doğru/yanlış/boş ve test sayısı en fazla 10000, tarihler 2000–2100.
- **Silme:** silinen konuya/kitaba bağlı kayıtlar silinmez, bağlantıları boşalır. Kaydı olan ders silinmez.
- **Hedefler:** her dersin bir `track` alanı vardır; listeler ve istatistikler yalnızca seçili hedeften hesaplanır. Hazır ders listesi bir hedef ilk seçildiğinde bir kez yüklenir. Üniversite derslerine soru ve kitap kaydı eklenemez. Hedeflerden önceki eski veriler ve yedekler kendiliğinden YKS sayılır.

</details>

### Puan ve sıralama tahmini nasıl çalışır?

ÖSYM puanları her yıl adayların ortalama ve standart sapmasına göre hesaplar, katsayıları açıklamaz. Uygulama bu yüzden **tahmin** verir:

- **Ham puan** = 100 + Σ (net × katsayı). Katsayılar puan hesaplayıcılarda yaygın kullanılan yaklaşık değerlerdir (TYT'de Türkçe/Matematik 3,3, Sosyal/Fen 3,4; SAY'da TYT bölümleri 1,32–1,36, AYT Matematik 3, Fizik 2,85, Kimya ve Biyoloji 3,07…). Tam netlerde her puan türü ~500 eder.
- **Yerleştirme puanı** = ham puan + OBP katkısı (diploma notu × 5 × 0,12; önceki yıl bir programa yerleşenlerde × 0,06).
- **Sıralama**, 2025-YKS yerleştirme puanlarının yığınsal dağılımından (o puan ve üzeri aday sayısı) iki nokta arasında logaritmik aradeğerle bulunur. Tablo `client/src/lib/yksScore.js` içinde.

### Veriler ve yedekleme

Veriler tarayıcının deposunda (IndexedDB) durur; site verileri temizlenirse kaybolabilir. Bu yüzden **Ayarlar**'da üç önlem var:

- **Kalıcı depolama izni** (`navigator.storage.persist()`): verilirse tarayıcı verileri kendiliğinden silmez.
- **Yedeği indir / yükle:** `yedek-YYYY-AA-GG.json`. Yüklenen dosya doğrulanır, geçersizse reddedilir. Son yedek 7 günden eskiyse ana sayfada hatırlatma çıkar.
- **Yedek klasörü:** bilgisayarda seçilen klasöre her gün ilk açılışta yedek yazılır, son 14'ü tutulur. File System Access API ister: yalnızca masaüstü Chrome / Edge.

### Güvenlik

Ayrıntılı tehdit modeli ve alınan önlemler: [SECURITY.md](SECURITY.md). Kısaca:

- **CSP:** sayfa yalnızca kendi dosyalarını yükler, dışarıya bağlanamaz, çerçeve ve medya açamaz. Tek satır içi betik (tema) özetiyle (hash) izinlidir.
- **Trusted Types:** DOM'a ham HTML/betik adresi yazmak tarayıcı düzeyinde yasak; tek izinli kalıp servis çalışanının adresi.
- **Clickjacking:** uygulama başka bir sitenin çerçevesinde açılırsa çizilmez.
- **Yedek dosyası güvenilmez sayılır:** en fazla 80 MB (payın çoğu fotoğraflar için); yalnızca bilinen tablolar ve alanlar alınır, alan türleri ve metin uzunlukları denetlenir, `__proto__` gibi anahtarlar atılır. Fotoğraflar yalnızca boyutu sınırlı webp/jpeg/png `data:` adresi olarak kabul edilir (SVG gibi betik taşıyabilecek türler reddedilir).
- **Yayın hattı:** GitHub eylemleri commit özetiyle sabitlenmiş, işler en az yetkiyle çalışır, `npm audit` ciddi açıkta yayını durdurur, Dependabot haftalık güncelleme açar.

### Testler

```bash
npm test
```

- **Veri katmanı** (`client/tests/data/`): her uç için başarılı ve hatalı durumlar, doğrulama, gün sınırı, net/istatistik hesapları, hedefe göre süzme, eski verinin taşınması, yedek doğrulaması ve klasör yedeği (sahte klasörle).
- **Arayüz yardımcıları** (`client/tests/`): Pomodoro süresi, mola kuralları, kadran, tarih/süre biçimi, grafik eksenleri, tema seçimi, odak sesi, ısı haritası, net/konu tahmini, puan ve sıralama tahmini, Leitner kutuları ve mini test, plan önerisi, rozetler, harf notu/AGNO, takvim dosyası, kısayollar.

Sayfaların görünümü testlerle yakalanmaz; her değişiklik tarayıcıda masaüstü ve telefon genişliğinde açılıp denenir.

## Tasarım

Hedef his: deri kaplı bir ajanda ve dolma kalem.

- **Koyu tema:** gece mavisi-kömür zemin, kırık beyaz yazı, az ve yerinde şampanya altını.
- **Açık tema:** beyaz kartlar, çok açık gri zemin, lacivert vurgu. İlk sürümdeki krem/sepya açık tema bazı ekranlarda ve gece ışığında sarı göründüğü için renk tonu olmayan nötr beyaza çevrildi.
- **Tarayıcıların zorla karartması:** mobil Chrome ve Samsung Internet'in karanlık modu açık temayı ters çevirmesin diye sayfa `color-scheme` ile iki temayı da kendisinin desteklediğini bildirir; açık tema `only light` olarak işaretlidir.
- **Tipografi:** başlıklarda Cormorant Garamond, metinde Figtree; tüm sayılar düz ve tabular, alt alta hizalı.
- **Grafikler:** elle çizilmiş SVG; renkler renk körlüğü ve karşıtlık kontrolünden geçti, yazılar WCAG AA kontrastını sağlar. Her grafiğin tablo görünümü vardır.
- **Motifler:** 13 gravür tarzı çizim (dolma kalem, kum saati, pergel…), yalnızca içeriğin dışındaki boş kenarlarda; dar ekranda gizlenir.

## Yol haritası

- PDF'ten soru üretme (ileride).
- Puan tahmininde her yıl yeni ÖSYM dağılımı geldikçe sıralama tablosunu güncellemek.

## Nasıl yapıldı?

Önce tasarım ve plan yazıldı, sonra küçük adımlarla (her adımda test ve commit) geliştirildi. Tasarım belgeleri ve uygulama planları `docs/superpowers/` altında.
