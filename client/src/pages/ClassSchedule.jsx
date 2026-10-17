import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import DayPicker from '../components/DayPicker.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { EmptyNote } from '../components/Doodles.jsx';
import { useTrack } from '../context/TrackContext.jsx';
import { subjectLabel } from '../lib/tracks.js';
import {
  DAYS,
  STUDY_GAP_MIN,
  busyMinutes,
  formatClock,
  freeWindows,
  minutesLabel,
  spanFromInputs,
} from '../lib/schedule.js';

// Hedefe göre sayfadaki kısa açıklama ve örnek metinler
const COPY = {
  yks: {
    intro: 'Okuldaki haftalık ders programını gir. Boş saatlerin şeritte görünür; dersler Haftalık Program’a kendiliğinden geçer.',
    title: 'Örn. Kimya',
    place: 'Sınıf ya da öğretmen',
  },
  dgs: {
    intro: 'Okul ya da kurs saatlerini gir. Boş saatlerin şeritte görünür; dersler Haftalık Program’a kendiliğinden geçer.',
    title: 'Örn. İşletme Matematiği',
    place: 'Derslik ya da kurs',
  },
  uni: {
    intro: 'Bu dönem aldığın derslerin saatlerini gir. Boş saatlerin şeritte görünür; dersler Haftalık Program’a kendiliğinden geçer.',
    title: 'Örn. Veri Yapıları',
    place: 'Derslik',
  },
};

const EMPTY_FORM = { title: '', place: '', start: '', end: '', days: [], subjectId: '' };
const sameName = (a, b) => a.trim().toLocaleLowerCase('tr') === b.trim().toLocaleLowerCase('tr');

// Ekranda saat kutusuna yazılacak metin (gece yarısı bitişi kutuda 00:00 görünür)
const toInput = (minutes) => (minutes === 1440 ? '00:00' : formatClock(minutes));

// Şeritte konum: gün aralığına göre yüzde
function placeOf(block, from, to) {
  const span = to - from;
  return {
    left: `${((Math.max(block.start, from) - from) / span) * 100}%`,
    width: `${((Math.min(block.end, to) - Math.max(block.start, from)) / span) * 100}%`,
  };
}

// Arka arkaya gelen dersleri (aralarında kısa teneffüs olanları) tek grup sayar: lisede 40 dakikalık
// dersler şeritte okunamayacak kadar dar kalır, onun yerine "7 ders · 08:30–14:50" yazılır.
const RECESS_MAX = 20;
function lessonGroups(rows) {
  const groups = [];
  for (const c of [...rows].sort((a, b) => a.start - b.start)) {
    const last = groups[groups.length - 1];
    if (last && c.start - last.end <= RECESS_MAX) {
      last.end = Math.max(last.end, c.end);
      last.items.push(c);
    } else groups.push({ start: c.start, end: c.end, items: [c] });
  }
  return groups;
}

// Grubun şerit genişliğine oranına göre sınıf: çok dar (her yerde adsız), orta (telefonda adsız)
const groupClass = (share) => (share < 0.07 ? 'strip-group narrow' : share < 0.13 ? 'strip-group mid' : 'strip-group');

// Haftanın görünümü: her gün bir yatay şerit. Taralı parçalar ders, aradaki boşluklar süresiyle yazılır.
function WeekStrip({ classes, window: win }) {
  const { dayStart: from, dayEnd: to } = win;
  // Eksen etiketleri: aralığa göre 2 ya da 3 saatte bir
  const step = to - from > 12 * 60 ? 180 : 120;
  const ticks = [];
  for (let m = Math.ceil(from / 60) * 60; m <= to; m += step) ticks.push(m);

  return (
    <div className="week-strip" role="table" aria-label="Haftalık ders ve boş zaman şeridi">
      {DAYS.map((d, day) => {
        const own = classes.filter((c) => c.day === day);
        const gaps = freeWindows(own, from, to, STUDY_GAP_MIN);
        const free = gaps.reduce((sum, g) => sum + (g.end - g.start), 0);
        const busy = busyMinutes(own, from, to);
        return (
          <div className="strip-row" role="row" key={d.short}>
            <span className="strip-day" role="rowheader" title={d.name}>
              {d.short}
            </span>
            <div className="strip-track" role="cell">
              {own.map((c) => (
                <span
                  key={c.id}
                  className="strip-class"
                  style={placeOf(c, from, to)}
                  title={`${c.title} · ${formatClock(c.start)}–${formatClock(c.end)}`}
                />
              ))}
              {lessonGroups(own).map((g) => (
                <span
                  key={`g${g.start}`}
                  // Çok dar grupta ad okunmaz; ders adı yine de üzerine gelince (title) görünür
                  className={groupClass((g.end - g.start) / (to - from))}
                  style={placeOf(g, from, to)}
                  aria-hidden="true"
                >
                  <span className="strip-label">
                    {g.items.length === 1 ? g.items[0].title : `${g.items.length} ders`}
                  </span>
                </span>
              ))}
              {gaps.map((g) => (
                <span
                  key={g.start}
                  className={(g.end - g.start) / (to - from) > 0.14 ? 'strip-gap' : 'strip-gap narrow'}
                  style={placeOf(g, from, to)}
                  title={`Boş: ${formatClock(g.start)}–${formatClock(g.end)}`}
                >
                  <span className="strip-text">{minutesLabel(g.end - g.start)}</span>
                </span>
              ))}
            </div>
            <span className="strip-total" role="cell">
              {busy > 0 ? (
                <>
                  <b>{minutesLabel(busy)}</b> ders
                  <br />
                  {minutesLabel(free)} boş
                </>
              ) : (
                <>
                  <b>{minutesLabel(free)}</b> boş
                </>
              )}
            </span>
          </div>
        );
      })}
      <div className="strip-axis" aria-hidden="true">
        <span />
        <div className="strip-ticks">
          {ticks.map((m) => (
            <span key={m} style={{ left: `${((m - from) / (to - from)) * 100}%` }}>
              {formatClock(m)}
            </span>
          ))}
        </div>
        <span />
      </div>
    </div>
  );
}

// Günün aralığı (şeritte ve haftalık ızgarada esas alınan saatler)
function DayWindowForm({ window: win, onSave }) {
  const [start, setStart] = useState(toInput(win.dayStart));
  const [end, setEnd] = useState(toInput(win.dayEnd));

  useEffect(() => {
    setStart(toInput(win.dayStart));
    setEnd(toInput(win.dayEnd));
  }, [win]);

  async function handleSubmit(event) {
    event.preventDefault();
    const span = spanFromInputs(start, end);
    await onSave(span ? { dayStart: span.start, dayEnd: span.end } : {});
  }

  return (
    <form className="day-window" onSubmit={handleSubmit}>
      <span>Günüm</span>
      <input type="time" step="300" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Günün başlangıcı" />
      <span>ile</span>
      <input type="time" step="300" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Günün bitişi" />
      <span>arasında.</span>
      <button type="submit" className="secondary small">
        Aralığı kaydet
      </button>
    </form>
  );
}

export default function ClassSchedule() {
  const { track } = useTrack();
  const copy = COPY[track] ?? COPY.yks;
  const [classes, setClasses] = useState(null);
  const [win, setWin] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [subjects, setSubjects] = useState([]);
  // Düzenlenen ders (null: yeni ders ekleniyor)
  const [editing, setEditing] = useState(null);
  const formRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [list, schedule, subjectList] = await Promise.all([
        apiFetch('/api/classes'),
        apiFetch('/api/schedule'),
        apiFetch('/api/subjects'),
      ]);
      setClasses(list);
      setWin(schedule);
      setSubjects(subjectList);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Daha önce kullanılan saat aralıkları: lisede zil saatleri her gün aynıdır, bir tıkla doldurulur
  const usedSpans = useMemo(() => {
    const seen = new Map();
    for (const c of classes ?? []) seen.set(`${c.start}-${c.end}`, { start: c.start, end: c.end });
    return [...seen.values()].sort((a, b) => a.start - b.start).slice(0, 10);
  }, [classes]);

  const weekly = useMemo(() => {
    if (!classes || !win) return null;
    let lesson = 0;
    let free = 0;
    DAYS.forEach((_, day) => {
      const own = classes.filter((c) => c.day === day);
      lesson += busyMinutes(own, 0, 1440);
      free += freeWindows(own, win.dayStart, win.dayEnd, STUDY_GAP_MIN).reduce((s, g) => s + g.end - g.start, 0);
    });
    return { lesson, free };
  }, [classes, win]);

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  async function run(action, message) {
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      if (message) setNotice(message);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const span = spanFromInputs(form.start, form.end);
    // Saat boşsa veri katmanı kendi mesajıyla reddetsin diye geçersiz değer gider
    const times = span ?? { start: null, end: null };
    const base = { title: form.title, place: form.place, subjectId: form.subjectId ? Number(form.subjectId) : null, ...times };
    const ok = editing
      ? await run(
          () => apiFetch(`/api/classes/${editing.id}`, { method: 'PUT', body: { ...base, day: form.days[0] } }),
          'Ders güncellendi.',
        )
      : await run(
          () => apiFetch('/api/classes', { method: 'POST', body: { ...base, days: form.days } }),
          form.days.length > 1 ? `Ders ${form.days.length} güne eklendi.` : 'Ders eklendi.',
        );
    if (ok) {
      setEditing(null);
      // Yeni derste saatler ve günler kalır: aynı saatteki bir sonraki ders hızlıca girilir
      setForm((f) => (editing ? EMPTY_FORM : { ...f, title: '', place: '', subjectId: '' }));
    }
  }

  function startEdit(c) {
    setEditing(c);
    setForm({ title: c.title, place: c.place, start: toInput(c.start), end: toInput(c.end), days: [c.day], subjectId: c.subjectId ? String(c.subjectId) : '' });
    setNotice(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formRef.current?.querySelector('input')?.focus({ preventScroll: true });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleDelete(c) {
    if (!window.confirm(`${DAYS[c.day].name} ${formatClock(c.start)} "${c.title}" dersi silinsin mi?`)) return;
    if (editing?.id === c.id) cancelEdit();
    await run(() => apiFetch(`/api/classes/${c.id}`, { method: 'DELETE' }), 'Ders silindi.');
  }

  const saveWindow = (body) =>
    run(() => apiFetch('/api/schedule', { method: 'PUT', body }), 'Gün aralığı kaydedildi.');

  const daysWithClasses = DAYS.map((d, day) => ({ ...d, day, rows: (classes ?? []).filter((c) => c.day === day) })).filter(
    (d) => d.rows.length > 0,
  );

  return (
    <section className="class-schedule">
      <h1>Ders Programı</h1>
      <p className="muted lede">{copy.intro}</p>
      <ErrorBanner message={error} />
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      {win && classes && (
        <div className="panel strip-panel">
          <WeekStrip classes={classes} window={win} />
          {weekly && (
            <p className="strip-summary">
              {weekly.lesson > 0 ? (
                <>
                  Haftada <b>{minutesLabel(weekly.lesson)}</b> dersin var. Gün aralığında{' '}
                  {STUDY_GAP_MIN} dakikadan uzun boşlukların toplamı <b>{minutesLabel(weekly.free)}</b>.
                </>
              ) : (
                <>Henüz ders girmedin; şu an tüm gün aralığın boş görünüyor.</>
              )}{' '}
              <Link className="text-link" to="/haftalik">
                Boşlukları Haftalık Program’da planla
              </Link>
            </p>
          )}
          <DayWindowForm window={win} onSave={saveWindow} />
        </div>
      )}

      <form ref={formRef} className="class-form" onSubmit={handleSubmit}>
        <h2>{editing ? 'Dersi düzenle' : 'Ders ekle'}</h2>
        <div className="class-form-grid">
          <label className="span-2">
            Ders adı
            <input
              type="text"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                // Yazılan ad bir dersle aynıysa ders bağlantısı kendiliğinden seçilir
                const match = subjects.find((s) => sameName(s.name, title));
                setForm((f) => ({ ...f, title, subjectId: match ? String(match.id) : f.subjectId }));
              }}
              placeholder={copy.title}
              maxLength={60}
            />
          </label>
          {subjects.length > 0 && (
            <label className="span-2">
              <span>
                Bağlı ders <span className="optional">isteğe bağlı · devamsızlık hakkı ve istatistikler için</span>
              </span>
              <select
                value={form.subjectId}
                onChange={(e) => {
                  const id = e.target.value;
                  const subject = subjects.find((s) => String(s.id) === id);
                  setForm((f) => ({ ...f, subjectId: id, title: f.title || subject?.name || '' }));
                }}
              >
                <option value="">Bağlama</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {subjectLabel(s.name, s.examType)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="span-2">
            <span>
              Yer <span className="optional">isteğe bağlı</span>
            </span>
            <input
              type="text"
              value={form.place}
              onChange={(e) => set('place')(e.target.value)}
              placeholder={copy.place}
              maxLength={40}
            />
          </label>
          <label>
            Başlangıç
            <input type="time" step="300" value={form.start} onChange={(e) => set('start')(e.target.value)} />
          </label>
          <label>
            Bitiş
            <input type="time" step="300" value={form.end} onChange={(e) => set('end')(e.target.value)} />
          </label>
          <div className="span-2 field">
            <span className="label">{editing ? 'Gün' : 'Günler'}</span>
            <DayPicker
              selected={form.days}
              onChange={set('days')}
              multiple={!editing}
              label={editing ? 'Gün' : 'Dersin olduğu günler'}
            />
          </div>
        </div>
        {usedSpans.length > 0 && (
          <div className="used-spans">
            <span className="muted">Önceki saatler:</span>
            {usedSpans.map((s) => (
              <button
                key={`${s.start}-${s.end}`}
                type="button"
                className="span-chip"
                onClick={() => setForm((f) => ({ ...f, start: toInput(s.start), end: toInput(s.end) }))}
              >
                {formatClock(s.start)}–{formatClock(s.end)}
              </button>
            ))}
          </div>
        )}
        <div className="form-actions">
          <button type="submit">{editing ? 'Kaydet' : 'Ders ekle'}</button>
          {editing && (
            <button type="button" className="secondary" onClick={cancelEdit}>
              Vazgeç
            </button>
          )}
        </div>
      </form>

      {classes?.length === 0 && (
        <EmptyState
          Doodle={EmptyNote}
          title="Ders programın boş"
          hint="İlk dersini yukarıdan ekle. Aynı saatte birden çok günü birlikte seçebilirsin."
        />
      )}

      {daysWithClasses.map((d) => (
        <section key={d.short} className="class-day">
          <h2>{d.name}</h2>
          <ul className="list class-list">
            {d.rows.map((c) => (
              <li key={c.id} className={editing?.id === c.id ? 'is-editing' : undefined}>
                <span className="class-time">
                  {formatClock(c.start)}
                  <span aria-hidden="true">–</span>
                  <span className="visually-hidden"> ile </span>
                  {formatClock(c.end)}
                </span>
                <span className="class-name">
                  {c.title}
                  {c.place && <span className="muted"> {c.place}</span>}
                </span>
                <span className="actions">
                  <button type="button" className="secondary small" onClick={() => startEdit(c)}>
                    Düzenle
                  </button>
                  <button type="button" className="secondary small" onClick={() => handleDelete(c)}>
                    Sil
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
