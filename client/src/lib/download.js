// Tarayıcıda dosya indirtir (yedek, takvim dosyası, rapor görseli)
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Bazı tarayıcılar indirmeyi hemen iptal etmesin diye adres biraz sonra bırakılır
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
