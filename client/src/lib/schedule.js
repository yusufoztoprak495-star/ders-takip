// Ders programı ve haftalık program için saf yardımcılar.
// Saatler her yerde "gece yarısından beri geçen dakika" olarak tutulur: 08:30 = 510, gün sonu 24:00 = 1440.
// Böylece karşılaştırma ve süre hesabı düz sayı işlemi olur; metne yalnızca ekranda çevrilir.
import { toLocalDateString } from "./dates.js";

// Hafta pazartesi başlar (Türkiye'deki okul ve ajanda alışkanlığı). Dizideki sıra = gün numarası (0–6).
export const DAYS = [
  { short: "Pzt", name: "Pazartesi" },
  { short: "Sal", name: "Salı" },
  { short: "Çar", name: "Çarşamba" },
  { short: "Per", name: "Perşembe" },
  { short: "Cum", name: "Cuma" },
  { short: "Cmt", name: "Cumartesi" },
  { short: "Paz", name: "Pazar" },
];

export const DAY_MINUTES = 1440;
// Saatler 5 dakikalık adımlarla girilir (ızgarada düzgün hizalansın, 08:37 gibi yazım hataları olmasın)
export const TIME_STEP = 5;
// Kullanıcı ayarlamadıysa günün planlanan kısmı: 08:00–23:00
export const DEFAULT_DAY_WINDOW = { dayStart: 480, dayEnd: 1380 };

// '08:30' -> 510. Geçersizse null (24:00 yalnızca gün sonu olarak geçerli)
export function parseClock(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text ?? "");
  if (!match) return null;
  const [h, m] = [Number(match[1]), Number(match[2])];
  if (m > 59 || h > 24 || (h === 24 && m !== 0)) return null;
  return h * 60 + m;
}

// 510 -> '08:30'
export function formatClock(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// 135 -> '2 sa 15 dk' (uygulamadaki diğer süre yazımıyla aynı dil)
export function minutesLabel(minutes) {
  if (minutes < 60) return `${minutes} dk`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

// İki blok aynı anda mı? Uç uca değmek (biri 09:10'da bitip diğeri 09:10'da başlarsa) çakışma değildir.
export function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

// Blokları [from, to] aralığına kırpıp sıralar ve üst üste binenleri birleştirir
function mergedWithin(blocks, from, to) {
  const clipped = blocks
    .map((b) => ({ start: Math.max(b.start, from), end: Math.min(b.end, to) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const b of clipped) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
    else merged.push({ ...b });
  }
  return merged;
}

// [from, to] aralığında hiçbir bloğun kapsamadığı boşluklar. minLength'ten kısa boşluklar atılır
// (10 dakikalık teneffüs "boş zaman" sayılmasın diye).
export function freeWindows(blocks, from, to, minLength = 0) {
  const gaps = [];
  let cursor = from;
  for (const b of mergedWithin(blocks, from, to)) {
    if (b.start > cursor) gaps.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (to > cursor) gaps.push({ start: cursor, end: to });
  return gaps.filter((g) => g.end - g.start >= minLength);
}

// Aralık içinde dolu olan toplam dakika (üst üste binen kısım bir kez sayılır)
export function busyMinutes(blocks, from, to) {
  return mergedWithin(blocks, from, to).reduce((sum, b) => sum + (b.end - b.start), 0);
}

// Tarihin hafta içindeki yeri: pazartesi 0 ... pazar 6 (JavaScript'te pazar 0'dır, kaydırılır)
export function dayIndexOf(date) {
  return (date.getDay() + 6) % 7;
}

// İçinde bulunulan haftanın günleri, pazartesiden pazara 'YYYY-AA-GG'
export function weekDates(now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayIndexOf(now));
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toLocalDateString(d);
  });
}

// Izgarada gösterilecek saat aralığı: gün aralığı ve tüm bloklar tam saatlere yuvarlanarak kapsanır
export function gridRange(blocks, { dayStart, dayEnd }) {
  let start = dayStart;
  let end = dayEnd;
  for (const b of blocks) {
    start = Math.min(start, b.start);
    end = Math.max(end, b.end);
  }
  return {
    start: Math.floor(start / 60) * 60,
    end: Math.min(DAY_MINUTES, Math.ceil(end / 60) * 60),
  };
}

// Ders çalışmaya yetecek en kısa boşluk (bir pomodoro + hazırlık). Daha kısası "boş zaman" sayılmaz.
export const STUDY_GAP_MIN = 45;

// Saat kutularındaki ('HH:MM') değerleri dakikaya çevirir. Saat kutusu 24:00 yazdırmadığı için
// bitiş 00:00 ise gece yarısı (1440) sayılır. Biri eksikse null.
export function spanFromInputs(startText, endText) {
  const start = parseClock(startText);
  let end = parseClock(endText);
  if (start === null || end === null) return null;
  if (end === 0 && start > 0) end = DAY_MINUTES;
  return { start, end };
}

// Izgarada boş bir yere tıklanınca önerilen blok: tıklanan yarım saatin başından itibaren bir saat,
// ama sonraki bloğa ya da aralık sonuna kadar kısaltılır. Tıklanan yer doluysa null.
export function slotAt(blocks, minute, range) {
  if (blocks.some((b) => minute >= b.start && minute < b.end)) return null;
  // Başlangıç yarım saate yuvarlanır ama önceki bloğun içine düşmez
  const previousEnd = blocks.filter((b) => b.end <= minute).reduce((max, b) => Math.max(max, b.end), range.start);
  const start = Math.max(Math.floor(minute / 30) * 30, previousEnd);
  const nextStart = blocks.filter((b) => b.start > minute).reduce((min, b) => Math.min(min, b.start), range.end);
  const end = Math.min(start + 60, nextStart);
  return end > start ? { start, end } : null;
}

// 'YYYY-AA-GG' gününün haftadaki yeri: pazartesi 0 ... pazar 6 (UTC ile, saat diliminden bağımsız)
export function dayIndexOfDate(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
