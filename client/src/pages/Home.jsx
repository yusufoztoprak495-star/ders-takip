import { useTrack } from '../context/TrackContext.jsx';
import { tracksQuestions } from '../lib/tracks.js';
import TrackIntro from '../components/TrackIntro.jsx';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { EmptyChart } from '../components/Doodles.jsx';
import EmptyState from '../components/EmptyState.jsx';
import BackupReminder from '../components/BackupReminder.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { fillMissingDays, summarize } from '../lib/charts.js';
import { daysAgo, daysBetween, toLocalDateString } from '../lib/dates.js';
import { trackInfo } from '../lib/tracks.js';
import { formatDate, formatDuration, formatNet, formatPercent, formatShortDate } from '../lib/format.js';
import { addDays, studyStreak, topSubjectOfDay, weeklyChange } from '../lib/insights.js';
import { quoteOfDay } from '../lib/quotes.js';

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

// Günün sözü: her gün farklı bir söz; "Başka söz" ile sıradakine geçilir
function DailyQuote({ date }) {
  const [offset, setOffset] = useState(0);
  const quote = quoteOfDay(date, offset);
  return (
    <figure className="daily-quote">
      <span className="panel-label">Günün sözü</span>
      <blockquote>{quote.text}</blockquote>
      <figcaption>
        <span>
          {quote.author}
          {quote.source && <cite>, {quote.source}</cite>}
        </span>
        <button type="button" className="secondary small" onClick={() => setOffset((o) => o + 1)}>
          Başka söz
        </button>
      </figcaption>
    </figure>
  );
}

// Sınava geri sayım: tarih Ayarlar'dan girilir. Girilmediyse küçük bir davet gösterilir.
function Countdown({ examDate, today, track }) {
  // Üniversitede tek bir sınav yok: geri sayım final haftasına yapılır
  const label = track === 'uni' ? 'Final' : trackInfo(track).label;
  if (!examDate) {
    return (
      <p className="countdown-invite muted">
        {label} tarihini girersen burada geri sayım görünür. <Link className="text-link" to="/ayarlar">Ayarlar'da gir</Link>
      </p>
    );
  }
  const days = daysBetween(today, examDate);
  if (days < 0) {
    return (
      <p className="countdown-invite muted">
        Girdiğin sınav tarihi geçti. <Link className="text-link" to="/ayarlar">Yeni tarihi gir</Link>
      </p>
    );
  }
  return (
    <div className="countdown" role="status">
      <span className="countdown-days">{days}</span>
      <span className="countdown-text">
        {days === 0 ? `Bugün ${label} günü. Başarılar!` : `gün kaldı · ${label} ${formatDate(examDate)}`}
        <span className="countdown-weeks muted">{days >= 14 ? `yaklaşık ${Math.floor(days / 7)} hafta` : ''}</span>
      </span>
    </div>
  );
}

// Günlük hedef çubuğu: bugünkü süre hedefin yüzde kaçı
function GoalBar({ seconds, goalMinutes }) {
  const percent = Math.min(100, Math.round((seconds / 60 / goalMinutes) * 100));
  const reached = percent >= 100;
  return (
    <div className={reached ? 'goal-bar reached' : 'goal-bar'}>
      <div className="goal-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Günlük hedef">
        <span style={{ width: `${percent}%` }} />
      </div>
      <span className="goal-text">
        {reached ? 'Günlük hedef tamam' : `Günlük hedef ${formatDuration(goalMinutes * 60)} · %${percent}`}
      </span>
    </div>
  );
}

// Bugün tekrarı gelen konular (bitirilen konular 1, 3, 7 ve 30 gün sonra buraya düşer)
const REVIEW_LIMIT = 6;
function DueReviews({ reviews, onReviewed, today }) {
  if (reviews.length === 0) return null;
  const shown = reviews.slice(0, REVIEW_LIMIT);
  return (
    <article className="panel panel-wide reviews">
      <h2 className="panel-label">Bugün tekrar edilecek konular</h2>
      <ul className="review-list">
        {shown.map((r) => {
          const late = daysBetween(r.nextReview, today);
          return (
            <li key={r.id}>
              <span className="review-topic">
                {r.name}
                <span className="muted">
                  {' '}
                  {r.subjectName}
                  {r.examType ? ` (${r.examType})` : ''} · {r.reviewStep + 1}. tekrar
                  {late > 0 ? ` · ${late} gün gecikti` : ''}
                </span>
              </span>
              <button type="button" className="secondary small" onClick={() => onReviewed(r)}>
                Tekrar ettim
              </button>
            </li>
          );
        })}
      </ul>
      {reviews.length > REVIEW_LIMIT && (
        <p className="panel-note">ve {reviews.length - REVIEW_LIMIT} konu daha. Önce en eskileri tekrar et.</p>
      )}
    </article>
  );
}

// Karşılama sayfası: bugünün özeti, haftalık değişim, çalışma serisi, günün dersi ve son haftanın ritmi
export default function Home() {
  const { track } = useTrack();
  const exam = tracksQuestions(track);
  const [goals, setGoals] = useState(null);
  const [reviews, setReviews] = useState([]);
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
    apiFetch('/api/goals').then(setGoals).catch(() => {});
    apiFetch(`/api/reviews?date=${to}`).then(setReviews).catch(() => {});
  }, []);

  async function handleReviewed(topic) {
    setError(null);
    try {
      await apiFetch(`/api/topics/${topic.id}/review`, { method: 'POST', body: { today } });
      setReviews(await apiFetch(`/api/reviews?date=${today}`));
    } catch (e) {
      setError(e.message);
    }
  }

  const view = useMemo(() => {
    if (!history || !todaySubjects) return null;
    const week = fillMissingDays(history, addDays(today, -6), today);
    return {
      week,
      todaySummary: summarize(week.slice(-1)),
      change: weeklyChange(history, today),
      streak: studyStreak(history, today),
      topSubject: topSubjectOfDay(todaySubjects),
      weekSeconds: week.reduce((t, d) => t + d.totalSeconds, 0),
      weekDays: week.filter((d) => d.totalSeconds > 0).length,
    };
  }, [history, todaySubjects, today]);

  return (
    <section>
      <h1>Bugün</h1>
      {goals && <Countdown examDate={goals.examDate} today={today} track={track} />}
      <TrackIntro />
      <DailyQuote date={today} />
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
                {exam ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div>
                      <span className="value">{formatDuration(view.weekSeconds)}</span>
                      <span className="label">Son 7 gün</span>
                    </div>
                    <div>
                      <span className="value">{view.weekDays}<small> / 7</small></span>
                      <span className="label">Çalışılan gün</span>
                    </div>
                  </>
                )}
              </div>
              {goals?.dailyGoal > 0 && <GoalBar seconds={view.todaySummary.totalSeconds} goalMinutes={goals.dailyGoal} />}
            </article>

            <DueReviews reviews={reviews} onReviewed={handleReviewed} today={today} />

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
                    {view.topSubject.subjectName}{' '}
                    {view.topSubject.examType && <small>({view.topSubject.examType})</small>}
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
          {view.week.every((d) => d.totalSeconds === 0 && (!exam || d.correct + d.wrong + d.blank === 0)) ? (
            <EmptyState
              Doodle={EmptyChart}
              title="Bu hafta henüz kayıt yok"
              hint={
                exam
                  ? 'Bir Pomodoro başlat ya da soru kaydı gir; son 7 günün burada görünür.'
                  : 'Bir Pomodoro başlat ya da çalışma günlüğüne süre gir; son 7 günün burada görünür.'
              }
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
