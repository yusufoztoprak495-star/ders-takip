import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { fillMissingDays, summarize } from '../lib/charts.js';
import { daysAgo, toLocalDateString } from '../lib/dates.js';
import { formatDuration, formatNet, formatShortDate } from '../lib/format.js';
import EmptyState from '../components/EmptyState.jsx';
import { EmptyChart } from '../components/Doodles.jsx';

// Son 7 günün çalışma süresi: eksen ve sayı olmadan, yalnızca ritmi gösteren ince çubuklar.
// Bugünün çubuğu turuncu, öncekiler soluk.
function WeekBars({ days }) {
  const max = Math.max(...days.map((d) => d.totalSeconds), 1);
  const barWidth = 10;
  const gap = 44;
  const height = 90;
  return (
    <svg
      className="week-bars"
      viewBox={`-16 0 ${days.length * (barWidth + gap) - gap + 32} ${height + 26}`}
      role="img"
      aria-label={`Son 7 günün çalışma süresi: ${days
        .map((d) => `${formatShortDate(d.date)} ${formatDuration(d.totalSeconds)}`)
        .join(', ')}`}
    >
      {days.map((day, i) => {
        const h = day.totalSeconds === 0 ? 2 : Math.max(4, (day.totalSeconds / max) * height);
        const isToday = i === days.length - 1;
        return (
          <g key={day.date} transform={`translate(${i * (barWidth + gap)} 0)`}>
            <rect
              x="0"
              y={height - h}
              width={barWidth}
              height={h}
              className={isToday ? 'bar today' : 'bar'}
            />
            <text x={barWidth / 2} y={height + 20} textAnchor="middle" className="bar-label">
              {formatShortDate(day.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Karşılama sayfası: bugünün özeti ve son haftanın ritmi
export default function Home() {
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const today = new Date();
    const to = toLocalDateString(today);
    const from = daysAgo(6, today);
    apiFetch(`/api/stats/daily?from=${from}&to=${to}`)
      .then((daily) => setDays(fillMissingDays(daily, from, to)))
      .catch((e) => setError(e.message));
  }, []);

  const today = days?.[days.length - 1];
  const todaySummary = today && summarize([today]);

  return (
    <section>
      <h1>Bugün</h1>
      <ErrorBanner message={error} />

      {days && (
        <>
          <div className="kpis">
            <div className="tile">
              <span className="muted">Çalışma süresi</span>
              <strong>{formatDuration(todaySummary.totalSeconds)}</strong>
            </div>
            <div className="tile">
              <span className="muted">Çözülen soru</span>
              <strong>{todaySummary.questions}</strong>
            </div>
            <div className="tile">
              <span className="muted">Net</span>
              <strong>{formatNet(todaySummary.net)}</strong>
            </div>
          </div>

          <h2>Son 7 gün</h2>
          {days.every((d) => d.totalSeconds === 0 && d.correct + d.wrong + d.blank === 0) ? (
            <EmptyState
              Doodle={EmptyChart}
              title="Bu hafta henüz kayıt yok"
              hint="Bir Pomodoro başlat ya da soru kaydı gir; son 7 günün burada görünür."
            />
          ) : (
            <WeekBars days={days} />
          )}

          <p className="home-actions">
            <Link to="/pomodoro" className="button-link">
              Pomodoro başlat
            </Link>
            <Link to="/ilerleme" className="text-link">
              Tüm grafikler
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
