import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../api.js';
import { toLocalDateString } from '../lib/dates.js';
import { suggestBlocks } from '../lib/planSuggest.js';
import { DAYS, formatClock } from '../lib/schedule.js';
import { subjectLabel } from '../lib/tracks.js';
import DayPicker from './DayPicker.jsx';
import ErrorBanner from './ErrorBanner.jsx';

const keyOf = (b) => `${b.day}-${b.start}`;

// Akıllı öneri: boş saatlere zayıf konulardan çalışma blokları. Önce önizleme; kullanıcı istemediği
// blokların işaretini kaldırır, kalanlar haftalık programa eklenir.
export default function SuggestDialog({ classes, plans, window, onAdded, onClose }) {
  const dialogRef = useRef(null);
  const [topics, setTopics] = useState(null);
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [blockMinutes, setBlockMinutes] = useState(50);
  const [perDay, setPerDay] = useState(2);
  const [skipped, setSkipped] = useState(() => new Set());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal?.();
    apiFetch(`/api/weak-topics?date=${toLocalDateString(new Date())}`)
      .then(setTopics)
      .catch((e) => setError(e.message));
  }, []);

  const blocks = useMemo(
    () =>
      topics
        ? suggestBlocks({ classes, plans, window, topics, days, blockMinutes, breakMinutes: 10, perDay })
        : [],
    [topics, classes, plans, window, days, blockMinutes, perDay],
  );
  const chosen = blocks.filter((b) => !skipped.has(keyOf(b)));
  const subjectOf = useMemo(() => new Map((topics ?? []).map((t) => [t.subjectId, subjectLabel(t.subjectName, t.examType)])), [topics]);

  async function handleAdd() {
    setSaving(true);
    setError(null);
    let added = 0;
    try {
      for (const b of chosen) {
        await apiFetch('/api/plans', {
          method: 'POST',
          body: { kind: 'study', day: b.day, start: b.start, end: b.end, subjectId: b.subjectId, title: b.title.slice(0, 60) },
        });
        added += 1;
      }
      onAdded(added);
    } catch (e) {
      setError(`${added} blok eklendi, sonra hata: ${e.message}`);
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="plan-editor suggest-dialog" onCancel={onClose} aria-labelledby="suggest-title">
      <div className="suggest-body">
        <h2 id="suggest-title">Akıllı öneri</h2>
        <p className="muted">
          Boş saatlerine en çok zorlandığın konuları yerleştirir: denemelerde soru kaybettirenler, doğruluğu düşükler,
          hata defterindekiler ve tekrarı gelenler. İstemediğin bloğun işaretini kaldır.
        </p>
        <ErrorBanner message={error} />
        <div className="suggest-options">
          <DayPicker selected={days} onChange={setDays} label="Öneri yapılacak günler" />
          <label>
            Blok
            <select value={blockMinutes} onChange={(e) => setBlockMinutes(Number(e.target.value))}>
              {[40, 50, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} dk
                </option>
              ))}
            </select>
          </label>
          <label>
            Günde en çok
            <select value={perDay} onChange={(e) => setPerDay(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} blok
                </option>
              ))}
            </select>
          </label>
        </div>
        {topics && blocks.length === 0 && <p className="notice">Seçili günlerde bu uzunlukta boş saat kalmamış.</p>}
        <ul className="suggest-list">
          {blocks.map((b) => {
            const key = keyOf(b);
            return (
              <li key={key}>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={!skipped.has(key)}
                    onChange={() =>
                      setSkipped((set) => {
                        const next = new Set(set);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                  />
                  <span>
                    <span className="suggest-when">
                      {DAYS[b.day].short} {formatClock(b.start)}–{formatClock(b.end)}
                    </span>{' '}
                    <b>{b.title}</b> <span className="muted">{subjectOf.get(b.subjectId)}</span>
                    <small className="muted suggest-reason">{b.reason}</small>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="form-actions">
          <button type="button" onClick={handleAdd} disabled={saving || chosen.length === 0}>
            {saving ? 'Ekleniyor…' : `${chosen.length} bloğu ekle`}
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            Vazgeç
          </button>
        </div>
      </div>
    </dialog>
  );
}
