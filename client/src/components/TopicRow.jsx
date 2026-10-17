import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatShortDate } from '../lib/format.js';

// Bitmiş konunun tekrar durumu: sıradaki tekrar günü ya da (dört tekrar bittiyse) "kalıcı"
function reviewNote(topic) {
  if (!topic.done) return null;
  if (!topic.nextReview) return 'Kalıcı';
  return `Tekrar ${formatShortDate(topic.nextReview)}`;
}

// Tek bir konu satırı: bitti kutusu ve adı; "Düzenle" ile yerinde yeniden adlandırılır.
// onRename(topic, newName) başarılıysa true döner; onDelete(topic) silme onayını üst sayfada yapar;
// onToggleDone(topic, done) konuyu bitti / bitmedi yapar.
export default function TopicRow({ topic, noteTo, onRename, onDelete, onToggleDone }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(topic.name);

  async function handleSave(event) {
    event.preventDefault();
    if (await onRename(topic, name)) setEditing(false);
  }

  function handleCancel() {
    setName(topic.name);
    setEditing(false);
  }

  if (editing) {
    return (
      <li>
        <form className="inline-form" onSubmit={handleSave}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Konu adı"
            autoFocus
          />
          <button type="submit">Kaydet</button>
          <button type="button" className="secondary" onClick={handleCancel}>
            İptal
          </button>
        </form>
      </li>
    );
  }

  const note = reviewNote(topic);
  return (
    <li className={topic.done ? 'topic-done' : undefined}>
      <label className="topic-check">
        <input type="checkbox" checked={Boolean(topic.done)} onChange={(e) => onToggleDone(topic, e.target.checked, e.target)} />
        <span className="topic-name">
          {topic.name}
          {topic.hasNote && (
            <span className="note-mark" title="Bu konuya not almışsın" aria-label="notu var">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M3 2.5h7l3 3v8H3z" />
                <path d="M5.5 7.5h5M5.5 10h5" />
              </svg>
            </span>
          )}
        </span>
        {note && <span className="topic-review">{note}</span>}
      </label>
      <span className="actions">
        {noteTo && (
          <Link to={noteTo} className="text-link note-link" title="Konu ayrıntısı ve notların">
            Not
          </Link>
        )}
        <button type="button" className="secondary" onClick={() => setEditing(true)}>
          Düzenle
        </button>
        <button type="button" className="secondary" onClick={() => onDelete(topic)}>
          Sil
        </button>
      </span>
    </li>
  );
}
