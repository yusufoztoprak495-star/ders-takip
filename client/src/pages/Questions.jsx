import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import SubjectTopicFields from '../components/SubjectTopicFields.jsx';
import { useSubjectSelection } from '../hooks/useSubjectSelection.js';
import { daysAgo, toLocalDateString } from '../lib/dates.js';
import { formatNet } from '../lib/format.js';
import { bookLabel, selectableBooks } from '../lib/resources.js';
import EmptyState from '../components/EmptyState.jsx';
import { EmptyNote } from '../components/Doodles.jsx';

// Boş bırakılan sayı alanı 0 sayılır (örn. hiç boş bırakmadıysan "Boş" alanına dokunmana gerek yok)
const toCount = (value) => (value === '' ? 0 : Number(value));

const EMPTY_COUNTS = { correct: '', wrong: '', blank: '' };

export default function Questions() {
  const selection = useSubjectSelection();
  const { subjects, subject, subjectId, topicId, selectSubject, selectTopic } = selection;
  const [date, setDate] = useState(() => toLocalDateString(new Date()));
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [resourceId, setResourceId] = useState('');
  const [resources, setResources] = useState([]);
  const [logs, setLogs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadLogs = useCallback(async () => {
    const today = new Date();
    try {
      setLogs(await apiFetch(`/api/questions?from=${daysAgo(29, today)}&to=${toLocalDateString(today)}`));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    apiFetch('/api/resources')
      .then(setResources)
      .catch((e) => setError(e.message));
  }, [loadLogs]);

  // Kitap seçenekleri seçilen dersin elimdeki kitaplarıdır; ders değişince geçersiz kalan seçim sıfırlanır
  const subjectResources = selectableBooks(resources, subjectId, resourceId);
  const selectedResource = subjectResources.some((r) => String(r.id) === resourceId) ? resourceId : '';

  function resetForm() {
    setEditingId(null);
    setCounts(EMPTY_COUNTS);
    setResourceId('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const body = {
      date,
      subjectId: subject?.id,
      topicId: topicId ? Number(topicId) : null,
      correct: toCount(counts.correct),
      wrong: toCount(counts.wrong),
      blank: toCount(counts.blank),
      resourceId: selectedResource ? Number(selectedResource) : null,
    };
    try {
      if (editingId) {
        await apiFetch(`/api/questions/${editingId}`, { method: 'PUT', body });
        setNotice('Kayıt güncellendi.');
      } else {
        await apiFetch('/api/questions', { method: 'POST', body });
        setNotice('Kayıt eklendi.');
      }
      resetForm();
      await loadLogs();
    } catch (e) {
      // Geçersiz girdiyi sunucu Türkçe mesajla reddeder, aynen gösterilir
      setError(e.message);
    }
  }

  // Düzenle: kaydın değerlerini forma yükler
  function handleEdit(log) {
    setError(null);
    setNotice(null);
    setEditingId(log.id);
    setDate(log.date);
    selectSubject(String(log.subjectId));
    selectTopic(log.topicId ? String(log.topicId) : '');
    setCounts({ correct: String(log.correct), wrong: String(log.wrong), blank: String(log.blank) });
    setResourceId(log.resourceId ? String(log.resourceId) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id) {
    setError(null);
    try {
      await apiFetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      await loadLogs();
    } catch (e) {
      setError(e.message);
    }
  }

  const setCount = (field) => (e) => setCounts((c) => ({ ...c, [field]: e.target.value }));
  const subjectOf = (id) => subjects.find((s) => s.id === id);
  const resourceName = (id) => {
    const book = resources.find((r) => r.id === id);
    return book && bookLabel(book);
  };

  return (
    <section>
      <h1>Soru Kaydı</h1>
      <p className="muted">Çözdüğün soruların doğru, yanlış ve boş sayılarını gir; net otomatik hesaplanır.</p>
      <ErrorBanner message={selection.error || error} />
      {notice && <p className="notice">{notice}</p>}

      <form className="card" onSubmit={handleSubmit} noValidate>
        <h2 className="card-title">{editingId ? 'Kaydı düzenle' : 'Yeni kayıt'}</h2>
        <label>
          Tarih
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <SubjectTopicFields selection={selection} />
        <div className="row">
          <label>
            Doğru
            <input type="number" step="1" value={counts.correct} onChange={setCount('correct')} />
          </label>
          <label>
            Yanlış
            <input type="number" step="1" value={counts.wrong} onChange={setCount('wrong')} />
          </label>
          <label>
            Boş
            <input type="number" step="1" value={counts.blank} onChange={setCount('blank')} />
          </label>
        </div>
        <label>
          Hangi kitaptan (isteğe bağlı)
          <select value={selectedResource} onChange={(e) => setResourceId(e.target.value)}>
            <option value="">Kitap seçme</option>
            {subjectResources.map((r) => (
              <option key={r.id} value={r.id}>
                {bookLabel(r)}
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button type="submit">{editingId ? 'Güncelle' : 'Ekle'}</button>
          {editingId && (
            <button type="button" className="secondary" onClick={resetForm}>
              İptal
            </button>
          )}
        </div>
      </form>

      <h2>Son 30 gün</h2>
      {logs.length === 0 ? (
        <EmptyState
          Doodle={EmptyNote}
          title="Son 30 günde soru kaydı yok"
          hint="Çözdüğün soruların doğru, yanlış ve boş sayısını yukarıdaki formdan kaydet."
        />
      ) : (
        <ul className="list">
          {logs.map((log) => {
            const s = subjectOf(log.subjectId);
            const topic = s?.topics.find((t) => t.id === log.topicId)?.name;
            return (
              <li key={log.id}>
                <div>
                  <strong>{s?.name}</strong>
                  {s?.examType && ` (${s.examType})`}
                  {topic && ` · ${topic}`}
                  <div className="muted">
                    {log.date} · {log.correct} D / {log.wrong} Y / {log.blank} B · Net{' '}
                    <strong className="net">{formatNet(log.net)}</strong>
                    {resourceName(log.resourceId) && ` · ${resourceName(log.resourceId)}`}
                  </div>
                </div>
                <span className="actions">
                  <button type="button" className="secondary" onClick={() => handleEdit(log)}>
                    Düzenle
                  </button>
                  <button type="button" className="secondary" onClick={() => handleDelete(log.id)}>
                    Sil
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
