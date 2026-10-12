import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import TopicRow from '../components/TopicRow.jsx';

// Bir dersin konu listesi ve yeni konu ekleme alanı
function SubjectSection({ subject, onAdd, onRename, onDelete }) {
  const [newName, setNewName] = useState('');

  async function handleAdd(event) {
    event.preventDefault();
    if (await onAdd(subject, newName)) setNewName('');
  }

  return (
    <section className="subject-section">
      <h2>
        {subject.name} <span className="badge">{subject.examType}</span>
      </h2>
      {subject.topics.length === 0 && <p className="muted">Bu derste henüz konu yok.</p>}
      <ul className="list topics">
        {subject.topics.map((topic) => (
          <TopicRow key={topic.id} topic={topic} onRename={onRename} onDelete={onDelete} />
        ))}
      </ul>
      <form className="inline-form" onSubmit={handleAdd}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Yeni konu adı"
          aria-label={`${subject.name} (${subject.examType}) için yeni konu`}
        />
        <button type="submit">Ekle</button>
      </form>
    </section>
  );
}

export default function Topics() {
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setSubjects(await apiFetch('/api/subjects'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Her işlem başarılıysa true döner (satır/alan kendini ona göre sıfırlar)
  async function run(action) {
    setError(null);
    try {
      await action();
      await load();
      return true;
    } catch (e) {
      // Geçersiz girdiyi sunucu Türkçe mesajla reddeder, aynen gösterilir
      setError(e.message);
      return false;
    }
  }

  const handleAdd = (subject, name) =>
    run(() => apiFetch('/api/topics', { method: 'POST', body: { subjectId: subject.id, name } }));

  const handleRename = (topic, name) =>
    run(() => apiFetch(`/api/topics/${topic.id}`, { method: 'PUT', body: { name } }));

  async function handleDelete(topic) {
    // Konuya bağlı kayıtlar silinmez; yalnızca konu bilgisi boşalır
    const ok = window.confirm(
      `"${topic.name}" konusu silinsin mi?\nBu konuya bağlı çalışma ve soru kayıtların silinmez, sadece konusuz kalır.`,
    );
    if (ok) await run(() => apiFetch(`/api/topics/${topic.id}`, { method: 'DELETE' }));
  }

  return (
    <section>
      <h1>Konular</h1>
      <p className="muted">Ders konularını ihtiyacına göre düzenle: yeni konu ekle, adını değiştir ya da sil.</p>
      <ErrorBanner message={error} />
      {subjects.map((subject) => (
        <SubjectSection
          key={subject.id}
          subject={subject}
          onAdd={handleAdd}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      ))}
    </section>
  );
}
