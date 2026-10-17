import { useState } from 'react';
import { apiFetch } from '../api.js';
import ErrorBanner from './ErrorBanner.jsx';

const NOTE_MAX = 2000; // veri katmanındaki sınırla aynı (routes/topics.js)

// Konu notu: formül, püf noktası, sık yaptığın hata. Kaydedilene kadar değişiklik yalnızca kutuda durur.
export default function TopicNote({ topicId, initial }) {
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const dirty = text.trim() !== saved;

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      const res = await apiFetch(`/api/topics/${topicId}/note`, { method: 'PUT', body: { note: text } });
      setSaved(res.note);
      setText(res.note);
      setStatus(res.note ? 'Not kaydedildi.' : 'Not silindi.');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <form className="panel topic-note" onSubmit={handleSubmit}>
      <h2 className="panel-label">Notlarım</h2>
      <ErrorBanner message={error} />
      <label>
        <span className="visually-hidden">Konu notu</span>
        <textarea
          value={text}
          maxLength={NOTE_MAX}
          rows={5}
          placeholder="Formüller, püf noktaları, sık yaptığın hatalar… Tekrar zamanı geldiğinde önce buna bak."
          onChange={(e) => {
            setText(e.target.value);
            setStatus(null);
          }}
        />
      </label>
      <div className="topic-note-footer">
        <span className="muted">
          {text.length} / {NOTE_MAX}
        </span>
        {status && !dirty && (
          <span className="muted" role="status">
            {status}
          </span>
        )}
        <button type="submit" className={dirty ? undefined : 'secondary'} disabled={!dirty}>
          Kaydet
        </button>
      </div>
    </form>
  );
}
