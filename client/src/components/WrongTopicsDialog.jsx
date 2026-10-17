import { useEffect, useMemo, useRef, useState } from 'react';
import ErrorBanner from './ErrorBanner.jsx';
import { BRANCH_TYPE, examShortLabel } from '../lib/exams.js';
import { formatDate } from '../lib/format.js';
import { subjectLabel } from '../lib/tracks.js';

// Deneme türüne uygun dersler: TYT → TYT dersleri, AYT alanları → AYT dersleri, branş → yalnızca o ders.
// Eşleşen ders yoksa (DGS, elle eklenmiş dersler) hepsi gösterilir.
function subjectsFor(exam, subjects) {
  if (exam.type === BRANCH_TYPE) return subjects.filter((s) => s.id === exam.subjectId);
  const group = exam.type.startsWith('AYT') ? 'AYT' : exam.type;
  const matched = subjects.filter((s) => s.examType === group);
  return matched.length > 0 ? matched : subjects;
}

let rowKey = 0;
const newRow = (subjectId, topicId = '', count = '1') => ({ key: ++rowKey, subjectId: String(subjectId ?? ''), topicId: String(topicId), count });

// Deneme sonrası analiz: yanlış ya da boş bırakılan soruların hangi konulardan geldiği.
// Her satır: ders, konu, soru sayısı. Toplam, denemedeki yanlış + boş sayısını aşamaz (veri katmanı da denetler).
export default function WrongTopicsDialog({ exam, subjects, error, onSave, onClose }) {
  const dialogRef = useRef(null);
  const options = useMemo(() => subjectsFor(exam, subjects), [exam, subjects]);
  const subjectOfTopic = useMemo(() => {
    const map = new Map();
    for (const s of subjects) for (const t of s.topics) map.set(t.id, s.id);
    return map;
  }, [subjects]);
  const [rows, setRows] = useState(() =>
    exam.wrongTopics.length > 0
      ? exam.wrongTopics.map((w) => newRow(subjectOfTopic.get(w.topicId), w.topicId, String(w.count)))
      : [newRow(options[0]?.id)],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal?.();
  }, []);

  const limit = exam.totals.wrong + exam.totals.blank;
  const used = rows.reduce((sum, r) => sum + (r.topicId && Number(r.count) > 0 ? Number(r.count) : 0), 0);
  const update = (key, patch) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function handleSubmit(event) {
    event.preventDefault();
    const items = rows
      .filter((r) => r.topicId !== '' && r.count !== '')
      .map((r) => ({ topicId: Number(r.topicId), count: Number(r.count) }));
    onSave(items);
  }

  return (
    <dialog ref={dialogRef} className="plan-editor wrong-topics" onCancel={onClose} aria-labelledby="wrong-topics-title">
      <form onSubmit={handleSubmit}>
        <div>
          <h2 id="wrong-topics-title">Yanlış yaptığın konular</h2>
          <p className="muted">
            {formatDate(exam.date)} · {examShortLabel(exam.type)} {exam.name ? `· ${exam.name}` : ''}
          </p>
        </div>
        <p className="muted">
          Yanlış ya da boş bıraktığın soruların konusunu işle. Birkaç denemeden sonra hangi konuların sana sürekli
          soru kaybettirdiği Denemeler sayfasında görünür.
        </p>
        <ErrorBanner message={error} />
        <ul className="wrong-rows">
          {rows.map((r) => {
            const subject = options.find((s) => String(s.id) === r.subjectId);
            return (
              <li key={r.key}>
                <select
                  aria-label="Ders"
                  value={r.subjectId}
                  onChange={(e) => update(r.key, { subjectId: e.target.value, topicId: '' })}
                >
                  {options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {subjectLabel(s.name, s.examType)}
                    </option>
                  ))}
                </select>
                <select aria-label="Konu" value={r.topicId} onChange={(e) => update(r.key, { topicId: e.target.value })}>
                  <option value="">Konu seç</option>
                  {subject?.topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={limit}
                  aria-label="Soru sayısı"
                  value={r.count}
                  onChange={(e) => update(r.key, { count: e.target.value })}
                />
                <button
                  type="button"
                  className="secondary small"
                  aria-label="Satırı sil"
                  onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
        <div className="wrong-footer">
          <button type="button" className="secondary small" onClick={() => setRows((list) => [...list, newRow(list.at(-1)?.subjectId ?? options[0]?.id)])}>
            + Konu ekle
          </button>
          <span className={used > limit ? 'change-down' : 'muted'}>
            {used} / {limit} soru işlendi
          </span>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={used > limit}>
            Kaydet
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            Vazgeç
          </button>
        </div>
      </form>
    </dialog>
  );
}
