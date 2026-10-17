import { useMemo } from 'react';
import { collectionLayout } from '../lib/badges.js';
import { useThemeId } from '../hooks/useThemeId.js';

const W = 800;
const H = 300;
const MAX = 600;

// Temaya göre koleksiyonun adı ve her pomodoronun şekli
const KINDS = {
  dark: { title: 'Gökyüzün', note: 'Her pomodoro gökyüzüne bir yıldız ekler.' },
  light: { title: 'Herbaryum', note: 'Her pomodoro deftere mürekkeple bir yaprak çizer.' },
  neon: { title: 'Şehir ışıkları', note: 'Her pomodoro gecede bir ışık daha yakar.' },
  pastel: { title: 'Çıkartma albümü', note: 'Her pomodoro albüme bir çıkartma yapıştırır.' },
};

// Tek bir öğe: tema şekli (yıldız / yaprak / ışık / çıkartma), konumu ve büyüklüğü yerleşimden gelir
function Item({ theme, p, index }) {
  const s = p.size;
  const style = { animationDelay: `${Math.min(index, 120) * 8}ms` };
  if (theme === 'light') {
    return (
      <g transform={`translate(${p.x} ${p.y}) rotate(${p.turn}) scale(${s})`} className="col-item col-leaf" style={style}>
        <path d="M0 -9 C6 -5 6 4 0 9 C-6 4 -6 -5 0 -9Z" />
        <path d="M0 -7 V8" />
      </g>
    );
  }
  if (theme === 'neon') {
    return (
      <g transform={`translate(${p.x} ${p.y}) scale(${s})`} className={`col-item col-light v${p.variant}`} style={style}>
        <rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5" />
      </g>
    );
  }
  if (theme === 'pastel') {
    const shapes = [
      'M0 -8 L2.4 -2.5 8 -2.5 3.5 1.2 5.2 7 0 3.6 -5.2 7 -3.5 1.2 -8 -2.5 -2.4 -2.5Z',
      'M0 7 C-9 0 -6 -8 0 -3.5 C6 -8 9 0 0 7Z',
      'M0 -8 A8 8 0 1 1 -0.1 -8Z',
    ];
    return (
      <g transform={`translate(${p.x} ${p.y}) rotate(${p.turn % 40 - 20}) scale(${s})`} className={`col-item col-sticker v${p.variant}`} style={style}>
        <path d={shapes[p.variant]} />
      </g>
    );
  }
  return (
    <g transform={`translate(${p.x} ${p.y}) scale(${s})`} className="col-item col-star" style={style}>
      <path d="M0 -6 L1.3 -1.3 6 0 1.3 1.3 0 6 -1.3 1.3 -6 0 -1.3 -1.3Z" />
    </g>
  );
}

export default function Collection({ count }) {
  const theme = useThemeId();
  const kind = KINDS[theme] ?? KINDS.dark;
  const items = useMemo(() => collectionLayout(count, { width: W, height: H, seed: 7, max: MAX }), [count]);
  return (
    <section className={`chart-card collection collection-${theme}`}>
      <header>
        <div>
          <h3>{kind.title}</h3>
          <p className="muted">
            {kind.note} Şimdiye kadar <b>{count}</b> pomodoro{count > MAX ? ` (ilk ${MAX} tanesi görünüyor)` : ''}.
          </p>
        </div>
      </header>
      <svg viewBox={`0 0 ${W} ${H}`} className="collection-canvas" role="img" aria-label={`${kind.title}: ${count} pomodoro`}>
        {items.map((p, i) => (
          <Item key={p.cell} theme={theme} p={p} index={i} />
        ))}
        {count === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" className="collection-empty">
            İlk pomodoronu bitirince burada belirecek.
          </text>
        )}
      </svg>
    </section>
  );
}
