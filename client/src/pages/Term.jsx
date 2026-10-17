import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { EmptyNote } from '../components/Doodles.jsx';
import { celebrate } from '../lib/celebrate.js';
import { daysBetween, dueLabel, toLocalDateString } from '../lib/dates.js';
import { formatDate } from '../lib/format.js';
import { LETTERS, courseAverage, gpa, lessonHours, letterOf, neededScore } from '../lib/grades.js';
import { DAYS, dayIndexOf, formatClock } from '../lib/schedule.js';
import { subjectLabel } from '../lib/tracks.js';

const numberTr = (n) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

// --- Notlar: ders başına kredi ve not bileşenleri, ortalama, harf, "finalden kaç" ---
function CourseGrades({ course, onSaved }) {
  const [credits, setCredits] = useState(String(course.credits || ''));
  const [limit, setLimit] = useState(course.absenceLimit === null ? '' : String(course.absenceLimit));
  const [rows, setRows] = useState(() => course.components.map((c) => ({ name: c.name, weight: String(c.weight), score: c.score === null ? '' : String(c.score) })));
  const [target, setTarget] = useState(60);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const components = rows.map((r) => ({
    name: r.name.trim(),
    weight: Number(r.weight),
    score: r.score === '' ? null : Number(r.score.replace(',', '.')),
  }));
  const total = components.reduce((s, c) => s + (Number.isFinite(c.weight) ? c.weight : 0), 0);
  const { average, complete } = courseAverage(components.filter((c) => Number.isFinite(c.weight)));
  const need = total === 100 ? neededScore(components, target) : null;
  const update = (i, patch) => {
    setSaved(false);
    setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  async function handleSave(event) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch(`/api/courses/${course.subjectId}`, {
        method: 'PUT',
        body: { credits: credits === '' ? 0 : Number(credits), absenceLimit: limit === '' ? null : Number(limit), components },
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <form className="panel course-card" onSubmit={handleSave}>
      <div className="course-head">
        <h2 className="panel-label">{subjectLabel(course.name, course.group)}</h2>
        {average !== null && (
          <span className={`course-letter${complete ? '' : ' partial'}`} title={complete ? 'Ders notu' : 'Girilen notlara göre (henüz kesin değil)'}>
            {letterOf(average).letter}
            <small>{numberTr(average)}</small>
          </span>
        )}
      </div>
      <ErrorBanner message={error} />
      <div className="course-fields">
        <label>
          Kredi (AKTS)
          <input type="number" min="0" max="30" value={credits} onChange={(e) => (setCredits(e.target.value), setSaved(false))} />
        </label>
        <label>
          Devamsızlık hakkı (saat)
          <input
            type="number"
            min="0"
            max="500"
            value={limit}
            placeholder={course.weeklyHours > 0 ? `otomatik: ${course.allowance}` : 'programda saat yok'}
            onChange={(e) => (setLimit(e.target.value), setSaved(false))}
          />
        </label>
      </div>
      <table className="grade-table">
        <thead>
          <tr>
            <th>Sınav / bileşen</th>
            <th>Ağırlık %</th>
            <th>Not</th>
            <th aria-label="Sil" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <input type="text" maxLength={30} value={r.name} aria-label="Bileşen adı" onChange={(e) => update(i, { name: e.target.value })} />
              </td>
              <td>
                <input type="number" min="1" max="100" value={r.weight} aria-label={`${r.name} ağırlığı`} onChange={(e) => update(i, { weight: e.target.value })} />
              </td>
              <td>
                <input type="text" inputMode="decimal" value={r.score} placeholder="—" aria-label={`${r.name} notu`} onChange={(e) => update(i, { score: e.target.value })} />
              </td>
              <td>
                <button type="button" className="secondary small" aria-label={`${r.name} bileşenini sil`} disabled={rows.length === 1} onClick={() => setRows((list) => list.filter((_, j) => j !== i))}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="course-row">
        <button type="button" className="secondary small" onClick={() => setRows((list) => [...list, { name: 'Ödev', weight: '10', score: '' }])} disabled={rows.length >= 10}>
          + Bileşen
        </button>
        <span className={total === 100 ? 'muted' : 'change-down'}>Ağırlık toplamı %{total}</span>
      </div>
      {need && (
        <p className="need-line">
          Hedef{' '}
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))} aria-label="Hedef harf notu">
            {LETTERS.filter((l) => l.min > 0).map((l) => (
              <option key={l.letter} value={l.min}>
                {l.letter} ({l.min})
              </option>
            ))}
          </select>{' '}
          için notu girilmemiş sınavlardan{' '}
          {need.score === 0 ? (
            <b className="change-up">hiçbir şey almasan da yetiyor</b>
          ) : need.possible ? (
            <>
              en az <b>{need.score}</b> alman gerekiyor
            </>
          ) : (
            <b className="change-down">100 bile yetmiyor ({need.score} gerekirdi)</b>
          )}
          .
        </p>
      )}
      <p className="form-actions">
        <button type="submit" disabled={total !== 100}>
          Kaydet
        </button>
        {saved && <span className="muted">Kaydedildi.</span>}
      </p>
    </form>
  );
}

// --- Devamsızlık ---
function Attendance({ courses, absences, classes, today, onChanged }) {
  const [subjectId, setSubjectId] = useState(String(courses[0]?.subjectId ?? ''));
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState('2');
  const [error, setError] = useState(null);
  const nameOf = new Map(courses.map((c) => [c.subjectId, subjectLabel(c.name, c.group)]));
  const todayIndex = dayIndexOf(new Date());
  const todaysClasses = classes.filter((c) => c.day === todayIndex && c.subjectId !== null && nameOf.has(c.subjectId));

  async function add(body) {
    setError(null);
    try {
      await apiFetch('/api/absences', { method: 'POST', body });
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    try {
      await apiFetch(`/api/absences/${id}`, { method: 'DELETE' });
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <ErrorBanner message={error} />
      <ul className="absence-list">
        {courses.map((c) => {
          // Hak bilinmiyorsa (programda saati yok, elle de girilmemiş) uyarı verilmez
          const unknown = c.allowance === 0 && c.absenceLimit === null;
          const ratio = c.allowance > 0 ? c.absent / c.allowance : c.absent > 0 && !unknown ? 1 : 0;
          const level = unknown ? 'unknown' : ratio >= 1 ? 'over' : ratio >= 0.75 ? 'warn' : 'ok';
          return (
            <li key={c.subjectId} className={`absence-row ${level}`}>
              <span className="absence-name">
                <b>{subjectLabel(c.name, c.group)}</b>
                <small className="muted">
                  {c.absenceLimit !== null
                    ? 'hak elle girildi'
                    : c.weeklyHours > 0
                      ? `haftada ${c.weeklyHours} ders saati · 14 haftanın %30'u`
                      : 'hak bilinmiyor: Ders Programı’na saatini ya da Notlar’dan hakkını gir'}
                </small>
              </span>
              <span className="absence-bar" aria-hidden="true">
                <i style={{ width: `${Math.min(1, ratio) * 100}%` }} />
              </span>
              <span className="absence-count">
                <b>{c.absent}</b>
                {unknown ? ' saat' : ` / ${c.allowance} saat`}
                {!unknown && (
                  <small className="muted">
                    {level === 'over' ? ' · hakkın doldu!' : ` · ${Math.max(0, c.allowance - c.absent)} saat kaldı`}
                  </small>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {todaysClasses.length > 0 && (
        <div className="panel absence-today">
          <h2 className="panel-label">Bugünkü derslerin ({DAYS[todayIndex].name})</h2>
          <ul>
            {todaysClasses.map((c) => (
              <li key={c.id}>
                <span>
                  {formatClock(c.start)}–{formatClock(c.end)} <b>{nameOf.get(c.subjectId)}</b>
                </span>
                <button type="button" className="secondary small" onClick={() => add({ subjectId: c.subjectId, date: today, hours: lessonHours(c.start, c.end) })}>
                  Gitmedim ({lessonHours(c.start, c.end)} saat)
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        className="panel absence-form"
        onSubmit={(e) => {
          e.preventDefault();
          add({ subjectId: Number(subjectId), date, hours: Number(hours) });
        }}
      >
        <h2 className="panel-label">Devamsızlık ekle</h2>
        <div className="row">
          <label>
            Ders
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {courses.map((c) => (
                <option key={c.subjectId} value={c.subjectId}>
                  {subjectLabel(c.name, c.group)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tarih
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Ders saati
            <input type="number" min="1" max="12" value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
        </div>
        <p className="form-actions">
          <button type="submit">Ekle</button>
        </p>
      </form>

      {absences.length > 0 && (
        <ul className="list absence-log">
          {absences.map((a) => (
            <li key={a.id}>
              <span>
                {formatDate(a.date)} · <b>{nameOf.get(a.subjectId) ?? 'Silinmiş ders'}</b> · {a.hours} saat
              </span>
              <button type="button" className="secondary small" onClick={() => remove(a.id)}>
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// --- Ödevler ---
function Assignments({ courses, assignments, today, onChanged }) {
  const [form, setForm] = useState({ subjectId: '', title: '', due: today, note: '' });
  const [error, setError] = useState(null);
  const open = assignments.filter((a) => !a.doneAt);
  const done = assignments.filter((a) => a.doneAt);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch('/api/assignments', {
        method: 'POST',
        body: { ...form, subjectId: form.subjectId === '' ? null : Number(form.subjectId) },
      });
      setForm({ subjectId: form.subjectId, title: '', due: today, note: '' });
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggle(a, checked, anchor) {
    try {
      await apiFetch(`/api/assignments/${a.id}/done`, { method: 'PUT', body: { done: checked, today } });
      if (checked) celebrate(anchor, 'Teslim edildi!');
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(a) {
    if (!window.confirm(`"${a.title}" silinsin mi?`)) return;
    try {
      await apiFetch(`/api/assignments/${a.id}`, { method: 'DELETE' });
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  const row = (a) => {
    const left = daysBetween(today, a.due);
    const tone = a.doneAt ? 'done' : left < 0 ? 'late' : left <= 2 ? 'soon' : '';
    return (
      <li key={a.id} className={`assignment ${tone}`}>
        <label className="check-row">
          <input type="checkbox" checked={Boolean(a.doneAt)} onChange={(e) => toggle(a, e.target.checked, e.target)} />
          <span>
            <b>{a.title}</b>
            {a.subjectName && <span className="muted"> · {a.subjectName}</span>}
            {a.note && <small className="muted assignment-note">{a.note}</small>}
          </span>
        </label>
        <span className="assignment-due">
          {a.doneAt ? `teslim edildi ${formatDate(a.doneAt)}` : dueLabel(a.due, today)}
          <small className="muted">{formatDate(a.due)}</small>
        </span>
        <button type="button" className="secondary small" onClick={() => remove(a)}>
          Sil
        </button>
      </li>
    );
  };

  return (
    <>
      <form className="panel assignment-form" onSubmit={handleSubmit}>
        <h2 className="panel-label">Ödev / teslim ekle</h2>
        <ErrorBanner message={error} />
        <div className="row">
          <label>
            <span>
              Ders<span className="optional"> isteğe bağlı</span>
            </span>
            <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Derssiz</option>
              {courses.map((c) => (
                <option key={c.subjectId} value={c.subjectId}>
                  {subjectLabel(c.name, c.group)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Teslim tarihi
            <input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
          </label>
        </div>
        <label>
          Ödev
          <input type="text" maxLength={80} value={form.title} placeholder="Örn. Bağlı liste ödevi" onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label>
          <span>
            Not<span className="optional"> isteğe bağlı</span>
          </span>
          <input type="text" maxLength={300} value={form.note} placeholder="Örn. PDF olarak Moodle'a" onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>
        <p className="form-actions">
          <button type="submit" disabled={!form.title.trim()}>
            Ekle
          </button>
        </p>
      </form>
      {open.length > 0 && <ul className="list assignment-list">{open.map(row)}</ul>}
      {done.length > 0 && (
        <details className="assignment-done">
          <summary>Teslim edilenler ({done.length})</summary>
          <ul className="list assignment-list">{done.map(row)}</ul>
        </details>
      )}
    </>
  );
}

const TABS = [
  ['grades', 'Notlar'],
  ['attendance', 'Devamsızlık'],
  ['assignments', 'Ödevler'],
];

export default function Term() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('grades');
  const today = toLocalDateString(new Date());

  const load = useCallback(async () => {
    try {
      const [courses, absences, assignments, classes] = await Promise.all([
        apiFetch('/api/courses'),
        apiFetch('/api/absences'),
        apiFetch('/api/assignments'),
        apiFetch('/api/classes'),
      ]);
      setData({ courses, absences, assignments, classes });
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    if (!data) return null;
    const next = data.assignments.find((a) => !a.doneAt && a.due >= today);
    const risky = data.courses.filter((c) => c.allowance > 0 && c.absent / c.allowance >= 0.75);
    return { gpa: gpa(data.courses), next, risky };
  }, [data, today]);

  if (!data) {
    return (
      <section>
        <h1>Dönem</h1>
        <ErrorBanner message={error} />
      </section>
    );
  }

  return (
    <section className="term-page">
      <h1>Dönem</h1>
      <p className="muted lede">
        Derslerinin notlarını, devamsızlığını ve ödev teslimlerini tek yerde tut. Harf aralıkları yaygın 4'lük ölçeğe
        göredir; üniversitenin yönetmeliği farklıysa notlarını ona göre yorumla.
      </p>
      <ErrorBanner message={error} />
      {data.courses.length === 0 ? (
        <EmptyState
          Doodle={EmptyNote}
          title="Bu dönem için henüz ders yok"
          hint={
            <>
              Önce <Link to="/konular">Dersler ve Konular</Link>'dan derslerini ekle; ders saatlerini{' '}
              <Link to="/ders-programi">Ders Programı</Link>'na girersen devamsızlık hakkın kendiliğinden hesaplanır.
            </>
          }
        />
      ) : (
        <>
          <div className="panels term-summary">
            <article className="panel">
              <h2 className="panel-label">Dönem ortalaması</h2>
              <span className="value">{summary.gpa.gpa === null ? '—' : numberTr(summary.gpa.gpa)}</span>
              <p className="panel-note">
                {summary.gpa.credits > 0 ? `Notu tamamlanan ${summary.gpa.credits} kredilik derse göre (4'lük)` : 'Bütün notları girilen ders olunca hesaplanır.'}
              </p>
            </article>
            <article className="panel">
              <h2 className="panel-label">Sıradaki teslim</h2>
              {summary.next ? (
                <>
                  <span className="value small-value">{dueLabel(summary.next.due, today)}</span>
                  <p className="panel-note">
                    {summary.next.title}
                    {summary.next.subjectName ? ` · ${summary.next.subjectName}` : ''}
                  </p>
                </>
              ) : (
                <p className="panel-note">Bekleyen ödev yok.</p>
              )}
            </article>
            <article className="panel">
              <h2 className="panel-label">Devamsızlık</h2>
              <span className="value small-value">{summary.risky.length === 0 ? 'Rahat' : `${summary.risky.length} derste sınırda`}</span>
              <p className="panel-note">
                {summary.risky.length === 0 ? 'Hiçbir derste hakkının %75’ine gelmedin.' : summary.risky.map((c) => c.name).join(', ')}
              </p>
            </article>
          </div>
          <div className="segmented term-tabs" role="tablist" aria-label="Bölüm">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : undefined} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'grades' && (
            <div className="course-grid">
              {data.courses.map((c) => (
                <CourseGrades key={c.subjectId} course={c} onSaved={load} />
              ))}
            </div>
          )}
          {tab === 'attendance' && <Attendance courses={data.courses} absences={data.absences} classes={data.classes} today={today} onChanged={load} />}
          {tab === 'assignments' && <Assignments courses={data.courses} assignments={data.assignments} today={today} onChanged={load} />}
        </>
      )}
    </section>
  );
}
