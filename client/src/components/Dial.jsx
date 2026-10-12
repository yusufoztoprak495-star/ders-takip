import { litTicks, tickPosition } from '../lib/dial.js';

const COUNT = 60;
const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 132;

// Saat çerçevesi gibi 60 çentikli kadran. Süre aktıkça çentikler 12'den başlayarak
// saat yönünde söner. Çalışmada turuncu, molada turkuaz yanar.
// remaining/duration boşsa (sayaç çalışmıyor) kadran tamamen sönük çizilir.
export default function Dial({ kind = 'work', remaining = null, duration = null, children }) {
  const lit = remaining === null ? 0 : litTicks(remaining, duration, COUNT);
  const firstLit = COUNT - lit;

  return (
    <div className={`dial dial-${kind}`}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        {Array.from({ length: COUNT }, (_, i) => {
          const major = i % 5 === 0;
          const p = tickPosition(i, COUNT, CENTER, RADIUS, major ? 16 : 9);
          const isLit = i >= firstLit;
          const isLeading = isLit && i === firstLit;
          return (
            <line
              key={i}
              x1={p.x1}
              y1={p.y1}
              x2={p.x2}
              y2={p.y2}
              className={isLit ? (isLeading ? 'tick lit leading' : 'tick lit') : 'tick'}
              strokeWidth={major ? 2 : 1.4}
            />
          );
        })}
      </svg>
      <div className="dial-center">{children}</div>
    </div>
  );
}
