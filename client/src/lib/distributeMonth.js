// Ayın bitmemiş konularını haftalara dağıtır ve sonucu kaydeder. Hem Aylık Plan hem Haftalık Program sayfası kullanır.
// Akış: ders programı + ortak bloklar + o ayın haftaya özel blokları okunur → her haftanın boş çalışma süresi
// hesaplanır (lib/monthWeeks.js) → konular bu süreyle orantılı paylaştırılır → haftalar tek istekle yazılır.
import { apiFetch } from '../api.js';
import { monthOf, weekOfDate } from './months.js';
import { DEFAULT_DAILY_STUDY, distributeTopics, monthCapacities } from './monthWeeks.js';

// month: 'YYYY-AA' · fromDate: bu günden önceki günler sayılmaz (null = ayın tamamı)
// Dönen: { assigned, counts, capacities (dakika), noCapacity }
export async function distributeMonth({ month, fromDate = null }) {
  const [classes, plans, weekPlans, win, goals, monthPlans, subjects] = await Promise.all([
    apiFetch('/api/classes'),
    apiFetch('/api/plans'),
    apiFetch(`/api/week-plans?month=${month}`),
    apiFetch('/api/schedule'),
    apiFetch('/api/goals'),
    apiFetch(`/api/month-plans?month=${month}`),
    apiFetch('/api/subjects'),
  ]);
  if (monthPlans.length === 0) throw new Error('Bu ay için planlanmış konu yok. Önce Aylık Plan’dan konu ekle.');

  const dailyStudy = goals.dailyGoal > 0 ? goals.dailyGoal : DEFAULT_DAILY_STUDY;
  const capacities = monthCapacities({ month, classes, plans, weekPlans, window: win, dailyStudy, fromDate });

  // Konular ders sırasıyla (Dersler ve Konular sayfasındaki sıra), ders içinde eklenme sırasıyla gider
  const order = new Map(subjects.map((s, i) => [s.id, i]));
  const sorted = [...monthPlans].sort(
    (a, b) => (order.get(a.subjectId) ?? Infinity) - (order.get(b.subjectId) ?? Infinity) || a.id - b.id,
  );
  const open = sorted.filter((p) => !p.doneAt);
  const result = distributeTopics({ topics: open, capacities: capacities.map((c) => c.total) });

  const weeks = result.assignments.map((a) => ({ id: a.id, week: a.week }));
  // Bitmiş ama haftası olmayan konular, bittikleri haftaya yazılır (haftalık görünümde kaybolmasınlar)
  for (const p of sorted) {
    if (p.doneAt && p.week == null && monthOf(p.doneAt) === month) weeks.push({ id: p.id, week: weekOfDate(p.doneAt).week });
  }
  if (weeks.length > 0) await apiFetch('/api/month-plans/weeks', { method: 'PUT', body: { month, weeks } });

  return {
    assigned: result.assignments.length,
    counts: result.counts,
    capacities: capacities.map((c) => c.total),
    noCapacity: result.noCapacity,
  };
}

// Dağıtımın kısa, düz Türkçe özeti (bildirim için): "Hafta 1: 3, Hafta 2: 2 ..."
export function distributionSummary(result) {
  const parts = result.counts.map((n, i) => `Hafta ${i + 1}: ${n}`);
  let text = `${result.assigned} konu haftalara dağıtıldı (${parts.join(', ')}).`;
  if (result.noCapacity) {
    text += ' Hiçbir haftada boş çalışma süresi görünmüyor, konular eşit bölündü; ders saatlerini ve blokları kontrol et.';
  }
  return text;
}
