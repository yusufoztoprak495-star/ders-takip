// Takvim dosyası (.ics, RFC 5545): haftalık program ve sınav tarihi Google Takvim, Apple Takvim,
// Outlook gibi uygulamalara aktarılabilsin. Saf fonksiyonlar; indirme işini sayfa yapar.
import { addDays } from "./insights.js";
import { dayIndexOfDate } from "./schedule.js";

const pad = (n) => String(n).padStart(2, "0");
const compactDate = (date) => date.replaceAll("-", "");

// Bugünden başlayarak haftanın o gününe (0 = Pazartesi) denk gelen ilk tarih
export function nextDateForDay(today, day) {
  return addDays(today, (day - dayIndexOfDate(today) + 7) % 7);
}

// Metin alanlarında özel anlamı olan karakterler kaçırılır
export function escapeIcsText(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\;").replace(/\r?\n/g, "\\n");
}

// Bir satır en fazla 75 bayt olmalı; uzunsa boşlukla başlayan devam satırlarına bölünür.
// Bayt sayılır (ğ, ş gibi harfler 2 bayttır) ve bir harf ortadan bölünmez.
export function foldLine(line) {
  const encoder = new TextEncoder();
  const parts = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // devam satırının başındaki boşluk da sayılır
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.map((p, i) => (i ? ` ${p}` : p)).join("\r\n");
}

// Tarih + dakika → yerel (saat dilimsiz) zaman: 20261019T083000. 1440 (gün sonu) ertesi günün 00:00'ıdır.
function localStamp(date, minutes) {
  const day = minutes >= 1440 ? addDays(date, 1) : date;
  const m = minutes % 1440;
  return `${compactDate(day)}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`;
}

function utcStamp(now) {
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(
    now.getUTCMinutes(),
  )}${pad(now.getUTCSeconds())}Z`;
}

// events: { uid, title, location?, description?, weekly: {day, start, end} } (her hafta tekrarlanan)
//      ya da { uid, title, date } (tüm gün süren tek etkinlik)
export function buildIcs(events, { today, now = new Date() }) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ders Takip//TR", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Ders Takip"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@ders-takip`, `DTSTAMP:${utcStamp(now)}`);
    if (e.weekly) {
      const first = nextDateForDay(today, e.weekly.day);
      lines.push(`DTSTART:${localStamp(first, e.weekly.start)}`, `DTEND:${localStamp(first, e.weekly.end)}`, "RRULE:FREQ=WEEKLY");
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.date)}`, `DTEND;VALUE=DATE:${compactDate(addDays(e.date, 1))}`);
    }
    lines.push(`SUMMARY:${escapeIcsText(e.title)}`);
    if (e.location) lines.push(`LOCATION:${escapeIcsText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeIcsText(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
