import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import {
  fillMissingDays,
  groupByWeek,
  summarize,
  weeklyFrom,
} from "../lib/charts.js";
import { daysAgo, toLocalDateString } from "../lib/dates.js";

// Seçilen aralık (gün) ve ders için günlük istatistikleri çeker ve grafiklerin ihtiyaç duyduğu
// biçimlere çevirir. subjectId null ise tüm dersler. Yeni veri gelirken eski değerler kalır (loading true).
export function useDailyStats(range, subjectId = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const today = new Date();
    const to = toLocalDateString(today);
    const rangeFrom = daysAgo(range - 1, today);
    const weekFrom = weeklyFrom(range, today); // haftalık grafik için daha geriye gider
    const subjectQuery = subjectId === null ? "" : `&subjectId=${subjectId}`;

    apiFetch(`/api/stats/daily?from=${weekFrom}&to=${to}${subjectQuery}`)
      .then((daily) => {
        if (cancelled) return;
        setData({ daily, rangeFrom, weekFrom, to });
        setError(null);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [range, subjectId]);

  const view = useMemo(() => {
    if (!data) return null;
    const days = fillMissingDays(data.daily, data.rangeFrom, data.to);
    return {
      days,
      weeks: groupByWeek(fillMissingDays(data.daily, data.weekFrom, data.to)),
      summary: summarize(days),
      netDays: days.filter((d) => d.correct + d.wrong + d.blank > 0),
    };
  }, [data]);

  return { view, loading, error };
}
