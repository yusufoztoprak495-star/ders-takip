import { useState } from 'react';

// Tek bir konu satırı: adı gösterir; "Düzenle" ile yerinde yeniden adlandırılır.
// onRename(topic, newName) başarılıysa true döner; onDelete(topic) silme onayını üst sayfada yapar.
export default function TopicRow({ topic, onRename, onDelete }) {
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

  return (
    <li>
      <span>{topic.name}</span>
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
