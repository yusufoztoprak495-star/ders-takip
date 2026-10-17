import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api.js';
import { daysAgo, toLocalDateString } from '../lib/dates.js';
import { formatDate, formatDuration } from '../lib/format.js';
import { heatmapWeeks } from '../lib/heatmap.js';
import { studyStreak } from '../lib/insights.js';

const CELL = 12;
const GAP = 3;
const LEFT = 28;
const TOP = 16;
const ROW_LABELS = [
  [0, 'Pzt'],
  [2, 'Çar'],
  [4, 'Cum'],
];

// Çalışma ısı haritası: her gün bir kare. weeks: kaç hafta geriye (yıllık 53, ana sayfada daha kısa).
// Kendi verisini çeker; sayfalar yalnızca yerleştirir.
export default function Heatmap({ weeks = 53, title = 'Son bir yıl' }) {
  const [daily, setDaily] = useState(null);
  const today = toLocalDateString(new Date());

  useEffect(() => {
    apiFetch(`/api/stats/daily?from=${daysAgo(weeks * 7 + 7)}&to=${today}`)
      .then(setDaily)
      .catch(() => setDaily([]));
  }, [weeks, today]);

  const data = useMemo(() => {
    if (!daily) return null;
    const columns = heatmapWeeks(daily, today, weeks);
    const cells = columns.flatMap((w) => w.days).filter((d) => !d.future);
    return {
      columns,
      studied: cells.filter((d) => d.seconds > 0).length,
      total: cells.reduce((s, d) => s + d.seconds, 0),
      streak: studyStreak(daily, today).count,
      best: cells.reduce((b, d) => (d.seconds > (b?.seconds ?? 0) ? d : b), null),
    };
  }, [daily, today, weeks]);

  if (!data) return null;
  const width = LEFT + weeks * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);

  return (
    <section className="heatmap-card chart-card">
      <header>
        <div>
          <h3>{title}</h3>
          <p className="muted">
            {data.studied} gün çalıştın · toplam {formatDuration(data.total)}
            {data.best ? ` · en uzun gün ${formatDate(data.best.date)} (${formatDuration(data.best.seconds)})` : ''}
          </p>
        </div>
      </header>
      <div className="heatmap-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="heatmap"
          // Kutuyu doldurur ama kareler en fazla 1,6 kat büyür; dar ekranda küçülmez, yana kayar
          style={{ width: '100%', minWidth: width, maxWidth: width * 1.6 }}
          role="img"
          aria-label={`${title}: ${data.studied} gün çalışıldı, toplam ${formatDuration(data.total)}`}
        >
          {ROW_LABELS.map(([row, label]) => (
            <text key={label} x="0" y={TOP + row * (CELL + GAP) + CELL - 2} className="hm-label">
              {label}
            </text>
          ))}
          {data.columns.map((week, w) => (
            <g key={week.monday} transform={`translate(${LEFT + w * (CELL + GAP)} 0)`}>
              {week.month && (
                <text x="0" y="10" className="hm-label">
                  {week.month}
                </text>
              )}
              {week.days.map((d, i) =>
                d.future ? null : (
                  <rect
                    key={d.date}
                    y={TOP + i * (CELL + GAP)}
                    width={CELL}
                    height={CELL}
                    rx="2.5"
                    className={`hm-cell l${d.level}${d.date === today ? ' today' : ''}`}
                    style={{ animationDelay: `${w * 12}ms` }}
                  >
                    <title>
                      {formatDate(d.date)}: {d.seconds ? formatDuration(d.seconds) : 'çalışma yok'}
                    </title>
                  </rect>
                ),
              )}
            </g>
          ))}
        </svg>
      </div>
      <div className="hm-legend" aria-hidden="true">
        <span>Az</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <i key={l} className={`hm-cell l${l}`} />
        ))}
        <span>Çok</span>
      </div>
    </section>
  );
}
