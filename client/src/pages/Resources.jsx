import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import ResourceCard from '../components/ResourceCard.jsx';
import SubjectTopicFields from '../components/SubjectTopicFields.jsx';
import { useSubjectSelection } from '../hooks/useSubjectSelection.js';

export default function Resources() {
  const selection = useSubjectSelection();
  const { subjects, subject } = selection;
  const [name, setName] = useState('');
  const [type, setType] = useState('kitap');
  const [totalUnits, setTotalUnits] = useState('');
  const [resources, setResources] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadResources = useCallback(async () => {
    try {
      setResources(await apiFetch('/api/resources'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  async function handleAdd(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/resources', {
        method: 'POST',
        body: {
          name,
          type,
          subjectId: subject?.id,
          totalUnits: totalUnits === '' ? null : Number(totalUnits),
        },
      });
      setName('');
      setTotalUnits('');
      setNotice('Kaynak eklendi.');
      await loadResources();
    } catch (e) {
      // Geçersiz girdiyi sunucu Türkçe mesajla reddeder, aynen gösterilir
      setError(e.message);
    }
  }

  // "Kaldığım yer" güncellemesi: sunucu tam gövde ister, diğer alanlar aynen gönderilir
  async function handleSave(resource, currentText) {
    setError(null);
    setNotice(null);
    if (currentText === '') {
      setError('Kaldığım yer boş olamaz');
      return;
    }
    try {
      await apiFetch(`/api/resources/${resource.id}`, {
        method: 'PUT',
        body: {
          name: resource.name,
          type: resource.type,
          subjectId: resource.subjectId,
          totalUnits: resource.totalUnits,
          currentUnit: Number(currentText),
        },
      });
      await loadResources();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(resource) {
    setError(null);
    setNotice(null);
    // Yanlışlıkla silmeye karşı onay istenir
    if (!window.confirm(`"${resource.name}" silinsin mi?`)) return;
    try {
      await apiFetch(`/api/resources/${resource.id}`, { method: 'DELETE' });
      await loadResources();
    } catch (e) {
      setError(e.message);
    }
  }

  const subjectName = (id) => {
    const s = subjects.find((x) => x.id === id);
    return s ? `${s.name} (${s.examType})` : '';
  };

  return (
    <section>
      <h1>Kaynaklar</h1>
      <p className="muted">Kitap ve video setlerini ekle, nerede kaldığını takip et.</p>
      <ErrorBanner message={selection.error || error} />
      {notice && <p className="notice">{notice}</p>}

      <form className="card" onSubmit={handleAdd} noValidate>
        <h2 className="card-title">Yeni kaynak</h2>
        <label>
          Ad
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Tür
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="kitap">Kitap</option>
            <option value="video">Video seti</option>
          </select>
        </label>
        <SubjectTopicFields selection={selection} showTopic={false} />
        <label>
          Toplam birim (sayfa, test ya da video sayısı)
          <input
            type="number"
            step="1"
            value={totalUnits}
            onChange={(e) => setTotalUnits(e.target.value)}
          />
        </label>
        <button type="submit">Ekle</button>
      </form>

      <h2>Kaynaklarım</h2>
      {resources.length === 0 ? (
        <p className="muted">Henüz kaynak yok.</p>
      ) : (
        <ul className="list resources">
          {resources.map((r) => (
            // key'e currentUnit eklenir: kayıt güncellenince kart yeni değerle yeniden kurulur
            <ResourceCard
              key={`${r.id}-${r.currentUnit}`}
              resource={r}
              subjectName={subjectName(r.subjectId)}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
