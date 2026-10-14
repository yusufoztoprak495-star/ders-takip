import { subjectLabel, tracksQuestions } from '../lib/tracks.js';
import { useTrack } from '../context/TrackContext.jsx';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import RangeFilter from '../components/RangeFilter.jsx';
import StatList from '../components/StatList.jsx';
import TimeSeriesCharts from '../components/TimeSeriesCharts.jsx';
import { useDailyStats } from '../hooks/useDailyStats.js';
import { daysAgo, toLocalDateString } from '../lib/dates.js';
import { formatDuration, formatNet, formatPercent } from '../lib/format.js';
import { questionCount, sortWeakestFirst } from '../lib/topics.js';
import EmptyState from '../components/EmptyState.jsx';
import { EmptyBook } from '../components/Doodles.jsx';

// Ders sayfası (2. katman): o dersin göstergeleri, zaman grafikleri ve konular (en zayıftan en güçlüye).
export default function ProgressSubject() {
  const exam = tracksQuestions(useTrack().track);
  const subjectId = Number(useParams().subjectId);
  const [range, setRange] = useState(30);
  const [subject, setSubject] = useState(undefined); // undefined: yükleniyor, null: bulunamadı
  const [totals, setTotals] = useState(null);
  const [topicRows, setTopicRows] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const { view, loading, error } = useDailyStats(range, subjectId);

  useEffect(() => {
    apiFetch('/api/subjects')
      .then((list) => setSubject(list.find((s) => s.id === subjectId) ?? null))
      .catch((e) => setLoadError(e.message));
  }, [subjectId]);

  useEffect(() => {
    if (!subject) return undefined;
    let cancelled = false;
    const today = new Date();
    const query = `from=${daysAgo(range - 1, today)}&to=${toLocalDateString(today)}`;
    Promise.all([apiFetch(`/api/stats/by-subject?${query}`), apiFetch(`/api/stats/by-topic?subjectId=${subjectId}&${query}`)])
      .then(([subjects, topics]) => {
        if (cancelled) return;
        setTotals(subjects.find((s) => s.subjectId === subjectId) ?? null);
        setTopicRows(topics);
      })
      .catch((e) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [subject, subjectId, range]);

  // Sınavda zayıftan güçlüye; üniversitede en çok çalışılandan aza (soru takibi yok)
  const sortedTopics = useMemo(() => {
    if (!topicRows) return null;
    return exam ? sortWeakestFirst(topicRows) : [...topicRows].sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [topicRows, exam]);

  if (subject === null) {
    return (
      <section>
        <Breadcrumb items={[{ label: 'İlerleme', to: '/ilerleme' }, { label: 'Ders bulunamadı' }]} />
        <h1>Ders bulunamadı</h1>
        <p className="muted">
          Bu adreste bir ders yok. <Link to="/ilerleme">İlerleme sayfasına dön</Link>
        </p>
      </section>
    );
  }

  const title = subject ? subjectLabel(subject.name, subject.examType) : '';

  return (
    <section>
      <Breadcrumb items={[{ label: 'İlerleme', to: '/ilerleme' }, { label: subject?.name ?? '…' }]} />
      <h1>{title || 'Yükleniyor…'}</h1>
      <ErrorBanner message={error || loadError} />
      <div className="filters">
        <RangeFilter range={range} onChange={setRange} />
      </div>

      {view && totals && (
        <div className={loading ? 'is-loading' : undefined}>
          <div className="kpis">
            <div className="tile">
              <span className="muted">Çalışma süresi</span>
              <strong>{formatDuration(totals.totalSeconds)}</strong>
            </div>
            {!exam && (
              <div className="tile">
                <span className="muted">Çalışılan gün</span>
                <strong>{view.days.filter((d) => d.totalSeconds > 0).length}</strong>
              </div>
            )}
            {exam && (<>
            <div className="tile">
              <span className="muted">Çözülen soru</span>
              <strong>{questionCount(totals)}</strong>
            </div>
            <div className="tile">
              <span className="muted">Net</span>
              <strong>{formatNet(totals.net)}</strong>
            </div>
            <div className="tile">
              <span className="muted">Doğruluk</span>
              <strong>{formatPercent(totals.accuracy)}</strong>
            </div>
            </>)}
          </div>

          <h2>Konular</h2>
          <p className="muted filter-note">
            {exam
              ? 'En zayıftan en güçlüye (doğruluk oranına göre). Henüz soru çözmediğin konular sönük ve en altta. Ayrıntı için bir konuya tıkla.'
              : 'En çok çalıştığından en aza. Ayrıntı için bir konuya tıkla.'}
          </p>
          {sortedTopics && sortedTopics.length > 0 ? (
            <StatList
              columns={exam ? ['Konu', 'Doğruluk', 'Çözülen soru', 'Net', 'Süre'] : ['Konu', 'Süre']}
              rows={sortedTopics.map((t) => ({
                key: t.topicId,
                to: `/ilerleme/ders/${subjectId}/konu/${t.topicId}`,
                name: t.topicName,
                muted: exam ? t.accuracy === null : t.totalSeconds === 0, // verisi olmayan konular sönük
                cells: !exam ? [formatDuration(t.totalSeconds)] : [
                  { text: formatPercent(t.accuracy), bar: t.accuracy },
                  String(questionCount(t)),
                  t.accuracy === null ? '—' : formatNet(t.net),
                  formatDuration(t.totalSeconds),
                ],
              }))}
            />
          ) : (
            <EmptyState Doodle={EmptyBook} title="Bu derste henüz konu yok" hint="Konular sayfasından ekleyebilirsin." />
          )}

          <h2>Grafikler</h2>
          <div className="chart-grid">
            <TimeSeriesCharts view={view} range={range} scope={title} showNet={exam} />
          </div>
        </div>
      )}
    </section>
  );
}
