import { useState } from 'react';

// Tek bir test kitabı: ilerleme çubuğu, "çözülen test" alanı, durum değiştirme ve silme.
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

      <div className="progress-line">
        <progress max="100" value={resource.progressPercent} aria-label="İlerleme" />
        <span>
          {resource.solvedTests} / {resource.totalTests} test
        </span>
      </div>

      {!done && (
        <div className="resume">
          <label>
            Çözülen test ({resource.totalTests} testten)
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
