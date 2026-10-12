import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import ResourceCard from '../components/ResourceCard.jsx';
import SubjectTopicFields from '../components/SubjectTopicFields.jsx';
import { useSubjectSelection } from '../hooks/useSubjectSelection.js';
import { splitByStatus } from '../lib/resources.js';
import EmptyState from '../components/EmptyState.jsx';
import { EmptyBook } from '../components/Doodles.jsx';

export default function Resources() {
  const selection = useSubjectSelection();
  const { subjects, subject } = selection;
  const [name, setName] = useState('');
  const [publisher, setPublisher] = useState('');
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
          publisher,
          subjectId: subject?.id,
        },
      });
      setName('');
      setPublisher('');
      setNotice('Kitap eklendi.');
      await loadResources();
    } catch (e) {
      // Geçersiz girdiyi sunucu Türkçe mesajla reddeder, aynen gösterilir
      setError(e.message);
    }
  }

  // Sunucu tam gövde ister: kitabın mevcut alanları gönderilir, değişenler üzerine yazılır
  async function update(resource, changes) {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/resources/${resource.id}`, {
        method: 'PUT',
        body: {
          name: resource.name,
          publisher: resource.publisher,
          subjectId: resource.subjectId,
          solvedTests: resource.solvedTests,
          status: resource.status,
          ...changes,
        },
      });
      await loadResources();
    } catch (e) {
      setError(e.message);
    }
  }

  function handleSave(resource, solvedText) {
    if (solvedText === '') {
      setError('Çözülen test sayısı boş olamaz');
      return;
    }
    update(resource, { solvedTests: Number(solvedText) });
  }

  // Bitirdim ile Elimde arasında geçiş; çözülen test sayısı aynen kalır
  function handleToggleStatus(resource) {
    update(resource, { status: resource.status === 'elimde' ? 'bitirdim' : 'elimde' });
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

  const { active, done } = splitByStatus(resources);
  const renderList = (list) => (
    <ul className="list resources">
      {list.map((r) => (
        // key'e çözülen test ve durum eklenir: kayıt güncellenince kart yeni değerle yeniden kurulur
        <ResourceCard
          key={`${r.id}-${r.solvedTests}-${r.status}`}
          resource={r}
          subjectName={subjectName(r.subjectId)}
          onSave={handleSave}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      ))}
    </ul>
  );

  return (
    <section>
      <h1>Kaynaklar</h1>
      <p className="muted">Test kitaplarını ekle, her kitaptan kaç test çözdüğünü takip et.</p>
      <ErrorBanner message={selection.error || error} />
      {notice && <p className="notice">{notice}</p>}

      <form className="card" onSubmit={handleAdd} noValidate>
        <h2 className="card-title">Yeni kitap</h2>
        <label>
          Kitap adı
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Yayınevi (isteğe bağlı)
          <input type="text" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
        </label>
        <SubjectTopicFields selection={selection} showTopic={false} />
        <button type="submit">Ekle</button>
      </form>

      {resources.length === 0 ? (
        <EmptyState Doodle={EmptyBook} title="Henüz kitap yok" hint="Yukarıdaki formdan ilk test kitabını ekle." />
      ) : (
        <>
          <h2>Elimde</h2>
          {active.length === 0 ? <p className="muted">Şu an elinde kitap yok.</p> : renderList(active)}
        </>
      )}

      {done.length > 0 && (
        <>
          <h2>Bitirdim</h2>
          {renderList(done)}
        </>
      )}
    </section>
  );
}
