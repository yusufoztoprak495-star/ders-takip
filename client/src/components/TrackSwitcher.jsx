import { useTrack } from '../context/TrackContext.jsx';
import { usePomodoro } from '../context/PomodoroContext.jsx';
import { TRACKS } from '../lib/tracks.js';

// Üç seçenekli hedef seçici. Sayaç çalışırken kapalıdır: çalışma bir derse bağlı, hedef değişirse
// o ders listeden kaybolur ve kullanıcı neye çalıştığını göremez.
// detailed: her seçeneğin altında kısa açıklama (ilk açılış kartı ve Ayarlar için).
export default function TrackSwitcher({ detailed = false, label = 'Çalışma hedefi' }) {
  const { track, setTrack } = useTrack();
  const { phase } = usePomodoro();
  const locked = Boolean(phase);
  return (
    <div className={detailed ? 'track-switcher detailed' : 'track-switcher'}>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {TRACKS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={track === t.id}
            className={track === t.id ? 'active' : ''}
            disabled={locked || track === null}
            onClick={() => track !== t.id && setTrack(t.id)}
          >
            <span className="segmented-title">{t.label}</span>
            {detailed && <span className="segmented-hint">{t.hint}</span>}
          </button>
        ))}
      </div>
      {locked && <p className="muted small">Sayaç çalışırken hedef değiştirilemez.</p>}
    </div>
  );
}
