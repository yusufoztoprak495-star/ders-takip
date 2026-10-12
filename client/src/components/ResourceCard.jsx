import { useState } from 'react';
import { toLocalDateString } from '../lib/dates.js';
import { formatLastSolved } from '../lib/format.js';

// Tek bir test kitabı: kaç test çözüldüğü, son çözüm tarihi, sayacı güncelleme, durum değiştirme ve silme.
// Kaydetme, durum değiştirme ve silme işlemleri üst sayfadan gelir (hata gösterimi de orada yapılır).
export default function ResourceCard({ resource, subjectName, onSave, onToggleStatus, onDelete }) {
  const [solved, setSolved] = useState(String(resource.solvedTests));
  const changed = solved !== String(resource.solvedTests);
  const done = resource.status === 'bitirdim';

  return (
    <li className={done ? 'resource is-done' : 'resource'}>
      <div className="resource-head">
        <div className="resource-title">
          <strong>{resource.name}</strong>
          <div className="muted">{[resource.publisher, subjectName].filter(Boolean).join(' · ')}</div>
        </div>
        <span className="actions">
          <button type="button" className="secondary" onClick={() => onToggleStatus(resource)}>
            {done ? 'Tekrar elime al' : 'Bitirdim'}
          </button>
          <button type="button" className="secondary" onClick={() => onDelete(resource)}>
            Sil
          </button>
        </span>
      </div>

      <div className="solved-counter">
        <span className="solved-number">{resource.solvedTests}</span>
        <span className="solved-label">test çözüldü</span>
        <span className="solved-last">
          <span className="label">Son çözüm</span>
          {formatLastSolved(resource.lastSolvedAt, toLocalDateString(new Date()))}
        </span>
      </div>

      {!done && (
        <div className="resume">
          <button type="button" className="secondary" onClick={() => onSave(resource, String(resource.solvedTests + 1))}>
            +1 test
          </button>
          <label>
            Çözülen test sayısı
            <input type="number" step="1" value={solved} onChange={(e) => setSolved(e.target.value)} />
          </label>
          <button type="button" disabled={!changed} onClick={() => onSave(resource, solved)}>
            Kaydet
          </button>
        </div>
      )}
    </li>
  );
}
