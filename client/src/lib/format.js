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
