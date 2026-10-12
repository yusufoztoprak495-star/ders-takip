// Pomodoro kadranı için saf hesaplar (arayüzden bağımsız, test edilebilir).

// Kalan süreye göre kaç çentik yanık kalır. Yukarı yuvarlanır: son çentik
// süre gerçekten bitene kadar yanık kalır (formatTime'daki 00:00 mantığıyla aynı).
export function litTicks(remainingSec, durationSec, count = 60) {
  if (!(durationSec > 0)) return 0;
  const ratio = Math.min(1, Math.max(0, remainingSec / durationSec));
  return Math.min(count, Math.ceil(ratio * count));
}

// index. çentiğin çizgi uçları. Kadran merkezi (center, center), 0. çentik 12 yönünde,
// saat yönünde ilerler. (x1,y1) dış uç, (x2,y2) merkeze bakan iç uçtur.
export function tickPosition(index, count, center, radius, length = 12) {
  const angle = (index / count) * 2 * Math.PI;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const inner = radius - length;
  return {
    x1: center + radius * sin,
    y1: center - radius * cos,
    x2: center + inner * sin,
    y2: center - inner * cos,
  };
}
