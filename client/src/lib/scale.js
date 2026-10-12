// Grafik eksenleri için saf yardımcılar (arayüzden bağımsız, test edilebilir).

const round = (n) => Math.round(n * 1e9) / 1e9; // 0.1 + 0.2 gibi ondalık artıklarını temizler

// Eksen için "yuvarlak" sınırlar ve çizgi konumları: adım 1, 2 ya da 5'in 10 katlarıdır.
// maxValue verilerin en büyüğü; min verilmezse eksen 0'dan başlar.
export function niceTicks(maxValue, { min = 0, count = 5 } = {}) {
  const top = Number.isFinite(maxValue) ? maxValue : min;
  if (!(top > min)) {
    // Tüm değerler eşit (ya da hiç yok): yine de çizilebilir bir aralık ver
    return { min, max: round(min + 1), ticks: [min, round(min + 1)] };
  }
  const rawStep = (top - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const niceMin = min === 0 ? 0 : round(Math.floor(min / step + 1e-9) * step);
  const niceMax = round(Math.ceil(top / step - 1e-9) * step);
  const ticks = [];
  for (let v = niceMin; v <= niceMax + step / 2; v += step) ticks.push(round(v));
  return { min: niceMin, max: niceMax, ticks };
}

// Çok sayıda kategori varken hangilerinin etiketleneceği: eşit aralıklı, ilk ve son her zaman dahil.
export function labelIndexes(total, maxLabels) {
  if (total <= 0) return [];
  if (total <= maxLabels) return Array.from({ length: total }, (_, i) => i);
  const step = Math.ceil((total - 1) / (maxLabels - 1));
  const picked = [];
  for (let i = 0; i < total - 1; i += step) picked.push(i);
  // Son etiket bir öncekine çok yakınsa öncekini at (üst üste binmesin)
  if (picked.length > 1 && total - 1 - picked[picked.length - 1] < step * 0.6) picked.pop();
  picked.push(total - 1);
  return picked;
}
