import { usePomodoro } from '../context/PomodoroContext.jsx';
import { SOUND_KINDS } from '../lib/focusSound.js';

// Odak sesi seçimi ve ses seviyesi. Sayaç çalışırken de değiştirilebilir, değişiklik anında duyulur.
export default function FocusSoundControls() {
  const { sound, updateSound } = usePomodoro();
  const off = sound.kind === 'off';
  return (
    <div className="focus-sound">
      <label>
        Odak sesi
        <select value={sound.kind} onChange={(e) => updateSound({ ...sound, kind: e.target.value })}>
          {SOUND_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className={off ? 'is-off' : undefined}>
        Ses seviyesi
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={sound.volume}
          disabled={off}
          aria-valuetext={`%${Math.round(sound.volume * 100)}`}
          onChange={(e) => updateSound({ ...sound, volume: Number(e.target.value) })}
        />
      </label>
      <p className="panel-note">Ses yalnızca çalışma süresince çalar, molada susar.</p>
    </div>
  );
}
