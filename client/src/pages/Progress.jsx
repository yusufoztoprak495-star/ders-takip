import { subjectLabel, tracksQuestions } from '../lib/tracks.js';
import { useTrack } from '../context/TrackContext.jsx';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api.js';
import ChartCard from '../components/ChartCard.jsx';
import { EmptyChart } from '../components/Doodles.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { QuestionStacks, SubjectTimeBars } from '../components/ProgressCharts.jsx';
import RangeFilter from '../components/RangeFilter.jsx';
import StatList from '../components/StatList.jsx';
import TimeSeriesCharts from '../components/TimeSeriesCharts.jsx';
import Heatmap from '../components/Heatmap.jsx';
import HourlyCard from '../components/HourlyCard.jsx';
import Outlook from '../components/Outlook.jsx';
import { useDailyStats } from '../hooks/useDailyStats.js';
import { daysAgo, toLocalDateString } from '../lib/dates.js';
import { formatDuration, formatNet, formatPercent } from '../lib/format.js';

const rowLabel = (r) => subjectLabel(r.subjectName, r.examType);
const questionTotal = (r) => r.correct + r.wrong + r.blank;

// Ana ilerleme sayfası (1. katman): tüm derslerin özeti. Bir derse tıklayınca ders sayfası açılır.
// Seçilen aralıkta en az bir dakika çalışılan gün sayısı
const studiedDays = (view) => view.days.filter((d) => d.totalSeconds > 0).length;

export default function Progress() {
  const exam = tracksQuestions(useTrack().track);
  const [subjects, setSubjects] = useState([]);
  const [range, setRange] = useState(14);
  const [subjectId, setSubjectId] = useState('all');
  const [bySubject, setBySubject] = useState(null);
  const [subjectError, setSubjectError] = useState(null);

  useEffect(() => {
    apiFetch('/api/subjects')
      .then(setSubjects)
      .catch((e) => setSubjectError(e.message));
  }, []);

  // Zaman grafikleri ve göstergeler, seçili derse (ya da tüm derslere) göre
  const { view, loading, error } = useDailyStats(range, subjectId === 'all' ? null : Number(subjectId));

  // Ders listesi ve ders karşılaştırma grafikleri her zaman tüm dersleri gösterir
  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    apiFetch(`/api/stats/by-subject?from=${daysAgo(range - 1, today)}&to=${toLocalDateString(today)}`)
      .then((rows) => !cancelled && setBySubject(rows))
      .catch((e) => !cancelled && setSubjectError(e.message));
    return () => {
      cancelled = true;
    };
  }, [range]);

  const rows = useMemo(() => {
    if (!bySubject) return null;
    return {
      time: bySubject.filter((r) => r.totalSeconds > 0).sort((a, b) => b.totalSeconds - a.totalSeconds),
      questions: bySubject.filter((r) => questionTotal(r) > 0).sort((a, b) => questionTotal(b) - questionTotal(a)),
    };
  }, [bySubject]);

  // Seçili aralıkta hiç kayıt yoksa grafikler yerine tek bir boş durum gösterilir
  const noData =
    view &&
    rows &&
    view.summary.totalSeconds === 0 &&
    view.summary.questions === 0 &&
    rows.time.length === 0 &&
    rows.questions.length === 0;

  const highlightId = subjectId === 'all' ? null : Number(subjectId);
  const chosen = subjects.find((s) => String(s.id) === subjectId);
  const scope = chosen ? subjectLabel(chosen.name, chosen.examType) : 'tüm dersler';

  return (
    <section>
      <h1>İlerleme</h1>
      <ErrorBanner message={error || subjectError} />
      <Heatmap />
      <Outlook showExams={exam} />

      <div className="filters">
        <RangeFilter range={range} onChange={setRange} />
        <label className="subject-filter">
          Ders
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="all">Tüm dersler</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {subjectLabel(s.name, s.examType)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted filter-note">
        Ders seçersen göstergeler ve zaman grafikleri o dersi gösterir; ders karşılaştırmalarında seçtiğin ders vurgulanır.
      </p>

      {view && (
        <div className={loading ? 'is-loading' : undefined}>
          <div className="kpis">
            <div className="tile">
              <span className="muted">Çalışma süresi</span>
              <strong>{formatDuration(view.summary.totalSeconds)}</strong>
            </div>
            {!exam && (
              <div className="tile">
                <span className="muted">Çalışılan gün</span>
                <strong>{studiedDays(view)}</strong>
              </div>
            )}
            {exam && (<>
            <div className="tile">
              <span className="muted">Çözülen soru</span>
              <strong>{view.summary.questions}</strong>
            </div>
            <div className="tile">
              <span className="muted">Net</span>
              <strong>{formatNet(view.summary.net)}</strong>
            </div>
            <div className="tile">
              <span className="muted">Doğruluk</span>
              <strong>{formatPercent(view.summary.accuracy)}</strong>
            </div>
            </>)}
          </div>

          {bySubject && (
            <>
              <h2>Dersler</h2>
              <p className="muted filter-note">Ayrıntı için bir derse tıkla.</p>
              <StatList
                columns={exam ? ['Ders', 'Süre', 'Çözülen soru', 'Net', 'Doğruluk'] : ['Ders', 'Süre']}
                rows={bySubject.map((r) => ({
                  key: r.subjectId,
                  to: `/ilerleme/ders/${r.subjectId}`,
                  name: rowLabel(r),
                  cells: exam
                    ? [
                        formatDuration(r.totalSeconds),
                        String(questionTotal(r)),
                        formatNet(r.net),
                        { text: formatPercent(r.accuracy), bar: r.accuracy },
                      ]
                    : [formatDuration(r.totalSeconds)],
                }))}
              />
            </>
          )}

          {noData ? (
            <EmptyState
              Doodle={EmptyChart}
              title="Bu aralıkta henüz kayıt yok"
              hint={exam ? 'Bir Pomodoro başlat ya da soru kaydı gir; grafikler burada belirir.' : 'Bir Pomodoro başlat ya da çalışma günlüğüne süre gir; grafikler burada belirir.'}
            />
          ) : (
            <>
          <h2>Grafikler</h2>
          <div className="chart-grid">
            <TimeSeriesCharts view={view} range={range} scope={scope} totalNote={chosen ? '' : ' (toplam)'} showNet={exam} />
            <HourlyCard range={range} subjectId={highlightId} scope={scope} />

            {rows && (
              <>
                <ChartCard
                  title="Derse göre çalışma süresi (saat)"
                  subtitle={`Son ${range} gün`}
                  empty={rows.time.length === 0}
                  headers={['Ders', 'Süre']}
                  rows={rows.time.map((r) => [rowLabel(r), formatDuration(r.totalSeconds)])}
                >
                  <SubjectTimeBars
                    rows={rows.time}
                    highlightId={highlightId}
                    ariaLabel={`Son ${range} günde derse göre çalışma süresi`}
                  />
                </ChartCard>

                {exam && <ChartCard
                  title="Derse göre doğru / yanlış / boş"
                  subtitle={`Son ${range} gün`}
                  empty={rows.questions.length === 0}
                  headers={['Ders', 'Doğru', 'Yanlış', 'Boş', 'Net']}
                  rows={rows.questions.map((r) => [rowLabel(r), r.correct, r.wrong, r.blank, formatNet(r.net)])}
                >
                  <QuestionStacks
                    rows={rows.questions}
                    highlightId={highlightId}
                    ariaLabel={`Son ${range} günde derse göre doğru, yanlış ve boş soru sayıları`}
                  />
                </ChartCard>}
              </>
            )}
          </div>
            </>
          )}
        </div>
      )}
      {!view && !error && <p className="muted">Yükleniyor…</p>}
    </section>
  );
}
