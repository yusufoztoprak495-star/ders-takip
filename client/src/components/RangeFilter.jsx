export const RANGES = [7, 14, 30, 90];

// Tarih aralığı düğmeleri (son 7/14/30/90 gün)
export default function RangeFilter({ range, onChange }) {
  return (
    <div role="group" aria-label="Tarih aralığı" className="range-buttons">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          className={r === range ? '' : 'secondary'}
          aria-pressed={r === range}
          onClick={() => onChange(r)}
        >
          Son {r} gün
        </button>
      ))}
    </div>
  );
}
