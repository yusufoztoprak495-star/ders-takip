import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import DayPicker from '../components/DayPicker.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import MonthSuggestDialog from '../components/MonthSuggestDialog.jsx';
import WeekGrid from '../components/WeekGrid.jsx';
import { subjectLabel, trackInfo } from '../lib/tracks.js';
import { useTrack } from '../context/TrackContext.jsx';
import { toLocalDateString } from '../lib/dates.js';
import { distributeMonth, distributionSummary } from '../lib/distributeMonth.js';
import { buildIcs } from '../lib/ics.js';
import { downloadBlob } from '../lib/download.js';
import { formatDuration } from '../lib/format.js';
import { WEEKS, monthLabel, monthOf, shiftMonth, weekDays, weekLabel, weekOfDate } from '../lib/months.js';
import { DEFAULT_DAILY_STUDY, monthCapacities, plannedStudyMinutes } from '../lib/monthWeeks.js';
import {
  DAYS,
  dayIndexOfDate,
  formatClock,
  gridRange,
  minutesLabel,
  overlaps,
  slotAt,
  spanFromInputs,
} from '../lib/schedule.js';

// Bir saatin ızgaradaki yüksekliği (piksel). Dört hafta alt alta durduğu için sıkıdır.
const HOUR_PX = 34;
const KINDS = [
  { id: 'study', label: 'Çalışma' },
  { id: 'break', label: 'Mola' },
  { id: 'other', label: 'Diğer' },
];

const toInput = (minutes) => (minutes === 1440 ? '00:00' : formatClock(minutes));
const pad = (n) => String(n).padStart(2, '0');

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

// Blok ekleme/düzenleme penceresi.
// draft: { id?, source: 'common' | 'week', week, day, start, end, kind, title, subjectId }
// Kapsam: "Ortak" blok 4 haftanın hepsinde tekrarlanır; "Hafta k" bloğu yalnızca o haftada görünür.
function PlanEditor({ draft, month, subjects, onSave, onDelete, onClose, error }) {
  const dialogRef = useRef(null);
  const editing = Boolean(draft.id);
  const [scope, setScope] = useState(draft.source === 'week' ? String(draft.week) : 'common');
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
      scope: scope === 'common' ? 'common' : Number(scope),
      kind,
      day: day[0],
      ...span,
      title,
      subjectId: kind === 'study' && subjectId !== '' ? Number(subjectId) : null,
    });
  }

  const titleHint = { study: 'Örn. Türev soru çözümü', break: 'Örn. Yemek', other: 'Örn. Spor, kurs, yol' }[kind];
  // Var olan ortak blok haftaya özele çevrilmez (silip yeniden eklemek gerekir); haftaya özel blok haftasını değiştirebilir
  const scopeLocked = editing && draft.source === 'common';

  return (
    <dialog ref={dialogRef} className="plan-editor" onCancel={onClose} aria-labelledby="plan-editor-title">
      <form onSubmit={handleSubmit}>
        <h2 id="plan-editor-title">{editing ? 'Bloğu düzenle' : 'Yeni blok'}</h2>
        <ErrorBanner message={error} />
        <label>
          Hangi haftalarda
          {scopeLocked ? (
            <input type="text" value="Ortak: 4 haftanın hepsinde" readOnly />
          ) : (
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              {!editing && <option value="common">Ortak: 4 haftanın hepsinde</option>}
              {Array.from({ length: WEEKS }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  Yalnızca Hafta {i + 1} ({weekLabel(month, i + 1)})
                </option>
              ))}
            </select>
          )}
        </label>
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
          <button type="submit">{editing ? 'Kaydet' : 'Bloğu ekle'}</button>
          <button type="button" className="secondary" onClick={onClose}>
            Vazgeç
          </button>
          {editing && (
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

export default function WeeklyPlan() {
  const { track } = useTrack();
  const narrow = useNarrow();
  const now = useNow();
  // Gün yalnızca değişince yeniden hesaplanır (dakikalık güncelleme verileri baştan yüklemesin)
  const todayStr = useMemo(() => toLocalDateString(now), [now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentMonth = monthOf(todayStr);
  const today = dayIndexOfDate(todayStr);

  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dialogError, setDialogError] = useState(null);
  const [editor, setEditor] = useState(null);
  const [copying, setCopying] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [skipPast, setSkipPast] = useState(true); // geçmiş günleri dağıtımda sayma
  const [shownDay, setShownDay] = useState(today); // telefonda gösterilen gün

  const load = useCallback(async () => {
    try {
      const last = `${month}-${pad(weekDays(month, WEEKS).to)}`;
      const [classes, plans, weekPlans, subjects, win, monthPlans, daily, goals] = await Promise.all([
        apiFetch('/api/classes'),
        apiFetch('/api/plans'),
        apiFetch(`/api/week-plans?month=${month}`),
        apiFetch('/api/subjects'),
        apiFetch('/api/schedule'),
        apiFetch(`/api/month-plans?month=${month}`),
        apiFetch(`/api/stats/daily?from=${month}-01&to=${last}`),
        apiFetch('/api/goals'),
      ]);
      setData({ month, classes, plans, weekPlans, subjects, win, monthPlans, daily, goals });
    } catch (e) {
      setError(e.message);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  // Ay değişince eski ayın verisi bir an görünmesin
  const ready = data && data.month === month;

  const view = useMemo(() => {
    if (!ready) return null;
    const subjectOf = new Map(data.subjects.map((s) => [s.id, s]));
    const labelOf = (p) => {
      const s = subjectOf.get(p.subjectId);
      const subjectText = s ? subjectLabel(s.name, s.examType) : '';
      let label = p.title || subjectText || (p.kind === 'break' ? 'Mola' : 'Çalışma');
      if (p.kind === 'study' && s && p.title) label = `${subjectText}: ${p.title}`;
      return label;
    };
    const classes = data.classes.map((c) => ({ ...c, source: 'class', type: 'class', label: c.title }));
    // Bloktan sonra aynı saate ders eklendiyse blok çakışmalı kalır; ızgarada işaretlenir
    const common = data.plans.map((p) => ({
      ...p,
      source: 'common',
      type: p.kind,
      label: labelOf(p),
      clash: classes.some((c) => c.day === p.day && overlaps(c, p)),
    }));
    const weeks = Array.from({ length: WEEKS }, (_, i) => {
      const week = i + 1;
      const own = data.weekPlans
        .filter((p) => p.week === week)
        .map((p) => ({ ...p, source: 'week', type: p.kind, label: labelOf(p), clash: false }));
      return { week, items: [...classes, ...common, ...own] };
    });
    const range = gridRange(weeks.flatMap((w) => w.items), data.win);
    const dailyStudy = data.goals.dailyGoal > 0 ? data.goals.dailyGoal : DEFAULT_DAILY_STUDY;
    const capacities = monthCapacities({
      month,
      classes: data.classes,
      plans: data.plans,
      weekPlans: data.weekPlans,
      window: data.win,
      dailyStudy,
    });
    const subjectName = new Map(data.subjects.map((s) => [s.id, subjectLabel(s.name, s.examType)]));
    const stats = weeks.map(({ week }) => {
      const { from, to } = weekDays(month, week);
      let doneSeconds = 0;
      for (const d of data.daily) {
        const day = Number(d.date.slice(8));
        if (d.date.startsWith(month) && day >= from && day <= to) doneSeconds += d.totalSeconds;
      }
      const topics = data.monthPlans.filter((p) => p.week === week);
      return {
        week,
        capacity: capacities[week - 1].total,
        planned: plannedStudyMinutes({ month, week, plans: data.plans, weekPlans: data.weekPlans }),
        doneSeconds,
        topics,
      };
    });
    const unassigned = data.monthPlans.filter((p) => !p.doneAt && p.week == null).length;
    const openTotal = data.monthPlans.filter((p) => !p.doneAt).length;
    return {
      weeks,
      range,
      stats,
      subjectName,
      unassigned,
      openTotal,
      common,
      clashes: common.filter((p) => p.clash).length,
    };
  }, [ready, data, month]);

  async function run(action, message) {
    setDialogError(null);
    setError(null);
    try {
      await action();
      await load();
      if (message) setNotice(message);
      return true;
    } catch (e) {
      setDialogError(e.message);
      return false;
    }
  }

  // Ortak dersler ve bloklar her hafta tekrarlanan etkinlikler, sınav tarihi tüm gün süren bir etkinlik olur.
  // Haftaya özel bloklar takvim dosyasına girmez (her hafta tekrarlanmazlar).
  async function handleExport() {
    setError(null);
    try {
      const goals = await apiFetch('/api/goals');
      const events = [
        ...data.classes.map((c) => ({
          uid: `class-${c.id}`,
          title: c.title,
          location: c.place,
          weekly: { day: c.day, start: c.start, end: c.end },
        })),
        ...view.common.map((p) => ({ uid: `plan-${p.id}`, title: p.label, weekly: { day: p.day, start: p.start, end: p.end } })),
      ];
      if (goals.examDate) events.push({ uid: `exam-${track}`, title: `Sınav günü (${trackInfo(track).title})`, date: goals.examDate });
      const ics = buildIcs(events, { today: todayStr });
      downloadBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'ders-takip-program.ics');
      setNotice(
        'Takvim dosyası indirildi: dersler ve ortak bloklar her hafta tekrarlanan etkinlik olarak eklenir. Haftaya özel bloklar dosyaya girmez.',
      );
    } catch (e) {
      setError(e.message || 'Takvim dosyası hazırlanamadı');
    }
  }

  function openNew(day, slot, week) {
    setNotice(null);
    setDialogError(null);
    // Bir haftanın ızgarasına tıklanınca blok o haftaya özel önerilir; "Blok ekle" düğmesi ortak blok önerir
    setEditor({
      source: week ? 'week' : 'common',
      week: week ?? 1,
      day,
      start: slot.start,
      end: slot.end,
      kind: 'study',
      title: '',
      subjectId: null,
    });
  }

  function handleAddButton() {
    const day = narrow ? shownDay : today;
    const occupied = view.weeks[0].items.filter((b) => b.day === day && b.source !== 'week');
    let slot = null;
    for (let m = Math.max(view.range.start, data.win.dayStart); m < view.range.end && !slot; m += 30) {
      slot = slotAt(occupied, m, view.range);
    }
    openNew(day, slot ?? { start: data.win.dayStart, end: data.win.dayStart + 60 }, null);
  }

  async function savePlan({ scope, ...body }) {
    const common = scope === 'common';
    const url = common ? '/api/plans' : '/api/week-plans';
    const payload = common ? body : { ...body, month, week: scope };
    const ok = await run(
      () =>
        editor.id
          ? apiFetch(`${url}/${editor.id}`, { method: 'PUT', body: payload })
          : apiFetch(url, { method: 'POST', body: payload }),
      editor.id ? 'Blok güncellendi.' : common ? 'Ortak blok eklendi (4 haftada da görünür).' : `Hafta ${scope} için blok eklendi.`,
    );
    if (ok) setEditor(null);
  }

  async function deletePlan() {
    const url = editor.source === 'week' ? '/api/week-plans' : '/api/plans';
    const ok = await run(() => apiFetch(`${url}/${editor.id}`, { method: 'DELETE' }), 'Blok silindi.');
    if (ok) setEditor(null);
  }

  async function copyDay(from, to) {
    const targetHasPlans = view.common.some((p) => to.includes(p.day));
    if (targetHasPlans && !window.confirm('Seçtiğin günlerde zaten ortak blok var; silinip yerine kopyalanacak. Devam edilsin mi?')) {
      return;
    }
    let result = null;
    const ok = await run(async () => {
      result = await apiFetch('/api/plans/copy', { method: 'POST', body: { from, to } });
    }, '');
    if (ok) {
      setCopying(false);
      setNotice(
        `${DAYS[from].name} ${to.length} güne kopyalandı (${result.copied} ortak blok).` +
          (result.skipped ? ` Ders saatine denk gelen ${result.skipped} blok atlandı.` : ''),
      );
    }
  }

  // Aylık plandaki bitmemiş konuları haftalara paylaştırır (boş çalışma süresine oranla)
  async function distribute() {
    if (
      data.monthPlans.some((p) => !p.doneAt && p.week != null) &&
      !window.confirm('Bazı konuların haftası zaten belirli; yeniden dağıtılınca değişecek. Devam edilsin mi?')
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fromDate = skipPast && month === currentMonth ? todayStr : null;
      const result = await distributeMonth({ month, fromDate });
      await load();
      setNotice(distributionSummary(result));
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function handleDistributeClick() {
    try {
      await distribute();
    } catch {
      // hata zaten gösterildi
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
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const days = narrow ? [shownDay] : DAYS.map((_, i) => i);
  const todayWeek = monthOf(todayStr) === month ? weekOfDate(todayStr).week : null;

  return (
    <section className="weekly-plan week-planner">
      <h1>Haftalık Program</h1>
      <p className="muted lede">
        Ay dört haftadır (1–7, 8–14, 15–21, 22–sonu). Ders saatlerin ve <b>ortak</b> bloklar dört haftada da aynıdır;
        bir haftaya özel işi o haftanın ızgarasına ekle. Sonra aylık plandaki konuları haftalara dağıtabilirsin.
      </p>
      <ErrorBanner message={error} />
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {view.clashes > 0 && (
        <p className="error-banner" role="alert">
          {view.clashes} ortak blok sonradan eklenen bir dersle çakışıyor (kırmızı kesik çizgili). Bloğa tıklayıp başka bir
          saate taşı ya da sil.
        </p>
      )}

      <div className="month-toolbar">
        <div className="month-nav">
          <button type="button" className="secondary" aria-label="Önceki ay" onClick={() => setMonth(shiftMonth(month, -1))}>
            ‹
          </button>
          <span className="month-name">{monthLabel(month)}</span>
          <button type="button" className="secondary" aria-label="Sonraki ay" onClick={() => setMonth(shiftMonth(month, 1))}>
            ›
          </button>
          {month !== currentMonth && (
            <button type="button" className="secondary small" onClick={() => setMonth(currentMonth)}>
              Bu ay
            </button>
          )}
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setSuggesting(true)} title="Aylık plana göre ne yapacağını önerir">
            Akıllı öneri
          </button>
          <button type="button" className="secondary" onClick={handleExport} title="Dersleri ve ortak blokları .ics olarak indirir">
            Takvime aktar
          </button>
          <button type="button" className="secondary" onClick={() => { setDialogError(null); setCopying(true); }}>
            Günü kopyala
          </button>
          <button type="button" onClick={handleAddButton} title="Dört haftada da görünen ortak blok ekler">
            Blok ekle
          </button>
        </div>
      </div>

      <div className="distribute-panel">
        <div>
          <b>Aylık planı haftalara dağıt</b>
          <p className="muted small-note">
            {view.openTotal === 0
              ? 'Bu ay bitmemiş konu yok.'
              : `${view.openTotal} bitmemiş konu, her haftanın boş çalışma süresine oranla haftalara paylaştırılır.`}
          </p>
        </div>
        {month === currentMonth && (
          <label className="check-row">
            <input type="checkbox" checked={skipPast} onChange={(e) => setSkipPast(e.target.checked)} />
            <span>Geçmiş günleri sayma</span>
          </label>
        )}
        <button type="button" onClick={handleDistributeClick} disabled={busy || view.openTotal === 0}>
          {busy ? 'Dağıtılıyor…' : 'Haftalara dağıt'}
        </button>
      </div>
      {view.unassigned > 0 && view.openTotal > 0 && (
        <p className="notice" role="status">
          {view.unassigned} konu henüz bir haftaya atanmadı. “Haftalara dağıt” ile atayabilirsin.{' '}
          <Link className="text-link" to="/aylik">
            Aylık Plan
          </Link>
        </p>
      )}

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

      {view.weeks.map(({ week, items }) => {
        const st = view.stats[week - 1];
        const scale = Math.max(st.capacity, st.planned, 1);
        const bySubject = new Map();
        for (const t of st.topics) {
          if (!bySubject.has(t.subjectId)) bySubject.set(t.subjectId, []);
          bySubject.get(t.subjectId).push(t);
        }
        return (
          <section key={week} className={week === todayWeek ? 'month-week is-current' : 'month-week'} aria-label={`Hafta ${week}`}>
            <header className="month-week-head">
              <h2>
                Hafta {week} <span className="muted">{weekLabel(month, week)}</span>
              </h2>
              <p className="week-stats">
                Boş çalışma süresi <b>{minutesLabel(st.capacity)}</b> · planlanan <b>{minutesLabel(st.planned)}</b>
                {st.doneSeconds > 0 && (
                  <>
                    {' '}
                    · yapılan <b>{formatDuration(st.doneSeconds)}</b>
                  </>
                )}
              </p>
              <span className="day-meter" aria-hidden="true">
                <i className="planned" style={{ width: `${(st.planned / scale) * 100}%` }} />
              </span>
            </header>
            {st.topics.length > 0 && (
              <ul className="week-topics" aria-label={`Hafta ${week} konuları`}>
                {[...bySubject.entries()].map(([subjectId, list]) => (
                  <li key={subjectId ?? 'none'}>
                    <span className="week-topic-subject">{view.subjectName.get(subjectId) ?? 'Ders'}</span>
                    {list.map((t) => (
                      <span key={t.id} className={t.doneAt ? 'topic-chip done' : 'topic-chip'}>
                        {t.title}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            )}
            <WeekGrid
              items={items}
              range={range}
              hourPx={HOUR_PX}
              days={days}
              narrow={narrow}
              todayDay={week === todayWeek ? today : null}
              nowMinute={nowMinute}
              onAdd={(day, slot) => openNew(day, slot, week)}
              onOpen={(item) => {
                setDialogError(null);
                setEditor(item);
              }}
            />
          </section>
        );
      })}

      <ul className="week-legend" aria-label="Renklerin anlamı">
        <li><i className="block-class" /> Ders programından</li>
        <li><i className="block-study" /> Çalışma</li>
        <li><i className="block-break" /> Mola</li>
        <li><i className="block-other" /> Diğer</li>
        <li><i className="block-study block-weekly" /> Noktalı: yalnızca o haftaya özel</li>
      </ul>
      <p className="muted small-note">
        Boş bir saate tıklarsan blok o haftaya özel eklenir; “Blok ekle” düğmesi dört haftada da görünen ortak blok
        ekler. Saat aralığını <Link className="text-link" to="/ders-programi">Ders Programı</Link> sayfasından
        değiştirebilirsin.
      </p>

      {editor && (
        <PlanEditor
          key={`${editor.source}-${editor.id ?? `new-${editor.week}-${editor.day}-${editor.start}`}`}
          draft={editor}
          month={month}
          subjects={data.subjects}
          error={dialogError}
          onSave={savePlan}
          onDelete={deletePlan}
          onClose={() => setEditor(null)}
        />
      )}
      {suggesting && (
        <MonthSuggestDialog
          month={month}
          current={data.monthPlans}
          subjects={data.subjects}
          onClose={() => setSuggesting(false)}
          onChanged={async (message) => {
            await load();
            setNotice(message);
          }}
          onDistribute={distribute}
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
