import { Link } from 'react-router-dom';
import { formatDate } from '../lib/format.js';
import { subjectLabel } from '../lib/tracks.js';

// Denemelerden toplanan "soru kaybettiren konular": en çok yanlış/boş gelen konular başta
export default function WrongTopicsSummary({ rows, limit = 8 }) {
  if (rows.length === 0) return null;
  const max = rows[0].count;
  return (
    <section className="chart-card wrong-summary">
      <header>
        <div>
          <h3>Soru kaybettiren konular</h3>
          <p className="muted">Denemelerde işlediğin yanlış ve boşlar · tekrar listene önce bunları koy</p>
        </div>
      </header>
      <ol>
        {rows.slice(0, limit).map((r) => (
          <li key={r.topicId}>
            <Link to={`/ilerleme/ders/${r.subjectId}/konu/${r.topicId}`} className="wrong-name">
              {r.topicName}
              <span className="muted"> {subjectLabel(r.subjectName, r.examType)}</span>
            </Link>
            <span className="wrong-bar" aria-hidden="true">
              <i style={{ width: `${(r.count / max) * 100}%` }} />
            </span>
            <span className="wrong-count">
              <b>{r.count}</b> soru
              <span className="muted">
                {' '}
                · {r.exams} deneme · son {formatDate(r.lastDate)}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {rows.length > limit && <p className="muted">ve {rows.length - limit} konu daha.</p>}
    </section>
  );
}
