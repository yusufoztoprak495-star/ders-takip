import { useCallback, useState } from 'react';
import Dial from '../components/Dial.jsx';
import FocusMode from '../components/FocusMode.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import FocusSoundControls from '../components/FocusSoundControls.jsx';
import SubjectTopicFields from '../components/SubjectTopicFields.jsx';
import { usePomodoro } from '../context/PomodoroContext.jsx';
import { useSubjectSelection } from '../hooks/useSubjectSelection.js';
import { formatTime } from '../lib/pomodoro.js';
import { useSearchParams } from 'react-router-dom';
import { toLocalDateString } from '../lib/dates.js';

export default function Pomodoro() {
  const {
    settings,
    updateSettings,
    breakSettings,
    updateBreakSettings,
    phase,
    remaining,
    pending,
    notice,
    start,
    cancel,
    retry,
    dismissPending,
  } = usePomodoro();
  const [focus, setFocus] = useState(false);
  const closeFocus = useCallback(() => setFocus(false), []);
  // Ana sayfadaki "Bugünün programı"ndan gelindiyse ders ve blok adreste yazar (?ders=3&blok=7)
  const [params] = useSearchParams();
  const planId = Number(params.get('blok')) || null;
  const selection = useSubjectSelection(params.get('ders'));
  const { subjects, subject, topicId } = selection;

  const runningSubject = phase && subjects.find((s) => s.id === phase.subjectId);

  function handleStart(event) {
    event.preventDefault();
    if (!subject) return;
    // "Odak modunda başlat" düğmesiyle gönderildiyse tam ekran sayaç da açılır
    if (event.nativeEvent?.submitter?.dataset.focus) setFocus(true);
    start({
      subjectId: subject.id,
      topicId: topicId ? Number(topicId) : null,
      planId,
      planDate: planId ? toLocalDateString(new Date()) : null,
    });
  }

  // Uzun mola ayarları: sınırlar veri katmanındaki gibi (lib/breaks.js)
  function handleBreak(field, value, min, max) {
    const n = Number(value);
    if (Number.isInteger(n) && n >= min && n <= max) updateBreakSettings({ ...breakSettings, [field]: n });
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
              {phase.kind === 'work' ? (runningSubject?.name ?? 'Çalışma') : phase.long ? 'Uzun mola' : 'Mola'}
            </p>
          </Dial>
          {phase.kind === 'work' ? (
            <p className="muted round-info">
              {phase.round}. tur
              {phase.distractions > 0 ? ` · bu turda ${phase.distractions} kez sekmeden çıktın` : ''}
            </p>
          ) : (
            <p className="break-tip">{phase.tip}</p>
          )}
          {phase.kind === 'work' && <FocusSoundControls />}
          <div className="timer-actions">
            <button type="button" onClick={() => setFocus(true)}>
              Odak modu
            </button>
            <button type="button" className="secondary" onClick={cancel}>
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <form className="card" onSubmit={handleStart}>
          <Dial kind="work">
            <div className="timer idle">{formatTime(settings.workMinutes * 60)}</div>
            <p className="dial-label">Hazır</p>
          </Dial>
          {planId && <p className="notice">Bu tur bitince haftalık programdaki blok bugün için “yapıldı” işaretlenecek.</p>}
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
          <details className="break-settings">
            <summary>Mola sağlığı</summary>
            <div className="row">
              <label>
                Uzun mola (dk)
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={breakSettings.longBreakMinutes}
                  onChange={(e) => handleBreak('longBreakMinutes', e.target.value, 1, 120)}
                />
              </label>
              <label>
                Kaç turda bir
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={breakSettings.longEvery}
                  onChange={(e) => handleBreak('longEvery', e.target.value, 0, 12)}
                />
              </label>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={breakSettings.eyeReminder}
                onChange={(e) => updateBreakSettings({ ...breakSettings, eyeReminder: e.target.checked })}
              />
              <span>
                <b>20-20-20 hatırlatıcısı</b>
                <span className="muted"> Uzun turlarda her 20 dakikada bir: 20 saniye 6 metre uzağa bak.</span>
              </span>
            </label>
            <p className="muted">Uzun mola 0 turda bir: kapalı. Mola bittikten sonra 30 dakika içinde başlarsan turlar art arda sayılır.</p>
          </details>
          <FocusSoundControls />
          <div className="timer-actions">
            <button type="submit" disabled={!subject}>
              Başlat
            </button>
            <button type="submit" className="secondary" data-focus="1" disabled={!subject}>
              Odak modunda başlat
            </button>
          </div>
        </form>
      )}
      {focus && <FocusMode subjectName={runningSubject?.name ?? subject?.name} onClose={closeFocus} />}
    </section>
  );
}
