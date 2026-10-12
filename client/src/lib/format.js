// Saniyeyi okunur süreye çevirir: 45 -> '45 sn', 1500 -> '25 dk', 5400 -> '1 sa 30 dk'
export function formatDuration(totalSeconds) {
  if (totalSeconds < 60) return `${totalSeconds} sn`;
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} dk`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} sa ${minutes} dk` : `${hours} sa`;
}

// Neti Türkçe ondalık virgülüyle gösterir: 2.75 -> '2,75', 9 -> '9'
export function formatNet(net) {
  return net.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

// '2026-10-12' -> '12.10.2026'
export function formatDate(dateString) {
  const [y, m, d] = dateString.split('-');
  return `${d}.${m}.${y}`;
}

// '2026-10-12' -> '12.10' (grafik eksenlerinde yer kazanmak için yılsız)
export function formatShortDate(dateString) {
  return formatDate(dateString).slice(0, 5);
}

// Çalışma günlüğüne kayıt eklenince gösterilen bildirim. Başka bir güne eklendiyse hangi güne
// gittiğini söyler: liste yalnızca bugünü gösterdiği için kayıt aksi halde "kaybolmuş" görünür.
export function addedNotice(date, today) {
  if (date === today) return 'Kayıt eklendi.';
  return `Kayıt eklendi (${formatDate(date)}). Bugün listesinde görünmez.`;
}

// 75 -> '%75'; soru çözülmemişse (null) çizgi
export function formatPercent(accuracy) {
  return accuracy === null ? '—' : `%${accuracy}`;
}

// 'Bugün', 'Dün · 11.10.2026', '3 gün önce · 09.10.2026'; hiç yoksa 'Henüz çalışılmadı'
export function formatLastStudied(dateString, todayString) {
  if (!dateString) return 'Henüz çalışılmadı';
  const toUtcDay = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 86_400_000;
  };
  const days = toUtcDay(todayString) - toUtcDay(dateString);
  if (days <= 0) return 'Bugün';
  return `${days === 1 ? 'Dün' : `${days} gün önce`} · ${formatDate(dateString)}`;
}

// Kitabın son çözüm tarihi: 'Bugün', '3 gün önce · 09.10.2026'; hiç yoksa 'Henüz test çözülmedi'
export function formatLastSolved(dateString, todayString) {
  return dateString ? formatLastStudied(dateString, todayString) : 'Henüz test çözülmedi';
}
