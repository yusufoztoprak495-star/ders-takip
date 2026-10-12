// Konu listeleri için saf yardımcılar.

export const questionCount = (row) => row.correct + row.wrong + row.blank;

// Konuları en zayıftan en güçlüye sıralar (girdiyi değiştirmez).
// Ölçüt doğruluk oranıdır; hiç soru çözülmemiş (accuracy null) konular en sonda durur.
// Aynı oranda çok soru çözülen önce gelir (az sayıdan çıkan oran daha az güvenilirdir).
export function sortWeakestFirst(rows) {
  return [...rows].sort((a, b) => {
    if (a.accuracy === null && b.accuracy === null) return a.topicName.localeCompare(b.topicName, 'tr');
    if (a.accuracy === null) return 1;
    if (b.accuracy === null) return -1;
    return (
      a.accuracy - b.accuracy ||
      questionCount(b) - questionCount(a) ||
      a.topicName.localeCompare(b.topicName, 'tr')
    );
  });
}
