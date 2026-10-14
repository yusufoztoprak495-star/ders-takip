import { subjectLabel } from '../lib/tracks.js';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiFetch } from '../api.js';
import Breadcrumb from '../components/Breadcrumb.jsx';
import ChartCard from '../components/ChartCard.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { AccuracyLine } from '../components/ProgressCharts.jsx';
import StatList from '../components/StatList.jsx';
import { toLocalDateString } from '../lib/dates.js';
import { formatDate, formatDuration, formatLastStudied, formatNet, formatPercent } from '../lib/format.js';
import { accuracyOf } from '../lib/charts.js';
import { questionCount } from '../lib/topics.js';
import EmptyState from '../components/EmptyState.jsx';
import { EmptyNote } from '../components/Doodles.jsx';

const SERIES = [
  { key: 'correct', label: 'Doğru', color: 'var(--series-2)' },
  { key: 'wrong', label: 'Yanlış', color: 'var(--series-3)' },
  { key: 'blank', label: 'Boş', color: 'var(--series-blank)' },
];

// Tek bir yığılmış çubuk: doğru / yanlış / boş dağılımı, altında sayılarıyla
function Distribution({ detail }) {
  const total = questionCount(detail);
  return (
    <div className="distribution">
      <div className="distribution-bar" role="img" aria-label={SERIES.map((s) => `${s.label} ${detail[s.key]}`).join(', ')}>
        {SERIES.map((s) =>
          detail[s.key] > 0 ? (
            <i key={s.key} style={{ flexGrow: detail[s.key], background: s.color }} />
          ) : null,
        )}
      </div>
      <ul className="chart-legend">
        {SERIES.map((s) => (
          <li key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}: <strong>{detail[s.key]}</strong>
            <span className="muted"> ({total ? Math.round((detail[s.key] / total) * 100) : 0}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Konu sayfası (3. katman): bir konunun tüm zamanlardaki özeti.
export default function ProgressTopic() {
  const params = useParams();
  const subjectId = Number(params.subjectId);
  const [detail, setDetail] = useState(undefined); // undefined: yükleniyor, null: bulunamadı
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(undefined);
    apiFetch(`/api/stats/topic/${encodeURIComponent(params.topicId)}`)
      .then((d) => {
        // Adresteki ders, konunun gerçek dersiyle uyuşmuyorsa konu "bulunamadı" sayılır
        if (!cancelled) setDetail(d.subjectId === subjectId ? d : null);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.message === 'Konu bulunamadı') setDetail(null);
        else setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [params.topicId, subjectId]);

  if (detail === null) {
    return (
      <section>
        <Breadcrumb items={[{ label: 'İlerleme', to: '/ilerleme' }, { label: 'Konu bulunamadı' }]} />
        <h1>Konu bulunamadı</h1>
        <p className="muted">
          Bu adreste bir konu yok (silinmiş olabilir). <Link to="/ilerleme">İlerleme sayfasına dön</Link>
        </p>
      </section>
    );
  }

  if (!detail) {
    return (
      <section>
        <Breadcrumb items={[{ label: 'İlerleme', to: '/ilerleme' }, { label: '…' }]} />
        <ErrorBanner message={error} />
        {!error && <p className="muted">Yükleniyor…</p>}
      </section>
    );
  }

  const today = toLocalDateString(new Date());
  const hasQuestions = questionCount(detail) > 0;

  return (
    <section>
      <Breadcrumb
        items={[
          { label: 'İlerleme', to: '/ilerleme' },
          { label: detail.subjectName, to: `/ilerleme/ders/${detail.subjectId}` },
          { label: detail.topicName },
        ]}
      />
      <h1>{detail.topicName}</h1>
      <p className="muted">
        {subjectLabel(detail.subjectName, detail.examType)} · tüm zamanlar
      </p>

      <div className="kpis">
        <div className="tile">
          <span className="muted">Çalışma süresi</span>
          <strong>{formatDuration(detail.totalSeconds)}</strong>
        </div>
        <div className="tile">
          <span className="muted">Çözülen soru</span>
          <strong>{questionCount(detail)}</strong>
        </div>
        <div className="tile">
          <span className="muted">Net</span>
          <strong>{formatNet(detail.net)}</strong>
        </div>
        <div className="tile">
          <span className="muted">Doğruluk</span>
          <strong>{formatPercent(detail.accuracy)}</strong>
        </div>
      </div>
      <p className="last-studied">
        <span className="muted">En son çalıştığın gün: </span>
        <strong>{formatLastStudied(detail.lastStudiedAt, today)}</strong>
      </p>

      {!hasQuestions ? (
        <EmptyState
          Doodle={EmptyNote}
          title="Bu konuda henüz soru çözmedin"
          hint="Soru Kaydı sayfasından bu konuyu seçerek kayıt ekleyebilirsin."
        />
      ) : (
        <>
          <h2>Doğru / yanlış / boş</h2>
          <Distribution detail={detail} />

          <div className="chart-grid spaced">
            <ChartCard
              title="Günlük doğruluk oranı"
              subtitle="Yalnızca soru çözülen günler"
              empty={detail.daily.length < 2}
              emptyText="Grafik için en az iki farklı günde soru çözmen gerekir."
              headers={['Tarih', 'Doğru', 'Yanlış', 'Boş', 'Doğruluk']}
              rows={detail.daily.map((d) => [formatDate(d.date), d.correct, d.wrong, d.blank, formatPercent(d.accuracy)])}
            >
              <AccuracyLine days={detail.daily} ariaLabel="Günlük doğruluk oranının zaman içindeki değişimi" />
            </ChartCard>
          </div>

          <h2>Hangi kitaplardan çözdüm</h2>
          <StatList
            columns={['Kitap', 'Doğruluk', 'Çözülen soru']}
            rows={detail.books.map((b) => ({
              key: b.resourceId ?? 'kitapsiz',
              name: b.name,
              hint: b.publisher || undefined,
              cells: [
                (() => {
                  const accuracy = accuracyOf(b.correct, b.wrong, b.blank);
                  return { text: formatPercent(accuracy), bar: accuracy };
                })(),
                String(questionCount(b)),
              ],
            }))}
          />
        </>
      )}
    </section>
  );
}
