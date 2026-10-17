import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { celebrate } from '../lib/celebrate.js';
import { formatClock } from '../lib/schedule.js';

const KIND_LABEL = { class: 'Ders', study: 'Çalışma', break: 'Mola', other: 'Diğer' };

// Ana sayfa: bugünün dersleri ve haftalık programdaki blokları. Şu anki ya da sıradaki blok vurgulanır;
// çalışma bloğundan pomodoro o dersle hazır açılır, blok tek tıkla "yapıldı" işaretlenir.
export default function TodayPlan({ today }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [minute, setMinute] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  const load = useCallback(() => {
    apiFetch(`/api/today?date=${today}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [today]);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      const d = new Date();
      setMinute(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, [load]);

  async function toggle(item, anchor) {
    const done = !item.done;
    setData((d) => ({ ...d, items: d.items.map((i) => (i === item ? { ...i, done } : i)) }));
    try {
      await apiFetch(`/api/plans/${item.id}/done`, { method: 'PUT', body: { date: today, done } });
      if (done) celebrate(anchor, null);
    } catch (e) {
      setError(e.message);
      load();
    }
  }

  if (!data) return null;
  const items = data.items;
  // Şu an süren ya da sıradaki ilk öğe
  const focus = items.find((i) => i.end > minute);
  const plans = items.filter((i) => i.type !== 'class');
  const doneCount = plans.filter((i) => i.done).length;

  return (
    <article className="panel panel-wide today-plan">
      <header className="today-head">
        <h2 className="panel-label">Bugünün programı</h2>
        {plans.length > 0 && (
          <span className="muted small-note">
            {doneCount} / {plans.length} blok yapıldı
          </span>
        )}
      </header>
      {error && <p className="panel-note">{error}</p>}
      {items.length === 0 ? (
        <p className="panel-note">
          Bugün için ders ya da blok yok. <Link className="text-link" to="/haftalik">Haftalık programı planla</Link>
        </p>
      ) : (
        <ol className="today-list">
          {items.map((item) => {
            const now = item === focus && item.start <= minute;
            const next = item === focus && item.start > minute;
            const cls = ['today-item', `t-${item.type}`, item.done && 'is-done', now && 'is-now', next && 'is-next']
              .filter(Boolean)
              .join(' ');
            return (
              <li key={`${item.type === 'class' ? 'c' : 'p'}${item.id}`} className={cls}>
                <span className="today-time">
                  {formatClock(item.start)}–{formatClock(item.end)}
                </span>
                <span className="today-title">
                  {item.subjectName && item.note ? `${item.subjectName}: ${item.note}` : item.title}
                  <span className="muted">
                    {' '}
                    {KIND_LABEL[item.type]}
                    {now ? ' · şu an' : next ? ' · sıradaki' : ''}
                  </span>
                </span>
                {item.type !== 'class' && (
                  <span className="actions">
                    {item.type === 'study' && !item.done && (
                      <Link
                        className="button-link small-link"
                        to={`/pomodoro?blok=${item.id}${item.subjectId ? `&ders=${item.subjectId}` : ''}`}
                      >
                        Başlat
                      </Link>
                    )}
                    <button
                      type="button"
                      className={item.done ? 'secondary small done-toggle on' : 'secondary small done-toggle'}
                      aria-pressed={item.done}
                      onClick={(e) => toggle(item, e.currentTarget)}
                    >
                      {item.done ? 'Yapıldı ✓' : 'Yapıldı'}
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
