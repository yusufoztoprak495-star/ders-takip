import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import TopicRow from '../components/TopicRow.jsx';
import { EmptyChart } from '../components/Doodles.jsx';
import { useTrack } from '../context/TrackContext.jsx';
import { trackInfo } from '../lib/tracks.js';

// Hedefe göre grup alanının örnek metni (ders adının yanındaki parantez)
const GROUP_PLACEHOLDER = {
  yks: 'TYT ya da AYT',
  dgs: 'Sayısal ya da Sözel',
  uni: 'Dönem (isteğe bağlı)',
};

// Ders adı + grup alanları: yeni ders formu ve ders düzenleme aynı alanları kullanır
function SubjectFields({ name, setName, group, setGroup, groupLabel, placeholder }) {
  return (
    <>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ders adı"
        aria-label="Ders adı"
        maxLength={100}
      />
      <input
        type="text"
        className="group-input"
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        placeholder={placeholder}
        aria-label={groupLabel}
        maxLength={40}
      />
    </>
  );
}

// Bir dersin başlığı (düzenlenebilir), konu listesi ve yeni konu ekleme alanı
function SubjectSection({ subject, groupLabel, placeholder, onAdd, onRename, onDelete, onEditSubject, onDeleteSubject }) {
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.name);
  const [group, setGroup] = useState(subject.examType);

  async function handleAdd(event) {
    event.preventDefault();
    if (await onAdd(subject, newName)) setNewName('');
  }

  async function handleSave(event) {
    event.preventDefault();
    if (await onEditSubject(subject, { name, examType: group })) setEditing(false);
  }

  function handleCancel() {
    setName(subject.name);
    setGroup(subject.examType);
    setEditing(false);
  }

  return (
    <section className="subject-section">
      {editing ? (
        <form className="inline-form subject-edit" onSubmit={handleSave}>
          <SubjectFields {...{ name, setName, group, setGroup, groupLabel, placeholder }} />
          <button type="submit">Kaydet</button>
          <button type="button" className="secondary" onClick={handleCancel}>
            İptal
          </button>
        </form>
      ) : (
        <div className="subject-head">
          <h2>
            {subject.name} {subject.examType && <span className="badge">{subject.examType}</span>}
          </h2>
          <span className="actions">
            <button type="button" className="secondary small" onClick={() => setEditing(true)}>
              Dersi düzenle
            </button>
            <button type="button" className="secondary small" onClick={() => onDeleteSubject(subject)}>
              Dersi sil
            </button>
          </span>
        </div>
      )}
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
          aria-label={`${subject.name} dersine yeni konu`}
          maxLength={100}
        />
        <button type="submit">Konu ekle</button>
      </form>
    </section>
  );
}

export default function Topics() {
  const { track } = useTrack();
  const info = trackInfo(track);
  const placeholder = GROUP_PLACEHOLDER[track] ?? '';
  const [subjects, setSubjects] = useState(null);
  const [error, setError] = useState(null);
  const [newSubject, setNewSubject] = useState('');
  const [newGroup, setNewGroup] = useState('');

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
      // Geçersiz girdiyi veri katmanı Türkçe mesajla reddeder, aynen gösterilir
      setError(e.message);
      return false;
    }
  }

  async function handleAddSubject(event) {
    event.preventDefault();
    const ok = await run(() =>
      apiFetch('/api/subjects', { method: 'POST', body: { name: newSubject, examType: newGroup } }),
    );
    if (ok) {
      setNewSubject('');
      setNewGroup('');
    }
  }

  const handleEditSubject = (subject, body) =>
    run(() => apiFetch(`/api/subjects/${subject.id}`, { method: 'PUT', body }));

  async function handleDeleteSubject(subject) {
    const ok = window.confirm(
      `"${subject.name}" dersi ve konuları silinsin mi?\nBu derse bağlı kayıt varsa ders silinmez.`,
    );
    if (ok) await run(() => apiFetch(`/api/subjects/${subject.id}`, { method: 'DELETE' }));
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
      <h1>Dersler ve Konular</h1>
      <p className="muted">
        {info.title}: derslerini ve konularını ihtiyacına göre düzenle. Yeni ders ekle, adını değiştir
        ya da sil.
      </p>
      <ErrorBanner message={error} />

      <form className="inline-form new-subject" onSubmit={handleAddSubject}>
        <SubjectFields
          name={newSubject}
          setName={setNewSubject}
          group={newGroup}
          setGroup={setNewGroup}
          groupLabel={info.groupLabel}
          placeholder={placeholder}
        />
        <button type="submit">Ders ekle</button>
      </form>

      {subjects?.length === 0 && (
        <EmptyState
          Doodle={EmptyChart}
          title="Henüz ders yok"
          hint={
            track === 'uni'
              ? 'Bu dönem aldığın dersleri yukarıdan ekle; sonra her derse konularını yaz.'
              : 'Yukarıdan bir ders ekleyerek başla.'
          }
        />
      )}

      {subjects?.map((subject) => (
        <SubjectSection
          key={subject.id}
          subject={subject}
          groupLabel={info.groupLabel}
          placeholder={placeholder}
          onAdd={handleAdd}
          onRename={handleRename}
          onDelete={handleDelete}
          onEditSubject={handleEditSubject}
          onDeleteSubject={handleDeleteSubject}
        />
      ))}
    </section>
  );
}
