// Üniversite: harf notu, ders ortalaması, "finalden kaç almalıyım", AGNO ve devamsızlık hakkı. Saf.
// Harf aralıkları üniversiteden üniversiteye değişir; burada yaygın kullanılan 4'lük ölçek var.
export const LETTERS = [
  { letter: "AA", min: 90, points: 4 },
  { letter: "BA", min: 85, points: 3.5 },
  { letter: "BB", min: 80, points: 3 },
  { letter: "CB", min: 75, points: 2.5 },
  { letter: "CC", min: 70, points: 2 },
  { letter: "DC", min: 65, points: 1.5 },
  { letter: "DD", min: 60, points: 1 },
  { letter: "FD", min: 50, points: 0.5 },
  { letter: "FF", min: 0, points: 0 },
];

const round2 = (n) => Math.round(n * 100) / 100;

// 100'lük not → harf (not tam sayıya yuvarlanır: 89,5 → 90 → AA)
export function letterOf(score) {
  const rounded = Math.round(score);
  return LETTERS.find((l) => rounded >= l.min);
}

// components: [{ name, weight, score|null }] (ağırlıklar toplamı 100)
// average: girilen notların kendi ağırlıklarına göre ortalaması; complete: bütün notlar girildi mi
export function courseAverage(components) {
  const done = components.filter((c) => c.score !== null && c.score !== undefined);
  const weightDone = done.reduce((s, c) => s + c.weight, 0);
  const average = weightDone > 0 ? round2(done.reduce((s, c) => s + c.weight * c.score, 0) / weightDone) : null;
  return { average, complete: done.length === components.length && components.length > 0, weightDone };
}

// Hedef ortalamaya ulaşmak için notu girilmemiş sınav(lar)dan gereken not (hepsinden aynı not varsayılır).
// possible: 100'ü aşmıyorsa. Eksik sınav yoksa null.
export function neededScore(components, target) {
  const missing = components.filter((c) => c.score === null || c.score === undefined);
  if (missing.length === 0) return null;
  const known = components.filter((c) => !missing.includes(c)).reduce((s, c) => s + (c.weight * c.score) / 100, 0);
  const missingWeight = missing.reduce((s, c) => s + c.weight, 0) / 100;
  const raw = (target - known) / missingWeight;
  const score = Math.max(0, Math.ceil(round2(raw)));
  return { score, possible: score <= 100 };
}

// AGNO: notu tamamlanmış derslerin kredi ağırlıklı katsayı ortalaması
export function gpa(courses) {
  let credits = 0;
  let total = 0;
  for (const c of courses) {
    const { average, complete } = courseAverage(c.components);
    if (!complete || !c.credits) continue;
    credits += c.credits;
    total += c.credits * letterOf(average).points;
  }
  return { gpa: credits > 0 ? round2(total / credits) : null, credits };
}

// Bir ders bloğunun kaç "ders saati" olduğu (üniversitede 1 ders saati ~50 dakika; en az 1)
export function lessonHours(start, end) {
  return Math.max(1, Math.round((end - start) / 50));
}

// Yaygın kural: 14 haftalık dönemde derslerin %30'una kadar devamsızlık hakkı (aşağı yuvarlanır)
export function absenceAllowance(weeklyHours, weeks = 14, ratio = 0.3) {
  return Math.floor(weeklyHours * weeks * ratio);
}
