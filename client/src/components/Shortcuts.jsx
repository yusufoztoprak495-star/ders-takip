import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrack } from '../context/TrackContext.jsx';
import { SHORTCUTS, isTypingTarget, shortcutFor } from '../lib/shortcuts.js';
import { tracksQuestions } from '../lib/tracks.js';

// Tek harfle sayfa değiştirme (a, p, g, s, d, k, h, i) ve "?" ile kısayol listesi.
// Bir alana yazı yazarken ya da açık bir pencere varken çalışmaz.
export default function Shortcuts() {
  const navigate = useNavigate();
  const exam = tracksQuestions(useTrack().track);
  const [help, setHelp] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    function onKey(event) {
      if (event.defaultPrevented || event.repeat || isTypingTarget(event.target)) return;
      if (document.querySelector('dialog[open]')) return;
      const target = shortcutFor(event, { exam });
      if (!target) return;
      event.preventDefault();
      if (target === 'help') setHelp(true);
      else navigate(target);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exam, navigate]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (help && dialog && !dialog.open) dialog.showModal?.();
  }, [help]);

  if (!help) return null;
  return (
    <dialog ref={dialogRef} className="plan-editor shortcut-help" onCancel={() => setHelp(false)} onClose={() => setHelp(false)} aria-labelledby="shortcut-title">
      <form method="dialog">
        <h2 id="shortcut-title">Klavye kısayolları</h2>
        <ul className="shortcut-list">
          {SHORTCUTS.filter((s) => exam || !s.questions).map((s) => (
            <li key={s.key}>
              <kbd>{s.key.toLocaleUpperCase('tr')}</kbd>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
        <p className="muted">Bir alana yazı yazarken kısayollar çalışmaz.</p>
        <div className="form-actions">
          <button type="submit">Tamam</button>
        </div>
      </form>
    </dialog>
  );
}
