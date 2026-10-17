// Haftalık rapor kartını tuvale (canvas) çizer: 1080×1920, telefon hikâyesi boyu. Renkler seçili temadan
// okunur, yazı tipleri uygulamaya gömülü olanlardır. Tarayıcıya bağlı olduğu için birim testi yok;
// verisi lib/report.js'te (testli).
import { formatDuration, formatNet } from './format.js';

export const REPORT_W = 1080;
export const REPORT_H = 1920;
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const SERIF = '"Cormorant Garamond Variable", Georgia, serif';
const SANS = '"Figtree Variable", "Segoe UI", sans-serif';

// CSS değişkenini gerçek bir renge çevirir (color-mix gibi ifadeler de çözülsün diye bir öğeye uygulanıp okunur)
function resolveColor(name, fallback) {
  const probe = document.createElement('span');
  probe.style.color = `var(${name}, ${fallback})`;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color || fallback;
}

export function themePalette() {
  return {
    theme: document.documentElement.dataset.theme ?? 'dark',
    bg: resolveColor('--bg', '#0c0f14'),
    surface: resolveColor('--surface', '#11151c'),
    text: resolveColor('--text', '#eeece7'),
    muted: resolveColor('--muted', '#8a8f98'),
    accent: resolveColor('--accent-fill', '#cdb07a'),
    onAccent: resolveColor('--on-accent', '#111'),
    series: resolveColor('--series-2', '#1e9c96'),
    dim: resolveColor('--series-dim', '#2a313c'),
    border: resolveColor('--border-strong', '#2f3846'),
  };
}

export async function loadReportFonts() {
  if (!document.fonts?.load) return;
  await Promise.all([
    document.fonts.load(`500 120px ${SERIF}`),
    document.fonts.load(`600 40px ${SANS}`),
    document.fonts.load(`400 40px ${SANS}`),
  ]).catch(() => {});
}

function dateRange(start, end) {
  const [, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  return m1 === m2 ? `${d1}–${d2} ${MONTHS[m2 - 1]} ${y2}` : `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]} ${y2}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}

// Temaya göre arka plan süsü (sade: kartın okunurluğunu bozmasın)
function decorate(ctx, p) {
  ctx.save();
  if (p.theme === 'light') {
    ctx.strokeStyle = p.dim;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    for (let x = 0; x <= REPORT_W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, REPORT_H);
      ctx.stroke();
    }
    for (let y = 0; y <= REPORT_H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(REPORT_W, y);
      ctx.stroke();
    }
  } else if (p.theme === 'pastel') {
    ctx.fillStyle = p.text;
    ctx.globalAlpha = 0.12;
    for (let x = 30; x < REPORT_W; x += 48) for (let y = 30; y < REPORT_H; y += 48) ctx.fillRect(x, y, 4, 4);
  } else {
    // Gece ve Neon: yıldız tozu / ışık noktaları (sabit desen)
    let seed = 42;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    ctx.fillStyle = p.theme === 'neon' ? p.series : p.accent;
    for (let i = 0; i < 140; i++) {
      ctx.globalAlpha = 0.15 + rnd() * 0.5;
      const r = rnd() * 2.6 + 0.6;
      ctx.beginPath();
      ctx.arc(rnd() * REPORT_W, rnd() * REPORT_H, r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.theme === 'neon') {
      const g = ctx.createRadialGradient(REPORT_W * 0.8, 260, 0, REPORT_W * 0.8, 260, 700);
      g.addColorStop(0, 'rgba(255, 63, 164, 0.35)');
      g.addColorStop(1, 'rgba(255, 63, 164, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, REPORT_W, REPORT_H);
    }
  }
  ctx.restore();
}

export function drawReport(canvas, report, p, { showQuestions = true, trackTitle = '' } = {}) {
  canvas.width = REPORT_W;
  canvas.height = REPORT_H;
  const ctx = canvas.getContext('2d');
  const M = 90; // kenar boşluğu
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, REPORT_W, REPORT_H);
  decorate(ctx, p);
  ctx.textBaseline = 'alphabetic';

  // Başlık
  ctx.fillStyle = p.accent;
  ctx.font = `600 34px ${SANS}`;
  ctx.fillText(`DERS TAKİP${trackTitle ? ` · ${trackTitle.toLocaleUpperCase('tr')}` : ''}`, M, 170);
  ctx.fillStyle = p.text;
  ctx.font = `500 118px ${SERIF}`;
  ctx.fillText('Haftalık rapor', M, 300);
  ctx.fillStyle = p.muted;
  ctx.font = `400 40px ${SANS}`;
  ctx.fillText(dateRange(report.weekStart, report.weekEnd), M, 370);

  // Toplam süre
  ctx.fillStyle = p.text;
  ctx.font = `500 168px ${SERIF}`;
  ctx.fillText(report.totalSeconds > 0 ? formatDuration(report.totalSeconds) : '0 dk', M, 580);
  ctx.fillStyle = p.muted;
  ctx.font = `400 38px ${SANS}`;
  let note = 'toplam çalışma';
  if (report.change !== null) note += ` · geçen haftaya göre ${report.change >= 0 ? '↑' : '↓'} %${Math.abs(report.change)}`;
  ctx.fillText(note, M, 645);

  // Günlük çubuklar
  const chartTop = 730;
  const chartH = 360;
  const colW = (REPORT_W - 2 * M) / 7;
  const max = Math.max(...report.days.map((d) => d.seconds), 1);
  report.days.forEach((d, i) => {
    const x = M + i * colW + colW * 0.22;
    const w = colW * 0.56;
    const h = Math.max(d.seconds > 0 ? 10 : 4, (d.seconds / max) * chartH);
    const isBest = report.best && d.date === report.best.date;
    ctx.fillStyle = d.seconds > 0 ? (isBest ? p.accent : p.series) : p.dim;
    roundRect(ctx, x, chartTop + chartH - h, w, h, 14);
    ctx.fill();
    ctx.fillStyle = isBest ? p.text : p.muted;
    ctx.font = `${isBest ? 600 : 400} 32px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(DAY_SHORT[i], x + w / 2, chartTop + chartH + 54);
    if (isBest) {
      ctx.font = `600 30px ${SANS}`;
      ctx.fillText(formatDuration(d.seconds), x + w / 2, chartTop + chartH - h - 20);
    }
    ctx.textAlign = 'left';
  });

  // Sayı kutuları
  const tiles = [[`${report.studiedDays} / 7`, 'çalışılan gün']];
  if (showQuestions) {
    tiles.push([report.questions.toLocaleString('tr-TR'), 'çözülen soru']);
    tiles.push([report.questions ? formatNet(report.net) : '—', 'net']);
    tiles.push([report.accuracy === null ? '—' : `%${report.accuracy}`, 'doğruluk']);
  }
  const tileTop = 1230;
  const gap = 24;
  const tileW = (REPORT_W - 2 * M - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach(([value, label], i) => {
    const x = M + i * (tileW + gap);
    ctx.fillStyle = p.surface;
    ctx.globalAlpha = 0.92;
    roundRect(ctx, x, tileTop, tileW, 190, 20);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = p.text;
    ctx.font = `500 ${tiles.length > 2 ? 64 : 80}px ${SERIF}`;
    ctx.fillText(value, x + 28, tileTop + 108);
    ctx.fillStyle = p.muted;
    ctx.font = `400 28px ${SANS}`;
    ctx.fillText(label, x + 28, tileTop + 156);
  });

  // En çok çalışılan dersler
  let y = 1530;
  if (report.topSubjects.length > 0) {
    ctx.fillStyle = p.muted;
    ctx.font = `600 30px ${SANS}`;
    ctx.fillText('EN ÇOK ÇALIŞTIĞIN DERSLER', M, y);
    y += 30;
    const top = report.topSubjects[0].seconds;
    for (const s of report.topSubjects) {
      y += 84;
      ctx.fillStyle = p.text;
      ctx.font = `500 36px ${SANS}`;
      ctx.fillText(s.label, M, y);
      ctx.fillStyle = p.muted;
      ctx.textAlign = 'right';
      ctx.fillText(formatDuration(s.seconds), REPORT_W - M, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = p.dim;
      roundRect(ctx, M, y + 16, REPORT_W - 2 * M, 10, 5);
      ctx.fill();
      ctx.fillStyle = p.series;
      roundRect(ctx, M, y + 16, (REPORT_W - 2 * M) * (s.seconds / top), 10, 5);
      ctx.fill();
    }
  }

  ctx.fillStyle = p.muted;
  ctx.font = `400 28px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('Damlaya damlaya göl olur.', REPORT_W / 2, REPORT_H - 70);
  ctx.textAlign = 'left';
}
