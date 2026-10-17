# Güvenlik

Ders Takip sunucusu olmayan, tamamen tarayıcıda çalışan bir uygulamadır: hesap, şifre, uzak veritabanı
ya da üçüncü taraf betik yoktur. Veriler kullanıcının kendi tarayıcısında (IndexedDB) durur.

## Tehdit modeli

| Saldırı yüzeyi | Risk | Önlem |
| --- | --- | --- |
| Arayüze yazılan metinler (ders, konu, not) | Kayıtlı XSS | React her metni kaçışlayarak yazar; `dangerouslySetInnerHTML`/`innerHTML` yok. CSP `require-trusted-types-for 'script'` ile ham HTML yazımı tarayıcı düzeyinde de engelli. |
| Başkasından gelen yedek dosyası | Uygulamayı çökertme, prototip kirletme, sekmeyi dondurma | 20 MB sınırı (okumadan önce), yalnızca bilinen tablo ve alanlar, alan türü ve metin uzunluğu denetimi, kayıtlar sıfırdan düz nesne olarak kurulur. Geçersiz yedek mevcut veriye dokunmadan reddedilir. |
| Dış kaynaklar | Veri sızdırma, betik enjeksiyonu | CSP: `default-src 'self'`, `connect-src 'self'`, `object-src`/`frame-src`/`media-src 'none'`, `base-uri`/`form-action 'self'`. Yazı tipleri projeye gömülü. `no-referrer`. |
| Başka siteye gömülme | Clickjacking | Çerçeve içinde açılırsa sayfa çizilmez (Pages `frame-ancestors` başlığına izin vermediği için betikle). |
| Servis çalışanı | Önbellek zehirlenmesi | Yalnızca aynı kökenden, başarılı (`200`, `basic`) cevaplar önbelleğe alınır; adres Trusted Types kalıbından geçer. |
| Bağımlılıklar ve yayın hattı | Tedarik zinciri | Eylemler commit özetiyle sabit, işler en az yetkiyle, `persist-credentials: false`, `npm audit --audit-level=high`, Dependabot. |

## Bilinen sınırlar

- `style-src 'unsafe-inline'`: React grafiklerde `style=""` özniteliği kullanır. Yalnızca stil içindir; betik çalıştıramaz.
- GitHub Pages özel HTTP başlığı (HSTS, `X-Content-Type-Options`, `frame-ancestors`) ekletmez; mümkün olanlar `<meta>` ve betikle karşılanır.
- Veriler cihazdadır: cihaza erişen biri verileri görebilir. Şifreleme yoktur.

## Açık bildirme

Bir güvenlik sorunu bulursan lütfen herkese açık issue yerine GitHub'ın "Report a vulnerability"
(özel güvenlik bildirimi) özelliğini kullan.
