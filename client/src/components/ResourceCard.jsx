import { useState } from 'react';

// Tek bir kaynak: ilerleme çubuğu, "kaldığım yer" alanı ve silme düğmesi.
// Kaydetme ve silme işlemleri üst sayfadan gelir (hata gösterimi de orada yapılır).
export default function ResourceCard({ resource, subjectName, onSave, onDelete }) {
  const [current, setCurrent] = useState(String(resource.currentUnit));

  const changed = current !== String(resource.currentUnit);

  return (
    <li className="resource">
      <div className="resource-head">
        <div>
          <strong>{resource.name}</strong>
          <span className="badge">{resource.type === 'kitap' ? 'Kitap' : 'Video'}</span>
          <div className="muted">{subjectName}</div>
        </div>
        <button type="button" className="secondary" onClick={() => onDelete(resource)}>
          Sil
        </button>
      </div>

      <div className="progress-line">
        <progress max="100" value={resource.progressPercent} aria-label="İlerleme" />
        <span>%{resource.progressPercent}</span>
      </div>

      <div className="resume">
        <label>
          Kaldığım yer ({resource.totalUnits} birimden)
          <input
            type="number"
            step="1"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <button type="button" disabled={!changed} onClick={() => onSave(resource, current)}>
          Kaydet
        </button>
      </div>
    </li>
  );
}
