import { useState } from 'react';
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
export default function TopicRow({ topic, onRename, onDelete, onToggleDone }) {
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
        <span className="topic-name">{topic.name}</span>
        {note && <span className="topic-review">{note}</span>}
      </label>
      <span className="actions">
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
