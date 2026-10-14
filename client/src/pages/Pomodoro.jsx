import Dial from '../components/Dial.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import FocusSoundControls from '../components/FocusSoundControls.jsx';
import SubjectTopicFields from '../components/SubjectTopicFields.jsx';
import { usePomodoro } from '../context/PomodoroContext.jsx';
import { useSubjectSelection } from '../hooks/useSubjectSelection.js';
import { formatTime } from '../lib/pomodoro.js';

export default function Pomodoro() {
  const { settings, updateSettings, phase, remaining, pending, notice, start, cancel, retry, dismissPending } =
    usePomodoro();
  const selection = useSubjectSelection();
  const { subjects, subject, topicId } = selection;

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
      <ErrorBanner message={selection.error} />

      {pending.map((item) => (
        <div key={item.id} className="error-banner pending" role="alert">
          <span>
            Çalışma kaydedilemedi ({Math.round(item.payload.durationSeconds / 60)} dk): {item.message}
          </span>
          <span className="actions">
            <button type="button" disabled={item.retrying} onClick={() => retry(item.id)}>
              {item.retrying ? "Deneniyor…" : "Tekrar dene"}
            </button>
            <button type="button" className="secondary" onClick={() => dismissPending(item.id)}>
              Vazgeç
            </button>
          </span>
        </div>
      ))}

      {notice && !phase && <p className="notice">{notice}</p>}

      {phase ? (
        <div className="timer-card">
          <Dial kind={phase.kind} remaining={remaining} duration={phase.durationSeconds}>
            <div className="timer" aria-live="off">
              {formatTime(remaining)}
            </div>
            <p className="dial-label">
              {phase.kind === 'work' ? (runningSubject?.name ?? 'Çalışma') : 'Mola'}
            </p>
          </Dial>
          {phase.kind === 'work' && <FocusSoundControls />}
          <button type="button" className="secondary" onClick={cancel}>
            Vazgeç
          </button>
        </div>
      ) : (
        <form className="card" onSubmit={handleStart}>
          <Dial kind="work">
            <div className="timer idle">{formatTime(settings.workMinutes * 60)}</div>
            <p className="dial-label">Hazır</p>
          </Dial>
          <SubjectTopicFields selection={selection} />
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
          <FocusSoundControls />
          <button type="submit" disabled={!subject}>
            Başlat
          </button>
        </form>
      )}
    </section>
  );
}
