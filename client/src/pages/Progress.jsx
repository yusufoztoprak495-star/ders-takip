import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api.js';
import ChartCard from '../components/ChartCard.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { DurationColumns, NetLine, QuestionStacks, SubjectTimeBars } from '../components/ProgressCharts.jsx';
import { useChartTheme } from '../hooks/useChartTheme.js';
import { fillMissingDays, groupByWeek, summarize, weeklyFrom } from '../lib/charts.js';
import { daysAgo, toLocalDateString } from '../lib/dates.js';
import { formatDate, formatDuration, formatNet, formatShortDate } from '../lib/format.js';

const RANGES = [7, 14, 30, 90];

export default function Progress() {
  const theme = useChartTheme();
  const [subjects, setSubjects] = useState([]);
  const [range, setRange] = useState(14);
  const [subjectId, setSubjectId] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/subjects')
      .then(setSubjects)
      .catch((e) => setError(e.message));
  }, []);

  // Filtre değişince veri yeniden çekilir; yeni veri gelene kadar eski grafikler solukça kalır
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const today = new Date();
    const to = toLocalDateString(today);
    const rangeFrom = daysAgo(range - 1, today);
    const weekFrom = weeklyFrom(range, today); // haftalık grafik için daha geriye gider
    const subjectQuery = subjectId === 'all' ? '' : `&subjectId=${subjectId}`;

    Promise.all([
      apiFetch(`/api/stats/daily?from=${weekFrom}&to=${to}${subjectQuery}`),
      apiFetch(`/api/stats/by-subject?from=${rangeFrom}&to=${to}`),
    ])
      .then(([daily, bySubject]) => {
        if (cancelled) return;
        setData({ daily, bySubject, rangeFrom, weekFrom, to });
        setError(null);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [range, subjectId]);

  // Ham veriden grafiklerin ihtiyaç duyduğu biçimler
  const view = useMemo(() => {
    if (!data) return null;
    const days = fillMissingDays(data.daily, data.rangeFrom, data.to);
    const weeks = groupByWeek(fillMissingDays(data.daily, data.weekFrom, data.to));
    const label = (r) => `${r.subjectName} (${r.examType})`;
    return {
      days,
      weeks,
      summary: summarize(days),
      netDays: days.filter((d) => d.correct + d.wrong + d.blank > 0),
      timeRows: data.bySubject.filter((r) => r.totalSeconds > 0).sort((a, b) => b.totalSeconds - a.totalSeconds),
      questionRows: data.bySubject
        .filter((r) => r.correct + r.wrong + r.blank > 0)
        .sort((a, b) => b.correct + b.wrong + b.blank - (a.correct + a.wrong + a.blank)),
      label,
    };
  }, [data]);

  const highlightId = subjectId === 'all' ? null : Number(subjectId);
  const chosen = subjects.find((s) => String(s.id) === subjectId);
  const scope = chosen ? `${chosen.name} (${chosen.examType})` : 'tüm dersler';

  return (
    <section>
      <h1>İlerleme</h1>
      <ErrorBanner message={error} />

      <div className="filters">
        <div role="group" aria-label="Tarih aralığı" className="range-buttons">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={r === range ? '' : 'secondary'}
              aria-pressed={r === range}
              onClick={() => setRange(r)}
            >
              Son {r} gün
            </button>
          ))}
        </div>
        <label className="subject-filter">
          Ders
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="all">Tüm dersler</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.examType})
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted filter-note">
        Ders seçersen zaman grafikleri o dersi gösterir; ders karşılaştırmalarında seçtiğin ders vurgulanır.
      </p>

      {!view ? (
        !error && <p className="muted">Yükleniyor…</p>
      ) : (
        <div className={loading ? 'is-loading' : undefined}>
          <div className="kpis">
            <div className="tile">
              <span className="muted">Çalışma süresi</span>
              <strong>{formatDuration(view.summary.totalSeconds)}</strong>
            </div>
            <div className="tile">
              <span className="muted">Çözülen soru</span>
              <strong>{view.summary.questions}</strong>
            </div>
            <div className="tile">
              <span className="muted">Net</span>
              <strong>{formatNet(view.summary.net)}</strong>
            </div>
          </div>

          <div className="chart-grid">
            <ChartCard
              title="Günlük çalışma süresi (dakika)"
              subtitle={`Son ${range} gün · ${scope}`}
              empty={view.summary.totalSeconds === 0}
              headers={['Tarih', 'Süre']}
              rows={view.days.map((d) => [formatDate(d.date), formatDuration(d.totalSeconds)])}
            >
              <DurationColumns
                theme={theme}
                unit="dakika"
                labels={view.days.map((d) => formatShortDate(d.date))}
                seconds={view.days.map((d) => d.totalSeconds)}
                ariaLabel={`Son ${range} günün günlük çalışma süresi`}
              />
            </ChartCard>

            <ChartCard
              title="Haftalık çalışma süresi (saat)"
              subtitle={`Haftalar Pazartesi başlar · ${scope}`}
              empty={view.weeks.every((w) => w.totalSeconds === 0)}
              headers={['Hafta başlangıcı', 'Süre']}
              rows={view.weeks.map((w) => [formatDate(w.weekStart), formatDuration(w.totalSeconds)])}
            >
              <DurationColumns
                theme={theme}
                unit="saat"
                labels={view.weeks.map((w) => formatShortDate(w.weekStart))}
                seconds={view.weeks.map((w) => w.totalSeconds)}
                ariaLabel="Haftalık çalışma süresi"
              />
            </ChartCard>

            <ChartCard
              title="Derse göre çalışma süresi (saat)"
              subtitle={`Son ${range} gün`}
              empty={view.timeRows.length === 0}
              headers={['Ders', 'Süre']}
              rows={view.timeRows.map((r) => [view.label(r), formatDuration(r.totalSeconds)])}
            >
              <SubjectTimeBars
                theme={theme}
                rows={view.timeRows}
                highlightId={highlightId}
                ariaLabel={`Son ${range} günde derse göre çalışma süresi`}
              />
            </ChartCard>

            <ChartCard
              title="Derse göre doğru / yanlış / boş"
              subtitle={`Son ${range} gün`}
              empty={view.questionRows.length === 0}
              headers={['Ders', 'Doğru', 'Yanlış', 'Boş', 'Net']}
              rows={view.questionRows.map((r) => [view.label(r), r.correct, r.wrong, r.blank, formatNet(r.net)])}
            >
              <QuestionStacks
                theme={theme}
                rows={view.questionRows}
                highlightId={highlightId}
                ariaLabel={`Son ${range} günde derse göre doğru, yanlış ve boş soru sayıları`}
              />
            </ChartCard>

            <ChartCard
              title="Günlük net değişimi"
              subtitle={`Son ${range} gün · ${scope}${chosen ? '' : ' (toplam)'} · yalnızca soru çözülen günler`}
              empty={view.netDays.length === 0}
              headers={['Tarih', 'Doğru', 'Yanlış', 'Boş', 'Net']}
              rows={view.netDays.map((d) => [formatDate(d.date), d.correct, d.wrong, d.blank, formatNet(d.net)])}
            >
              <NetLine theme={theme} days={view.netDays} ariaLabel={`Son ${range} günün günlük net değişimi`} />
            </ChartCard>
          </div>
        </div>
      )}
    </section>
  );
}
