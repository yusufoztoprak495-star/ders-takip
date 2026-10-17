import { useEffect, useRef } from 'react';
import { usePomodoro } from '../context/PomodoroContext.jsx';
import { formatTime } from '../lib/pomodoro.js';

// Odak modu: ekranı kaplayan sade sayaç. Tarayıcı izin verirse tam ekran açılır; Esc ya da "Çık" kapatır.
// Menü, bildirimler ve arka plan sahnesi görünmez; yalnızca kalan süre, ders ve tur bilgisi kalır.
export default function FocusMode({ subjectName, onClose }) {
  const { phase, remaining, breakSettings } = usePomodoro();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    el?.focus();
    // Tam ekran isteği bir tıklamanın hemen ardından yapılmalı; desteklenmiyorsa katman yine de ekranı kaplar
    el?.requestFullscreen?.().catch(() => {});
    const onFullscreen = () => {
      if (!document.fullscreenElement) onClose();
    };
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('fullscreenchange', onFullscreen);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen);
      window.removeEventListener('keydown', onKey);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose]);

  const work = phase?.kind === 'work';
  const progress = phase ? 1 - remaining / phase.durationSeconds : 0;

  return (
    <div ref={ref} className={`focus-mode ${work ? 'is-work' : 'is-break'}`} role="dialog" aria-modal="true" aria-label="Odak modu" tabIndex={-1}>
      <div className="focus-center">
        <p className="focus-label">{phase ? (work ? subjectName || 'Çalışma' : phase.long ? 'Uzun mola' : 'Mola') : 'Tur bitti'}</p>
        <p className="focus-time" aria-live="off">
          {phase ? formatTime(remaining) : '00:00'}
        </p>
        <div className="focus-bar" aria-hidden="true">
          <i style={{ transform: `scaleX(${progress})` }} />
        </div>
        {phase && work && (
          <p className="focus-meta">
            {phase.round}. tur
            {breakSettings.longEvery > 0 &&
              ` · uzun mola ${Math.ceil((phase.round ?? 1) / breakSettings.longEvery) * breakSettings.longEvery}. turdan sonra`}
            {' · '}
            {phase.distractions > 0 ? `${phase.distractions} kez sekmeden çıktın` : 'dikkatin dağılmadı'}
          </p>
        )}
        {phase && !work && <p className="focus-tip">{phase.tip}</p>}
      </div>
      <button type="button" className="secondary focus-exit" onClick={onClose}>
        Odak modundan çık
      </button>
    </div>
  );
}
