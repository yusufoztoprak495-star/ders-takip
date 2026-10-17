import { useEffect, useState } from 'react';
import { CELEBRATE_EVENT } from '../lib/celebrate.js';

const PIECES = 30;
const SHAPES = ['dot', 'bar', 'tri'];
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--accent-fill)', 'var(--teal)'];

// Bir patlamanın parçaları: her biri farklı açıyla, uzaklıkla ve dönüşle uçup düşer
function makeBurst(id, x, y) {
  return {
    id,
    x,
    y,
    pieces: Array.from({ length: PIECES }, (_, i) => {
      const angle = (Math.PI * 2 * i) / PIECES + (Math.random() - 0.5) * 0.5;
      const dist = 70 + Math.random() * 110;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 40,
        rot: Math.round((Math.random() - 0.5) * 720),
        shape: SHAPES[i % SHAPES.length],
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.08,
      };
    }),
  };
}

// Uygulama genelinde kutlama katmanı: lib/celebrate.js'in gönderdiği olayı dinler,
// konfeti patlatır ve kısa bir mesaj gösterir. "Hareketi azalt" açıksa yalnızca mesaj çıkar.
export default function Celebration() {
  const [bursts, setBursts] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let counter = 0;
    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };
    function onCelebrate(event) {
      const { x, y, message } = event.detail;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) {
        const id = ++counter;
        setBursts((list) => [...list, makeBurst(id, x, y)]);
        later(() => setBursts((list) => list.filter((b) => b.id !== id)), 1600);
      }
      if (message) {
        const id = ++counter;
        setToast({ id, message });
        later(() => setToast((t) => (t?.id === id ? null : t)), 2600);
      }
    }
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => {
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <>
      <div className="confetti-layer" aria-hidden="true">
        {bursts.map((b) => (
          <div key={b.id} className="burst" style={{ left: `${b.x}px`, top: `${b.y}px` }}>
            {b.pieces.map((p, i) => (
              <i
                key={i}
                className={`piece ${p.shape}`}
                style={{
                  '--dx': `${p.dx}px`,
                  '--dy': `${p.dy}px`,
                  '--rot': `${p.rot}deg`,
                  background: p.shape === 'tri' ? 'none' : p.color,
                  borderBottomColor: p.color,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <p key={toast.id} className="toast">
            {toast.message}
          </p>
        )}
      </div>
    </>
  );
}
