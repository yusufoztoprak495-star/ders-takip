import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { usePomodoro } from '../context/PomodoroContext.jsx';
import { formatTime } from '../lib/pomodoro.js';

export default function Pomodoro() {
  const { settings, updateSettings, phase, remaining, pending, notice, start, cancel, retry, dismissPending } =
    usePomodoro();
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/subjects')
      .then((list) => {
        setSubjects(list);
        setSubjectId((current) => current || String(list[0]?.id ?? ''));
      })
      .catch((e) => setError(e.message));
  }, []);

  const subject = subjects.find((s) => String(s.id) === subjectId);
  const runningSubject = phase && subjects.find((s) => s.id === phase.subjectId);

  function handleStart(event) {
    event.preventDefault();
    if (!subject) return;
    start({ subjectId: subject.id, topicId: topicId ? Number(topicId) : null });
  }

  // Dakika alanları: yalnızca pozitif tam sayı kabul edilir
  function handleMinutes(field, value) {
    const minutes = Number(value);
    if (Number.isInteger(minutes) && minutes > 0) {
      updateSettings({ ...settings, [field]: minutes });
    }
  }

  return (
    <section>
      <h1>Pomodoro</h1>
      <ErrorBanner message={error} />

      {pending.map((item) => (
        <div key={item.id} className="error-banner pending" role="alert">
          <span>
            Çalışma kaydedilemedi ({Math.round(item.payload.durationSeconds / 60)} dk): {item.message}
          </span>
          <span className="actions">
            <button type="button" onClick={() => retry(item.id)}>
              Tekrar dene
            </button>
            <button type="button" className="secondary" onClick={() => dismissPending(item.id)}>
              Vazgeç
            </button>
          </span>
        </div>
      ))}

      {notice && !phase && <p className="notice">{notice}</p>}

      {phase ? (
        <div className="card timer-card">
          <p className="muted">
            {phase.kind === 'work' ? `Çalışma · ${runningSubject?.name ?? ''}` : 'Mola'}
          </p>
          <div className="timer" aria-live="off">
            {formatTime(remaining)}
          </div>
          <button type="button" className="secondary" onClick={cancel}>
            Vazgeç
          </button>
        </div>
      ) : (
        <form className="card" onSubmit={handleStart}>
          <label>
            Ders
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTopicId('');
              }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.examType})
                </option>
              ))}
            </select>
          </label>
          <label>
            Konu (isteğe bağlı)
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">Konu seçme</option>
              {subject?.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <label>
              Çalışma (dk)
              <input
                type="number"
                min="1"
                value={settings.workMinutes}
                onChange={(e) => handleMinutes('workMinutes', e.target.value)}
              />
            </label>
            <label>
              Mola (dk)
              <input
                type="number"
                min="1"
                value={settings.breakMinutes}
                onChange={(e) => handleMinutes('breakMinutes', e.target.value)}
              />
            </label>
          </div>
          <button type="submit" disabled={!subject}>
            Başlat
          </button>
        </form>
      )}
    </section>
  );
}
