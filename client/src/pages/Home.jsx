import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { EmptyChart } from '../components/Doodles.jsx';
import EmptyState from '../components/EmptyState.jsx';
import BackupReminder from '../components/BackupReminder.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { fillMissingDays, summarize } from '../lib/charts.js';
import { daysAgo, toLocalDateString } from '../lib/dates.js';
import { formatDuration, formatNet, formatPercent, formatShortDate } from '../lib/format.js';
import { addDays, studyStreak, topSubjectOfDay, weeklyChange } from '../lib/insights.js';

// Seri ve haftalık karşılaştırma için bu kadar geriye bakılır (daha uzun seriler "365+" yazılır)
const HISTORY_DAYS = 365;

// Son 7 günün çalışma süresi: eksen ve sayı olmadan, yalnızca ritmi gösteren ince çubuklar.
// Bugünün çubuğu altın, öncekiler soluk.
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
            <rect x="0" y={height - h} width={barWidth} height={h} className={isToday ? 'bar today' : 'bar'} />
            <text x={barWidth / 2} y={height + 20} textAnchor="middle" className="bar-label">
              {formatShortDate(day.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Haftalık değişimin yazısı: ↑ %24, ↓ %12, "Değişmedi" ya da "Yeni"
function changeText(change) {
  if (change.direction === 'up') return `↑ %${change.percent}`;
  if (change.direction === 'down') return `↓ %${Math.abs(change.percent)}`;
  if (change.direction === 'new') return 'Yeni';
  return 'Değişmedi';
}

// Karşılama sayfası: bugünün özeti, haftalık değişim, çalışma serisi, günün dersi ve son haftanın ritmi
export default function Home() {
  const [history, setHistory] = useState(null);
  const [todaySubjects, setTodaySubjects] = useState(null);
  const [error, setError] = useState(null);
  const today = toLocalDateString(new Date());

  useEffect(() => {
    const now = new Date();
    const to = toLocalDateString(now);
    Promise.all([
      apiFetch(`/api/stats/daily?from=${daysAgo(HISTORY_DAYS - 1, now)}&to=${to}`),
      apiFetch(`/api/stats/by-subject?from=${to}&to=${to}`),
    ])
      .then(([daily, subjects]) => {
        setHistory(daily);
        setTodaySubjects(subjects);
      })
      .catch((e) => setError(e.message));
  }, []);

  const view = useMemo(() => {
    if (!history || !todaySubjects) return null;
    const week = fillMissingDays(history, addDays(today, -6), today);
    return {
      week,
      todaySummary: summarize(week.slice(-1)),
      change: weeklyChange(history, today),
      streak: studyStreak(history, today),
      topSubject: topSubjectOfDay(todaySubjects),
    };
  }, [history, todaySubjects, today]);

  return (
    <section>
      <h1>Bugün</h1>
      <ErrorBanner message={error} />
      <BackupReminder />

      {view && (
        <>
          <div className="panels">
            <article className="panel panel-wide">
              <h2 className="panel-label">Bugünün özeti</h2>
              <div className="today-grid">
                <div>
                  <span className="value">{formatDuration(view.todaySummary.totalSeconds)}</span>
                  <span className="label">Çalışma süresi</span>
                </div>
                <div>
                  <span className="value">{view.todaySummary.questions}</span>
                  <span className="label">Çözülen soru</span>
                </div>
                <div>
                  <span className="value">{formatNet(view.todaySummary.net)}</span>
                  <span className="label">Net</span>
                </div>
                <div>
                  <span className="value">{formatPercent(view.todaySummary.accuracy)}</span>
                  <span className="label">Doğruluk</span>
                </div>
              </div>
            </article>

            <article className="panel">
              <h2 className="panel-label">Haftalık değişim</h2>
              <span className={`value change-${view.change.direction}`}>{changeText(view.change)}</span>
              <p className="panel-note">
                Son 7 gün {formatDuration(view.change.current)}
                <br />
                Önceki 7 gün {formatDuration(view.change.previous)}
              </p>
            </article>

            <article className="panel">
              <h2 className="panel-label">Seri</h2>
              <span className="value">
                {view.streak.count >= HISTORY_DAYS ? `${HISTORY_DAYS}+` : view.streak.count}
                <small> gün</small>
              </span>
              <p className="panel-note">
                {view.streak.activeToday
                  ? 'Bugün de çalıştın.'
                  : view.streak.count > 0
                    ? 'Bugün henüz kayıt yok, seriyi sürdür.'
                    : 'Bugün başlarsan seri başlar.'}
              </p>
            </article>

            <article className="panel panel-wide">
              <h2 className="panel-label">Günün dersi</h2>
              {view.topSubject ? (
                <>
                  <span className="value">
                    {view.topSubject.subjectName} <small>({view.topSubject.examType})</small>
                  </span>
                  <p className="panel-note">Bugün en çok bu derse çalıştın: {formatDuration(view.topSubject.totalSeconds)}</p>
                </>
              ) : (
                <>
                  <span className="value muted">—</span>
                  <p className="panel-note">Bugün henüz bir derse çalışma kaydı yok.</p>
                </>
              )}
            </article>
          </div>

          <h2>Son 7 gün</h2>
          {view.week.every((d) => d.totalSeconds === 0 && d.correct + d.wrong + d.blank === 0) ? (
            <EmptyState
              Doodle={EmptyChart}
              title="Bu hafta henüz kayıt yok"
              hint="Bir Pomodoro başlat ya da soru kaydı gir; son 7 günün burada görünür."
            />
          ) : (
            <WeekBars days={view.week} />
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
