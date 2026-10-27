import { DAYS, formatClock, slotAt } from '../lib/schedule.js';

const spanText = (b) => `${formatClock(b.start)}–${formatClock(b.end)}`;

// Izgaradaki tek blok. Ders programından gelen ders ve ortak bloklar her haftada aynı görünür;
// haftaya özel blok köşesindeki noktayla ayrılır. Dersler burada değiştirilmez (Ders Programı sayfasında düzenlenir).
function Block({ item, range, hourPx, onOpen }) {
  const top = ((item.start - range.start) / 60) * hourPx;
  const height = ((item.end - item.start) / 60) * hourPx;
  const short = item.end - item.start < 40 || height < 34;
  const style = { top: `${top}px`, height: `${height}px` };
  const cls = ['block', `block-${item.type}`, item.source === 'week' && 'block-weekly', short && 'short', item.clash && 'clash']
    .filter(Boolean)
    .join(' ');
  const body = (
    <>
      <span className="block-title">{item.label}</span>
      <span className="block-time">
        {spanText(item)}
        {item.place ? ` · ${item.place}` : ''}
      </span>
    </>
  );
  if (item.source === 'class') {
    return (
      <div
        className={cls}
        style={style}
        title={`${item.label} · ${spanText(item)} · Ders Programı sayfasında düzenlenir`}
        onClick={(e) => e.stopPropagation()}
      >
        {body}
      </div>
    );
  }
  const where = item.source === 'week' ? 'yalnızca bu hafta' : 'ortak: 4 haftada da';
  return (
    <button
      type="button"
      className={cls}
      style={style}
      title={`${item.label} · ${spanText(item)} · ${where}${item.clash ? ' · çakışıyor' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(item);
      }}
    >
      {body}
    </button>
  );
}

// Haftalık ızgara: gün sütunları, saat çizgileri, bloklar. Hangi haftaya ait olduğunu bilmez; verilen blokları çizer.
//  items: { source: 'class' | 'common' | 'week', id, day, start, end, type, label, place, clash }
//  days: gösterilecek gün numaraları · todayDay: bugünün gün numarası (bu hafta bugünü içeriyorsa, yoksa null)
//  onAdd(day, slot): boş yere tıklanınca · onOpen(item): bloğa tıklanınca
export default function WeekGrid({ items, range, hourPx, days, narrow, todayDay, nowMinute, onOpen, onAdd }) {
  const hours = [];
  for (let m = range.start; m < range.end; m += 60) hours.push(m);
  const showNow = todayDay !== null && nowMinute >= range.start && nowMinute < range.end;

  function handleColumnClick(event, day) {
    const rect = event.currentTarget.getBoundingClientRect();
    const minute = range.start + ((event.clientY - rect.top) / hourPx) * 60;
    const slot = slotAt(items.filter((b) => b.day === day), Math.floor(minute), range);
    if (slot) onAdd(day, slot);
  }

  return (
    <div className="week-grid compact" style={{ '--cols': days.length, '--hour': `${hourPx}px` }}>
      <div className="week-head">
        <span className="gutter" />
        {days.map((day) => (
          <div key={day} className={day === todayDay ? 'day-head is-today' : 'day-head'}>
            <span className="day-name">{narrow ? DAYS[day].name : DAYS[day].short}</span>
          </div>
        ))}
      </div>
      <div className="week-body" style={{ height: `${hours.length * hourPx}px` }}>
        <div className="gutter hours" aria-hidden="true">
          {hours.map((m) => (
            <span key={m} style={{ top: `${((m - range.start) / 60) * hourPx}px` }}>
              {String(m / 60).padStart(2, '0')}
            </span>
          ))}
        </div>
        {days.map((day) => (
          // Boş alana tıklama fareyle hızlı ekleme içindir; klavyede "Blok ekle" düğmesi aynı işi yapar
          <div
            key={day}
            className={day === todayDay ? 'day-col is-today' : 'day-col'}
            aria-label={DAYS[day].name}
            role="group"
            onClick={(e) => handleColumnClick(e, day)}
          >
            {items
              .filter((b) => b.day === day)
              .map((item) => (
                <Block key={`${item.source}${item.id}`} item={item} range={range} hourPx={hourPx} onOpen={onOpen} />
              ))}
            {day === todayDay && showNow && (
              <span
                className="now-line"
                style={{ top: `${((nowMinute - range.start) / 60) * hourPx}px` }}
                aria-label={`Şu an ${formatClock(nowMinute)}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
