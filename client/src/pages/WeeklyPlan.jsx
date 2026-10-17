import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import DayPicker from '../components/DayPicker.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { subjectLabel } from '../lib/tracks.js';
import { formatDuration } from '../lib/format.js';
import {
  DAYS,
  dayIndexOf,
  formatClock,
  gridRange,
  minutesLabel,
  overlaps,
  slotAt,
  spanFromInputs,
  weekDates,
} from '../lib/schedule.js';

// Bir saatin ızgaradaki yüksekliği (piksel). Dakika başına HOUR_PX / 60.
const HOUR_PX = 56;
const KINDS = [
  { id: 'study', label: 'Çalışma' },
  { id: 'break', label: 'Mola' },
  { id: 'other', label: 'Diğer' },
];

const toInput = (minutes) => (minutes === 1440 ? '00:00' : formatClock(minutes));
const spanText = (b) => `${formatClock(b.start)}–${formatClock(b.end)}`;

// Telefon genişliğinde ızgara tek gün gösterir
function useNarrow() {
  const query = '(max-width: 820px)';
  const [narrow, setNarrow] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

// Şu anki dakika (şimdi çizgisi için); dakikada bir güncellenir
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Blok ekleme/düzenleme penceresi. `draft`: { id?, day, start, end, kind, title, subjectId }
function PlanEditor({ draft, subjects, onSave, onDelete, onClose, error }) {
  const dialogRef = useRef(null);
  const [kind, setKind] = useState(draft.kind);
  const [day, setDay] = useState([draft.day]);
  const [start, setStart] = useState(toInput(draft.start));
  const [end, setEnd] = useState(toInput(draft.end));
  const [subjectId, setSubjectId] = useState(draft.subjectId ?? '');
  const [title, setTitle] = useState(draft.title ?? '');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal?.();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    const span = spanFromInputs(start, end) ?? { start: null, end: null };
    onSave({
      kind,
      day: day[0],
      ...span,
      title,
      subjectId: kind === 'study' && subjectId !== '' ? Number(subjectId) : null,
    });
  }

  const titleHint = { study: 'Örn. Türev soru çözümü', break: 'Örn. Yemek', other: 'Örn. Spor, kurs, yol' }[kind];

  return (
    <dialog ref={dialogRef} className="plan-editor" onCancel={onClose} aria-labelledby="plan-editor-title">
      <form onSubmit={handleSubmit}>
        <h2 id="plan-editor-title">{draft.id ? 'Bloğu düzenle' : 'Yeni blok'}</h2>
        <ErrorBanner message={error} />
        <div className="segmented" role="group" aria-label="Blok türü">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              className={kind === k.id ? 'active' : undefined}
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="field">
          <span className="label">Gün</span>
          <DayPicker selected={day} onChange={setDay} multiple={false} label="Gün" />
        </div>
        <div className="row">
          <label>
            Başlangıç
            <input type="time" step="300" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>
            Bitiş
            <input type="time" step="300" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        {kind === 'study' && (
          <label>
            Ders
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Ders seçilmedi</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {subjectLabel(s.name, s.examType)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>
            {kind === 'other' ? 'Ne yapacaksın?' : 'Not'}
            {kind !== 'other' && <span className="optional"> isteğe bağlı</span>}
          </span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={titleHint} maxLength={60} />
        </label>
        <div className="form-actions">
          <button type="submit">{draft.id ? 'Kaydet' : 'Bloğu ekle'}</button>
          <button type="button" className="secondary" onClick={onClose}>
            Vazgeç
          </button>
          {draft.id && (
            <button type="button" className="secondary danger" onClick={onDelete}>
              Sil
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}

// Günü kopyalama penceresi
function CopyDialog({ defaultFrom, onCopy, onClose, error }) {
  const dialogRef = useRef(null);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState([]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal?.();
  }, []);

  return (
    <dialog ref={dialogRef} className="plan-editor" onCancel={onClose} aria-labelledby="copy-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCopy(from, to);
        }}
      >
        <h2 id="copy-title">Günü kopyala</h2>
        <ErrorBanner message={error} />
        <label>
          Kopyalanacak gün
          <select
            value={from}
            onChange={(e) => {
              const value = Number(e.target.value);
              setFrom(value);
              setTo((t) => t.filter((d) => d !== value));
            }}
          >
            {DAYS.map((d, i) => (
              <option key={d.short} value={i}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span className="label">Hangi günlere</span>
          <DayPicker selected={to} onChange={setTo} disabledDays={[from]} label="Hedef günler" />
        </div>
        <p className="muted small-note">
          Seçtiğin günlerdeki eski bloklar silinir, yerine bu günün blokları gelir. Ders saatine denk gelen blok
          atlanır.
        </p>
        <div className="form-actions">
          <button type="submit" disabled={to.length === 0}>
            Kopyala
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            Vazgeç
          </button>
        </div>
      </form>
    </dialog>
  );
}

// Izgaradaki tek blok (ders ya da plan)
function Block({ item, range, onOpen }) {
  const top = ((item.start - range.start) / 60) * HOUR_PX;
  const height = ((item.end - item.start) / 60) * HOUR_PX;
  const short = item.end - item.start < 40;
  const style = { top: `${top}px`, height: `${height}px` };
  const cls = ['block', `block-${item.type}`, short && 'short', item.clash && 'clash'].filter(Boolean).join(' ');
  const body = (
    <>
      <span className="block-title">{item.label}</span>
      <span className="block-time">
        {spanText(item)}
        {item.place ? ` · ${item.place}` : ''}
      </span>
    </>
  );
  // Ders programından gelen ders burada değiştirilmez (Ders Programı sayfasında düzenlenir);
  // tıklama sütuna geçip "boş yer" sanılmasın diye durdurulur
  if (item.type === 'class') {
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
  return (
    <button
      type="button"
      className={cls}
      style={style}
      title={`${item.label} · ${spanText(item)}${item.clash ? ' · ders saatiyle çakışıyor' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(item);
      }}
    >
      {body}
    </button>
  );
}

export default function WeeklyPlan() {
  const narrow = useNarrow();
  const now = useNow();
  const today = dayIndexOf(now);
  // Hafta yalnızca gün değişince yeniden hesaplanır (dakikalık güncelleme verileri baştan yüklemesin)
  const dayKey = now.toDateString();
  const dates = useMemo(() => weekDates(new Date(dayKey)), [dayKey]);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dialogError, setDialogError] = useState(null);
  const [editor, setEditor] = useState(null); // açık blok penceresi
  const [copying, setCopying] = useState(false);
  const [shownDay, setShownDay] = useState(today); // telefonda gösterilen gün

  const load = useCallback(async () => {
    try {
      const [classes, plans, subjects, win, daily] = await Promise.all([
        apiFetch('/api/classes'),
        apiFetch('/api/plans'),
        apiFetch('/api/subjects'),
        apiFetch('/api/schedule'),
        apiFetch(`/api/stats/daily?from=${dates[0]}&to=${dates[6]}`),
      ]);
      setData({ classes, plans, subjects, win, daily });
    } catch (e) {
      setError(e.message);
    }
  }, [dates]);

  useEffect(() => {
    load();
  }, [load]);

  // Izgaraya çizilecek her şey: ders programındaki dersler (kilitli) ve kullanıcının blokları
  const view = useMemo(() => {
    if (!data) return null;
    const subjectOf = new Map(data.subjects.map((s) => [s.id, s]));
    const classes = data.classes.map((c) => ({ ...c, type: 'class', label: c.title }));
    const plans = data.plans.map((p) => {
      const s = subjectOf.get(p.subjectId);
      const subjectText = s ? subjectLabel(s.name, s.examType) : '';
      let label = p.title || subjectText || (p.kind === 'break' ? 'Mola' : 'Çalışma');
      if (p.kind === 'study' && s && p.title) label = `${subjectText}: ${p.title}`;
      // Bloktan sonra aynı saate ders eklendiyse blok çakışmalı kalır; ızgarada işaretlenir
      const clash = classes.some((c) => c.day === p.day && overlaps(c, p));
      return { ...p, type: p.kind, label, clash };
    });
    const range = gridRange([...classes, ...plans], data.win);
    const plannedStudy = DAYS.map((_, day) =>
      plans.filter((p) => p.day === day && p.kind === 'study').reduce((sum, p) => sum + p.end - p.start, 0),
    );
    const doneSeconds = DAYS.map((_, day) => data.daily.find((d) => d.date === dates[day])?.totalSeconds ?? 0);
    return { classes, plans, range, plannedStudy, doneSeconds, clashes: plans.filter((p) => p.clash).length };
  }, [data, dates]);

  async function run(action, message) {
    setDialogError(null);
    setError(null);
    try {
      await action();
      await load();
      setNotice(message);
      return true;
    } catch (e) {
      setDialogError(e.message);
      return false;
    }
  }

  function openNew(day, slot) {
    setNotice(null);
    setDialogError(null);
    setEditor({ day, start: slot.start, end: slot.end, kind: 'study', title: '', subjectId: null });
  }

  // Izgarada boş bir yere tıklanınca o saate yeni blok önerilir
  function handleColumnClick(event, day) {
    const rect = event.currentTarget.getBoundingClientRect();
    const minute = view.range.start + ((event.clientY - rect.top) / HOUR_PX) * 60;
    const occupied = [...view.classes, ...view.plans].filter((b) => b.day === day);
    const slot = slotAt(occupied, Math.floor(minute), view.range);
    if (slot) openNew(day, slot);
  }

  // Klavyeyle/düğmeyle ekleme: gösterilen günün ilk uygun boşluğu
  function handleAddButton() {
    const day = narrow ? shownDay : today;
    const occupied = [...view.classes, ...view.plans].filter((b) => b.day === day);
    let slot = null;
    for (let m = Math.max(view.range.start, data.win.dayStart); m < view.range.end && !slot; m += 30) {
      slot = slotAt(occupied, m, view.range);
    }
    openNew(day, slot ?? { start: data.win.dayStart, end: data.win.dayStart + 60 });
  }

  async function savePlan(body) {
    const ok = await run(
      () =>
        editor.id
          ? apiFetch(`/api/plans/${editor.id}`, { method: 'PUT', body })
          : apiFetch('/api/plans', { method: 'POST', body }),
      editor.id ? 'Blok güncellendi.' : 'Blok eklendi.',
    );
    if (ok) setEditor(null);
  }

  async function deletePlan() {
    const ok = await run(() => apiFetch(`/api/plans/${editor.id}`, { method: 'DELETE' }), 'Blok silindi.');
    if (ok) setEditor(null);
  }

  async function copyDay(from, to) {
    const targetHasPlans = view.plans.some((p) => to.includes(p.day));
    if (targetHasPlans && !window.confirm('Seçtiğin günlerde zaten blok var; silinip yerine kopyalanacak. Devam edilsin mi?')) {
      return;
    }
    let result = null;
    const ok = await run(async () => {
      result = await apiFetch('/api/plans/copy', { method: 'POST', body: { from, to } });
    }, '');
    if (ok) {
      setCopying(false);
      setNotice(
        `${DAYS[from].name} ${to.length} güne kopyalandı (${result.copied} blok).` +
          (result.skipped ? ` Ders saatine denk gelen ${result.skipped} blok atlandı.` : ''),
      );
    }
  }

  if (!view) {
    return (
      <section className="weekly-plan">
        <h1>Haftalık Program</h1>
        <ErrorBanner message={error} />
      </section>
    );
  }

  const { range } = view;
  const hours = [];
  for (let m = range.start; m < range.end; m += 60) hours.push(m);
  const visibleDays = narrow ? [shownDay] : DAYS.map((_, i) => i);
  const plannedTotal = view.plannedStudy.reduce((a, b) => a + b, 0);
  const doneTotal = view.doneSeconds.reduce((a, b) => a + b, 0);
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const showNow = nowMinute >= range.start && nowMinute < range.end;

  return (
    <section className="weekly-plan week-planner">
      <h1>Haftalık Program</h1>
      <p className="muted lede">
        Haftanı saat saat planla. Ders programındaki dersler buraya kendiliğinden gelir ve taralı görünür; boş bir
        saate tıklayıp çalışma, mola ya da başka bir blok ekle.
      </p>
      <ErrorBanner message={error} />
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {view.clashes > 0 && (
        <p className="error-banner" role="alert">
          {view.clashes} blok sonradan eklenen bir dersle çakışıyor (kırmızı kesik çizgili). Bloğa tıklayıp başka bir
          saate taşı ya da sil.
        </p>
      )}

      <div className="week-toolbar">
        <p className="week-summary">
          {plannedTotal === 0 && doneTotal === 0 ? (
            'Bu hafta henüz çalışma bloğu yok. Boş bir saate tıklayarak başla.'
          ) : (
            <>
              Bu hafta <b>{minutesLabel(plannedTotal)}</b> çalışma planladın
              {doneTotal > 0 ? (
                <>
                  , şimdiye kadar <b>{formatDuration(doneTotal)}</b> çalıştın.
                </>
              ) : (
                '.'
              )}
            </>
          )}
        </p>
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setDialogError(null);
              setCopying(true);
            }}
          >
            Günü kopyala
          </button>
          <button type="button" onClick={handleAddButton}>
            Blok ekle
          </button>
        </div>
      </div>

      {narrow && (
        <div className="segmented day-tabs" role="tablist" aria-label="Gün">
          {DAYS.map((d, i) => (
            <button
              key={d.short}
              type="button"
              role="tab"
              aria-selected={shownDay === i}
              className={[shownDay === i && 'active', i === today && 'is-today'].filter(Boolean).join(' ') || undefined}
              onClick={() => setShownDay(i)}
            >
              {d.short}
            </button>
          ))}
        </div>
      )}

      <div className="week-grid" style={{ '--cols': visibleDays.length, '--hour': `${HOUR_PX}px` }}>
        <div className="week-head">
          <span className="gutter" />
          {visibleDays.map((day) => {
            const planned = view.plannedStudy[day];
            const done = Math.round(view.doneSeconds[day] / 60);
            const scale = Math.max(planned, done, 1);
            return (
              <div key={day} className={day === today ? 'day-head is-today' : 'day-head'}>
                <span className="day-name">
                  {narrow ? DAYS[day].name : DAYS[day].short}
                  <span className="day-date">{dates[day].slice(8)}.{dates[day].slice(5, 7)}</span>
                </span>
                <span
                  className={planned || done ? 'day-meter' : 'day-meter empty'}
                  title={`Planlanan çalışma ${minutesLabel(planned)}, yapılan ${minutesLabel(done)}`}
                >
                  <i className="planned" style={{ width: `${(planned / scale) * 100}%` }} />
                  <i className="done" style={{ width: `${(done / scale) * 100}%` }} />
                </span>
                <span className="day-figures">
                  {planned || done ? `${minutesLabel(done)} / ${minutesLabel(planned)}` : '—'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="week-body" style={{ height: `${(hours.length * HOUR_PX)}px` }}>
          <div className="gutter hours" aria-hidden="true">
            {hours.map((m) => (
              <span key={m} style={{ top: `${((m - range.start) / 60) * HOUR_PX}px` }}>
                {String(m / 60).padStart(2, '0')}
              </span>
            ))}
          </div>
          {visibleDays.map((day) => (
            // Boş alana tıklama fareyle hızlı ekleme içindir; klavyede "Blok ekle" düğmesi aynı işi yapar
            <div
              key={day}
              className={day === today ? 'day-col is-today' : 'day-col'}
              aria-label={DAYS[day].name}
              role="group"
              onClick={(e) => handleColumnClick(e, day)}
            >
              {[...view.classes, ...view.plans]
                .filter((b) => b.day === day)
                .map((item) => (
                  <Block
                    key={`${item.type === 'class' ? 'c' : 'p'}${item.id}`}
                    item={item}
                    range={range}
                    onOpen={(it) => {
                      setDialogError(null);
                      setEditor(it);
                    }}
                  />
                ))}
              {day === today && showNow && (
                <span
                  className="now-line"
                  style={{ top: `${((nowMinute - range.start) / 60) * HOUR_PX}px` }}
                  aria-label={`Şu an ${formatClock(nowMinute)}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <ul className="week-legend" aria-label="Renklerin anlamı">
        <li><i className="block-class" /> Ders programından</li>
        <li><i className="block-study" /> Çalışma</li>
        <li><i className="block-break" /> Mola</li>
        <li><i className="block-other" /> Diğer</li>
      </ul>
      <p className="muted small-note">
        Gün başlığındaki çizgi: ince çerçeve planladığın çalışma süresi, dolu kısım o gün gerçekten kaydettiğin
        süre. Saat aralığını <Link className="text-link" to="/ders-programi">Ders Programı</Link> sayfasından
        değiştirebilirsin.
      </p>

      {editor && (
        <PlanEditor
          key={editor.id ?? `new-${editor.day}-${editor.start}`}
          draft={editor}
          subjects={view && data.subjects}
          error={dialogError}
          onSave={savePlan}
          onDelete={deletePlan}
          onClose={() => setEditor(null)}
        />
      )}
      {copying && (
        <CopyDialog
          defaultFrom={narrow ? shownDay : today}
          error={dialogError}
          onCopy={copyDay}
          onClose={() => setCopying(false)}
        />
      )}
    </section>
  );
}
