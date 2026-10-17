import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { EmptyNote } from '../components/Doodles.jsx';
import MistakeImage from '../components/MistakeImage.jsx';
import SubjectTopicFields from '../components/SubjectTopicFields.jsx';
import { getImageStore } from '../data/images.js';
import { useSubjectSelection } from '../hooks/useSubjectSelection.js';
import { celebrate } from '../lib/celebrate.js';
import { toLocalDateString } from '../lib/dates.js';
import { formatDate, formatShortDate } from '../lib/format.js';
import { compressImage } from '../lib/imageCompress.js';
import { subjectLabel } from '../lib/tracks.js';

const STEP_LABELS = ['1 gün', '3 gün', '7 gün', '30 gün'];
const newImageId = () => `${crypto.randomUUID()}`.toLowerCase();

// Yeni soru formu: fotoğraf (kamera ya da galeri), ders/konu, kaynak, doğru cevap, not
function MistakeForm({ onSaved }) {
  const selection = useSubjectSelection();
  const [photo, setPhoto] = useState(null); // { blob, url }
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState('');
  const [answer, setAnswer] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo]);

  async function handleFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const blob = await compressImage(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(e.message || 'Fotoğraf okunamadı');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    let imageId = null;
    try {
      // Önce fotoğraf kaydedilir; kayıt reddedilirse fotoğraf geri silinir (sahipsiz fotoğraf kalmasın)
      if (photo) {
        imageId = newImageId();
        await getImageStore().put(imageId, photo.blob);
      }
      await apiFetch('/api/mistakes', {
        method: 'POST',
        body: {
          subjectId: Number(selection.subjectId),
          topicId: selection.topicId ? Number(selection.topicId) : null,
          source,
          answer,
          note,
          imageId,
          today: toLocalDateString(new Date()),
        },
      });
      setPhoto(null);
      setSource('');
      setAnswer('');
      setNote('');
      onSaved();
    } catch (e) {
      if (imageId) await getImageStore().remove(imageId).catch(() => {});
      setError(e.message);
    }
  }

  return (
    <form className="panel mistake-form" onSubmit={handleSubmit}>
      <h2 className="panel-label">Soru ekle</h2>
      <ErrorBanner message={error ?? selection.error} />
      <div className="mistake-form-grid">
        <div className="photo-drop">
          {photo ? (
            <img src={photo.url} alt="Eklenecek sorunun fotoğrafı" />
          ) : (
            <span className="muted">{busy ? 'Fotoğraf küçültülüyor…' : 'Sorunun fotoğrafını çek ya da seç'}</span>
          )}
          <div className="photo-actions">
            <button type="button" className="secondary small" onClick={() => fileRef.current?.click()} disabled={busy}>
              {photo ? 'Değiştir' : 'Fotoğraf ekle'}
            </button>
            {photo && (
              <button type="button" className="secondary small" onClick={() => setPhoto(null)}>
                Kaldır
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
        </div>
        <div className="mistake-fields">
          <SubjectTopicFields selection={selection} />
          <label>
            <span>
              Kaynak<span className="optional"> isteğe bağlı</span>
            </span>
            <input type="text" value={source} maxLength={80} placeholder="Örn. 3D TYT Deneme 4, soru 27" onChange={(e) => setSource(e.target.value)} />
          </label>
          <label>
            <span>
              Doğru cevap<span className="optional"> isteğe bağlı</span>
            </span>
            <input type="text" value={answer} maxLength={40} placeholder="Örn. C" onChange={(e) => setAnswer(e.target.value)} />
          </label>
          <label>
            <span>
              Not<span className="optional"> neden yanlış yaptın?</span>
            </span>
            <textarea value={note} maxLength={1000} rows={3} placeholder="Örn. Kökü yanlış okudum; işaret hatası…" onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
      </div>
      <p className="form-actions">
        <button type="submit" disabled={busy || selection.subjects.length === 0 || (!photo && !note.trim())}>
          Hata defterine ekle
        </button>
      </p>
    </form>
  );
}

// Tek bir soru kartı: önce yalnızca soru görünür, "Cevabı göster" ile doğru cevap ve not açılır
function MistakeCard({ item, today, onReview, onDelete, onZoom }) {
  const [revealed, setRevealed] = useState(false);
  const due = item.nextReview !== null && item.nextReview <= today;
  const meta = [subjectLabel(item.subjectName, item.examType), item.topicName].filter(Boolean).join(' · ');
  return (
    <li className={`mistake-card${due ? ' is-due' : ''}${item.learnedAt ? ' is-learned' : ''}`}>
      {item.imageId ? (
        <MistakeImage imageId={item.imageId} alt={`${meta} sorusu`} className="mistake-photo" onClick={onZoom} />
      ) : (
        <div className="mistake-photo mistake-text">{item.note}</div>
      )}
      <div className="mistake-body">
        <p className="mistake-meta">
          <b>{meta}</b>
          {item.source && <span className="muted"> · {item.source}</span>}
        </p>
        <p className="muted mistake-dates">
          {formatDate(item.createdAt)} eklendi ·{' '}
          {item.learnedAt
            ? `öğrenildi (${formatShortDate(item.learnedAt)})`
            : due
              ? 'tekrar zamanı geldi'
              : `sıradaki tekrar ${formatShortDate(item.nextReview)}`}
          {item.wrongCount > 0 && ` · ${item.wrongCount} kez yine yanlış`}
        </p>
        <div className="review-steps" aria-label={`${item.reviewStep} / 4 tekrar`}>
          {STEP_LABELS.map((label, i) => (
            <i key={label} className={i < item.reviewStep ? 'done' : undefined} title={label} />
          ))}
        </div>
        {revealed ? (
          <div className="mistake-answer">
            {item.answer && (
              <p>
                Doğru cevap: <b>{item.answer}</b>
              </p>
            )}
            {item.imageId && item.note && <p className="muted">{item.note}</p>}
            {!item.answer && !(item.imageId && item.note) && <p className="muted">Bu soruya doğru cevap girmemişsin.</p>}
          </div>
        ) : (
          <button type="button" className="link-button" onClick={() => setRevealed(true)}>
            Cevabı göster
          </button>
        )}
        <div className="mistake-actions">
          {due && (
            <>
              <button type="button" className="small" onClick={(e) => onReview(item, 'right', e.currentTarget)}>
                Doğru çözdüm
              </button>
              <button type="button" className="secondary small" onClick={(e) => onReview(item, 'wrong', e.currentTarget)}>
                Yine yanlış
              </button>
            </>
          )}
          <button type="button" className="secondary small danger" onClick={() => onDelete(item)}>
            Sil
          </button>
        </div>
      </div>
    </li>
  );
}

// Fotoğrafı ekranı kaplayacak şekilde gösterir (Esc ya da tıklama kapatır)
function Zoom({ url, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal?.();
  }, []);
  return (
    <dialog ref={ref} className="photo-zoom" onCancel={onClose} onClick={onClose} aria-label="Sorunun fotoğrafı">
      <img src={url} alt="Sorunun büyük hâli" />
    </dialog>
  );
}

const FILTERS = [
  ['due', 'Tekrar zamanı'],
  ['active', 'Öğrenilmeyenler'],
  ['learned', 'Öğrenilenler'],
];

export default function Mistakes() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('due');
  const [zoom, setZoom] = useState(null);
  const today = toLocalDateString(new Date());

  const load = useCallback(async () => {
    try {
      setItems(await apiFetch('/api/mistakes'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const list = items ?? [];
    return {
      due: list.filter((m) => m.nextReview !== null && m.nextReview <= today),
      active: list.filter((m) => !m.learnedAt),
      learned: list.filter((m) => m.learnedAt),
    };
  }, [items, today]);

  async function review(item, result, anchor) {
    setError(null);
    try {
      const updated = await apiFetch(`/api/mistakes/${item.id}/review`, { method: 'POST', body: { today, result } });
      if (updated.learnedAt) celebrate(anchor, 'Bu soruyu artık biliyorsun!');
      else if (result === 'right') celebrate(anchor, null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(item) {
    if (!window.confirm('Bu soru hata defterinden silinsin mi?')) return;
    setError(null);
    try {
      const { imageId } = await apiFetch(`/api/mistakes/${item.id}`, { method: 'DELETE' });
      if (imageId) await getImageStore().remove(imageId);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const shown = groups[filter];

  return (
    <section className="mistakes-page">
      <h1>Hata Defteri</h1>
      <p className="muted lede">
        Yanlış yaptığın ya da çözemediğin soruların fotoğrafını çek. Her soru 1, 3, 7 ve 30 gün sonra yeniden karşına
        çıkar; dört kez üst üste doğru çözünce öğrenilmiş sayılır. Yine yanlış yaparsan baştan başlar.
      </p>
      <ErrorBanner message={error} />
      <MistakeForm onSaved={load} />

      {items && items.length > 0 && (
        <div className="segmented mistake-filter" role="tablist" aria-label="Gösterilen sorular">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={filter === id ? 'active' : undefined}
              onClick={() => setFilter(id)}
            >
              {label} <span className="tab-count">{groups[id].length}</span>
            </button>
          ))}
        </div>
      )}

      {items && shown.length > 0 && (
        <ul className="mistake-grid">
          {shown.map((m) => (
            <MistakeCard key={m.id} item={m} today={today} onReview={review} onDelete={remove} onZoom={setZoom} />
          ))}
        </ul>
      )}

      {items && shown.length === 0 && (
        <EmptyState
          Doodle={EmptyNote}
          title={
            items.length === 0
              ? 'Hata defterin boş'
              : filter === 'due'
                ? 'Bugün tekrar edilecek soru yok'
                : filter === 'learned'
                  ? 'Henüz öğrenilmiş soru yok'
                  : 'Öğrenilmemiş soru kalmadı'
          }
          hint={items.length === 0 ? 'Bir denemede ya da testte yanlış yaptığın ilk soruyu yukarıdan ekle.' : 'Diğer sekmelere göz at.'}
        />
      )}
      {zoom && <Zoom url={zoom} onClose={() => setZoom(null)} />}
    </section>
  );
}
