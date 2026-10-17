import { DAYS } from '../lib/schedule.js';

// Haftanın yedi günü yan yana küçük düğmeler. `selected` gün numaralarının dizisidir (0 = pazartesi).
// multiple: birden çok gün seçilebilir (ders ekleme, kopyalama); değilse tek gün (düzenleme).
// disabledDays: seçilemeyen günler (örn. kopyalanan günün kendisi).
export default function DayPicker({ selected, onChange, multiple = true, disabledDays = [], label }) {
  function toggle(day) {
    if (!multiple) {
      onChange([day]);
      return;
    }
    onChange(selected.includes(day) ? selected.filter((d) => d !== day) : [...selected, day].sort());
  }

  return (
    <div className="day-picker" role="group" aria-label={label}>
      {DAYS.map((d, i) => (
        <button
          key={d.short}
          type="button"
          className={selected.includes(i) ? 'day-chip on' : 'day-chip'}
          aria-pressed={selected.includes(i)}
          title={d.name}
          disabled={disabledDays.includes(i)}
          onClick={() => toggle(i)}
        >
          {d.short}
        </button>
      ))}
    </div>
  );
}
