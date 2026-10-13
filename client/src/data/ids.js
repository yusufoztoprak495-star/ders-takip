// Yeni kaydın kimliği: mevcut en büyük kimliğin bir fazlası
export function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}
