// Günün sözü: motive edici sözler ve kitap alıntıları.
// Yalnızca kaynağı belli, telif süresi dolmuş eserlerden ve atasözlerinden seçildi
// (internette dolaşan "sahibi belirsiz" sözler bilerek eklenmedi). Çeviriler kısaltılmış/serbesttir.
export const QUOTES = [
  { text: "Her şey başkasına aittir; yalnızca zaman bizimdir.", author: "Seneca", source: "Lucilius'a Mektuplar" },
  { text: "Bize kısa bir ömür verilmedi; biz onu kısalttık.", author: "Seneca", source: "Hayatın Kısalığı Üzerine" },
  { text: "Hangi limana gideceğini bilmeyene hiçbir rüzgâr yardım etmez.", author: "Seneca", source: "Lucilius'a Mektuplar" },
  { text: "İnsan öğretirken öğrenir.", author: "Seneca", source: "Lucilius'a Mektuplar" },
  { text: "Her yerde olan, hiçbir yerde değildir.", author: "Seneca", source: "Lucilius'a Mektuplar" },
  { text: "Zor olduğu için cesaret edemediğimiz şeyler yok; cesaret edemediğimiz için zor olanlar var.", author: "Seneca", source: "Lucilius'a Mektuplar" },
  { text: "Yolu tıkayan engel, yolun kendisi olur.", author: "Marcus Aurelius", source: "Düşünceler" },
  { text: "Zihnin, en sık düşündüğün şeylerin rengini alır.", author: "Marcus Aurelius", source: "Düşünceler" },
  { text: "Her işi, hayatının son işiymiş gibi özenle yap.", author: "Marcus Aurelius", source: "Düşünceler" },
  { text: "Bütün hayatı birden düşünüp kendini ezme; önündeki işe bak.", author: "Marcus Aurelius", source: "Düşünceler" },
  { text: "Bazı şeyler elimizdedir, bazıları değil. Gücünü elindekine harca.", author: "Epiktetos", source: "Enkheiridion" },
  { text: "Hiçbir büyük şey birden olmaz; bir üzüm salkımı bile zaman ister.", author: "Epiktetos", source: "Söylevler" },
  { text: "Önce ne olmak istediğini söyle, sonra yapman gerekeni yap.", author: "Epiktetos", source: "Söylevler" },
  { text: "Adil davranarak adil, cesur davranarak cesur oluruz.", author: "Aristoteles", source: "Nikomakhos'a Etik" },
  { text: "Eğitimin kökleri acıdır ama meyvesi tatlıdır.", author: "Aristoteles", source: "Diogenes Laertios'un aktarımıyla" },
  { text: "Başlangıç, işin en önemli parçasıdır.", author: "Platon", source: "Devlet" },
  { text: "Sorgulanmamış bir hayat yaşanmaya değmez.", author: "Sokrates", source: "Platon, Sokrates'in Savunması" },
  { text: "Tanrılar erdemin önüne alın terini koymuştur.", author: "Hesiodos", source: "İşler ve Günler" },
  { text: "Öğrenip düşünmemek boşunadır; düşünüp öğrenmemek tehlikelidir.", author: "Konfüçyüs", source: "Konuşmalar" },
  { text: "Bildiğini bildiğini, bilmediğini bilmediğini kabul etmek: bilmek budur.", author: "Konfüçyüs", source: "Konuşmalar" },
  { text: "Bin millik yolculuk tek bir adımla başlar.", author: "Lao Tzu", source: "Tao Te Ching" },
  { text: "Günü yakala.", author: "Horatius", source: "Odlar" },
  { text: "Bilmeye cesaret et.", author: "Horatius", source: "Mektuplar" },
  { text: "Damla, taşı oyar.", author: "Ovidius", source: "Pontus'tan Mektuplar" },
  { text: "Hayatta en hakiki mürşit ilimdir.", author: "Mustafa Kemal Atatürk", source: "Samsun, 1924" },
  { text: "İlim ilim bilmektir, ilim kendin bilmektir.", author: "Yunus Emre" },
  { text: "Bilmek yetmez, uygulamak gerekir; istemek yetmez, yapmak gerekir.", author: "Goethe", source: "Wilhelm Meister'in Gezi Yılları" },
  { text: "Atalarından miras kalanı, sahip olmak için yeniden kazan.", author: "Goethe", source: "Faust" },
  { text: "Hazır olmak her şeydir.", author: "Shakespeare", source: "Hamlet" },
  { text: "En güçlü iki savaşçı sabır ve zamandır.", author: "Tolstoy", source: "Savaş ve Barış" },
  { text: "Neden yaşadığını bilen, hemen her nasıla katlanabilir.", author: "Nietzsche", source: "Putların Alacakaranlığı" },
  { text: "Daha uzağı gördüysem, devlerin omuzlarında durduğum içindir.", author: "Isaac Newton", source: "Robert Hooke'a mektup, 1675" },
  { text: "Şans, yalnızca hazırlıklı zihinleri kayırır.", author: "Louis Pasteur", source: "Lille konuşması, 1854" },
  { text: "Yarın yapacak bir işin mi var? Bugün yap.", author: "Benjamin Franklin", source: "Zavallı Richard'ın Almanağı" },
  { text: "Demir kullanılmazsa paslanır; zihin de çalıştırılmazsa körelir.", author: "Leonardo da Vinci", source: "Defterler" },
  { text: "Damlaya damlaya göl olur.", author: "Atasözü" },
  { text: "İşleyen demir ışıldar.", author: "Atasözü" },
  { text: "Sabır acıdır, meyvesi tatlıdır.", author: "Atasözü" },
  { text: "Bugünün işini yarına bırakma.", author: "Atasözü" },
  { text: "Ağaç yaşken eğilir.", author: "Atasözü" },
];

// "2026-10-14" → 1970'ten beri geçen gün sayısı (saat dilimi kaymasından etkilenmesin diye UTC ile)
function dayNumber(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

// O günün söz sırası: her gün bir sonrakine geçer, liste bitince başa döner.
// Böylece liste uzunluğu kadar gün boyunca hiçbir söz tekrar etmez.
export function quoteIndexForDate(dateString, count) {
  return ((dayNumber(dateString) % count) + count) % count;
}

// offset: "Başka söz" düğmesine kaç kez basıldığı
export function quoteOfDay(dateString, offset = 0) {
  const i = (quoteIndexForDate(dateString, QUOTES.length) + offset) % QUOTES.length;
  return QUOTES[i];
}
