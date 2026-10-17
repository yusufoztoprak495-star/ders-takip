import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import { useTrack } from '../context/TrackContext.jsx';
import { trackInfo } from '../lib/tracks.js';
import ErrorBanner from './ErrorBanner.jsx';

// Ayarlar > Hedefler: sınav tarihi (ana sayfadaki geri sayım) ve günlük çalışma hedefi (saat + dakika)
export default function GoalsForm() {
  const { track } = useTrack();
  const examLabel = track === 'uni' ? 'Final haftası' : `${trackInfo(track).label} tarihi`;
  const [examDate, setExamDate] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch('/api/goals')
      .then((g) => {
        setExamDate(g.examDate ?? '');
        setHours(g.dailyGoal ? String(Math.floor(g.dailyGoal / 60)) : '');
        setMinutes(g.dailyGoal ? String(g.dailyGoal % 60) : '');
      })
      .catch((e) => setError(e.message));
  }, [track]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    // Boş alan 0 sayılır; yazılan değer sayıya çevrilir, geçersizse veri katmanı Türkçe mesajla reddeder
    const toNumber = (v) => (v.trim() === '' ? 0 : Number(v));
    const dailyGoal = toNumber(hours) * 60 + toNumber(minutes);
    try {
      await apiFetch('/api/goals', { method: 'PUT', body: { examDate: examDate || null, dailyGoal } });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <form className="goals-form" onSubmit={handleSubmit}>
      <ErrorBanner message={error} />
      <div className="row">
        <label>
          {examLabel}
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </label>
        <label>
          Günlük hedef (saat)
          <input type="number" min="0" max="16" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label>
          Dakika
          <input type="number" min="0" max="55" step="5" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
      </div>
      <p className="muted small-note">
        Tarih ana sayfada geri sayım olarak görünür; ÖSYM takvimi açıklanınca güncelle. Günlük hedef her gün
        bugünün özetinde ilerleme çubuğu olur. Boş bırakılan alan kapalı demektir.
      </p>
      <p>
        <button type="submit">Hedefleri kaydet</button> {saved && <span className="muted" role="status">Kaydedildi.</span>}
      </p>
    </form>
  );
}
