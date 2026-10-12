import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import SubjectTopicFields from '../components/SubjectTopicFields.jsx';
import { useSubjectSelection } from '../hooks/useSubjectSelection.js';
import { noonOfLocalDate, toLocalDateString } from '../lib/dates.js';
import { addedNotice, formatDuration } from '../lib/format.js';
import EmptyState from '../components/EmptyState.jsx';
import { EmptyNote } from '../components/Doodles.jsx';

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

export default function StudyLog() {
  const selection = useSubjectSelection();
  const { subjects, subject, topicId } = selection;
  const [date, setDate] = useState(() => toLocalDateString(new Date()));
  const [minutes, setMinutes] = useState('');
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const today = toLocalDateString(new Date());

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await apiFetch(`/api/sessions?from=${today}&to=${today}`));
    } catch (e) {
      setError(e.message);
    }
  }, [today]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/sessions', {
        method: 'POST',
        body: {
          subjectId: subject?.id,
          topicId: topicId ? Number(topicId) : null,
          startedAt: noonOfLocalDate(date),
          durationSeconds: Math.round(Number(minutes) * 60),
          entryType: 'manual',
        },
      });
      setMinutes('');
      setNotice(addedNotice(date, today));
      await loadSessions();
    } catch (e) {
      // Geçersiz girdiyi sunucu Türkçe mesajla reddeder, aynen gösterilir
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    setError(null);
    try {
      await apiFetch(`/api/sessions/${id}`, { method: 'DELETE' });
      await loadSessions();
    } catch (e) {
      setError(e.message);
    }
  }

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? '';
  const topicName = (subjectId, topicId) =>
    subjects.find((s) => s.id === subjectId)?.topics.find((t) => t.id === topicId)?.name;
  const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);

  return (
    <section>
      <h1>Çalışma Günlüğü</h1>
      <p className="muted">Pomodoro kullanmadığın çalışmaları buradan elle ekleyebilirsin.</p>
      <ErrorBanner message={selection.error || error} />
      {notice && <p className="notice">{notice}</p>}

      <form className="card" onSubmit={handleSubmit} noValidate>
        <SubjectTopicFields selection={selection} />
        <div className="row">
          <label>
            Tarih
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Süre (dk)
            <input
              type="number"
              step="1"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
        </div>
        <button type="submit">Ekle</button>
      </form>

      <h2>Bugün</h2>
      {sessions.length === 0 ? (
        <EmptyState
          Doodle={EmptyNote}
          title="Bugün henüz kayıt yok"
          hint="Pomodoro bitince ya da yukarıdan elle ekleyince burada görünür."
        />
      ) : (
        <>
          <p className="muted">Toplam: {formatDuration(totalSeconds)}</p>
          <ul className="list">
            {sessions.map((s) => (
              <li key={s.id}>
                <div>
                  <strong>{subjectName(s.subjectId)}</strong>
                  {topicName(s.subjectId, s.topicId) && ` · ${topicName(s.subjectId, s.topicId)}`}
                  <div className="muted">
                    {formatDuration(s.durationSeconds)} ·{' '}
                    {s.entryType === 'pomodoro' ? `Pomodoro, ${timeOf(s.startedAt)}` : 'Elle girildi'}
                  </div>
                </div>
                <button type="button" className="secondary" onClick={() => handleDelete(s.id)}>
                  Sil
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
