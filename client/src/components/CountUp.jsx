import { useEffect, useRef, useState } from 'react';

// Sayıyı 0'dan (ya da önceki değerinden) hedefe kısa bir sürede sayarak gösterir.
// format: ekrandaki yazı (örn. formatNet, formatDuration). "Hareketi azalt" açıksa doğrudan hedef yazılır.
export default function CountUp({ value, format = (n) => String(Math.round(n)), duration = 800 }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof value !== 'number' || !Number.isFinite(value)) {
      setShown(value);
      from.current = value;
      return undefined;
    }
    const start = performance.now();
    const begin = from.current;
    let frame;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - (1 - p) ** 3; // sona doğru yavaşlar
      setShown(begin + (value - begin) * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  // Ara değerler hedefle aynı hassasiyette yuvarlanır (net 2 basamak, diğerleri tam sayı)
  const precise = Number.isInteger(value) ? Math.round(shown) : Math.round(shown * 100) / 100;
  return <>{format(precise)}</>;
}
