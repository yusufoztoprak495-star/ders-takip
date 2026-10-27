import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { EmptyNote } from '../components/Doodles.jsx';
import { celebrate } from '../lib/celebrate.js';
import { toLocalDateString } from '../lib/dates.js';
import { formatDate } from '../lib/format.js';
import { distributeMonth, distributionSummary } from '../lib/distributeMonth.js';
import { WEEKS, monthLabel, monthOf, progressOf, shiftMonth, weekLabel } from '../lib/months.js';
import { subjectLabel } from '../lib/tracks.js';

// Veri katmanı 2000–2100 arası yılları kabul eder; ay düğmeleri bu sınırda durur
const FIRST_MONTH = '2000-01';
const LAST_MONTH = '2100-12';

const lower = (text) => text.toLocaleLowerCase('tr');

// Tablodaki tek satır: bitti kutusu, konu, not; yerinde düzenleme ve silme
function PlanRow({ row, month, subjectName, othersOpen, onChanged, onError }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(row.title);
  const [note, setNote] = useState(row.note);
  // Kutu tıklanınca sunucu cevabını beklemeden hemen döner (cevap gelince liste yenilenir)
  const [pending, setPending] = useState(null);
  const checked = pending ?? Boolean(row.doneAt);

  async function toggle(next, anchor) {
    setPending(next);
    onError(null);
    try {
      await apiFetch(`/api/month-plans/${row.id}/done`, {
        method: 'PUT',
        body: { done: next, today: toLocalDateString(new Date()) },
      });
      if (next) celebrate(anchor, othersOpen === 0 ? `${subjectName}: bu ayın hepsi bitti!` : 'Konu bitti!');
      await onChanged();
    } catch (e) {
      onError(e.message);
    } finally {
      setPending(null);
    }
  }

  // Konunun haftasını elle değiştirir (boş = haftası belli değil)
  async function setWeek(value) {
    onError(null);
    try {
      await apiFetch('/api/month-plans/weeks', {
        method: 'PUT',
        body: { month, weeks: [{ id: row.id, week: value === '' ? null : Number(value) }] },
      });
      await onChanged();
    } catch (e) {
      onError(e.message);
    }
  }

  async function save() {
    onError(null);
    try {
      await apiFetch(`/api/month-plans/${row.id}`, { method: 'PUT', body: { title, note } });
      setEditing(false);
      await onChanged();
    } catch (e) {
      onError(e.message);
    }
  }

  async function remove() {
    onError(null);
    try {
      await apiFetch(`/api/month-plans/${row.id}`, { method: 'DELETE' });
      await onChanged();
    } catch (e) {
      onError(e.message);
    }
  }

  function startEdit() {
    setTitle(row.title);
    setNote(row.note);
    setEditing(true);
  }

  // Enter kaydeder, Esc vazgeçer
  function handleKey(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      save();
    } else if (event.key === 'Escape') {
      setEditing(false);
    }
  }

  return (
    <tr className={checked ? 'mp-row done' : 'mp-row'}>
      <td className="mp-check">
        <input
          type="checkbox"
          checked={checked}
          aria-label={`${row.title} bitti`}
          onChange={(e) => toggle(e.target.checked, e.target)}
        />
      </td>
      {editing ? (
        <>
          <td className="mp-title">
            <input type="text" maxLength={100} value={title} aria-label="Konu adı" autoFocus onChange={(e) => setTitle(e.target.value)} onKeyDown={handleKey} />
          </td>
          <td className="mp-note">
            <input type="text" maxLength={100} value={note} placeholder="Not" aria-label="Not" onChange={(e) => setNote(e.target.value)} onKeyDown={handleKey} />
          </td>
          <td className="mp-week">
            <select value={row.week ?? ''} aria-label={`${row.title} haftası`} onChange={(e) => setWeek(e.target.value)}>
              <option value="">—</option>
              {Array.from({ length: WEEKS }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Hafta {i + 1}
                </option>
              ))}
            </select>
          </td>
          <td className="mp-actions">
            <button type="button" className="small" disabled={!title.trim()} onClick={save}>
              Kaydet
            </button>
            <button type="button" className="secondary small" onClick={() => setEditing(false)}>
              Vazgeç
            </button>
          </td>
        </>
      ) : (
        <>
          <td className="mp-title">
            <span className="mp-name">{row.title}</span>
            {row.doneAt && checked && <small className="muted mp-done-date">bitti {formatDate(row.doneAt)}</small>}
          </td>
          <td className="mp-note">{row.note && <span className="muted">{row.note}</span>}</td>
          <td className="mp-week">
            <select value={row.week ?? ''} aria-label={`${row.title} haftası`} onChange={(e) => setWeek(e.target.value)}>
              <option value="">—</option>
              {Array.from({ length: WEEKS }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Hafta {i + 1}
                </option>
              ))}
            </select>
          </td>
          <td className="mp-actions">
            <button type="button" className="secondary small" onClick={startEdit} aria-label={`${row.title} konusunu düzenle`}>
              Düzenle
            </button>
            <button type="button" className="secondary small danger" onClick={remove} aria-label={`${row.title} konusunu sil`}>
              Sil
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

// Tabloların altındaki hızlı ekleme satırı: konu yazarken Konular sayfasındaki adlar önerilir
function AddRow({ subject, month, suggestions, onChanged, onError, autoFocus }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const titleRef = useRef(null);

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus();
  }, [autoFocus]);

  async function submit(event) {
    event.preventDefault();
    onError(null);
    // Kutular gönderirken hemen boşalır: istek sürerken yazmaya devam edersen yazdığın silinmesin.
    // Hata olursa (örn. aynı konu zaten var) yazdıkların, kutular hâlâ boşsa geri gelir.
    const draft = { title, note };
    setTitle('');
    setNote('');
    try {
      await apiFetch('/api/month-plans', { method: 'POST', body: { month, subjectId: subject.id, ...draft } });
      await onChanged();
      // Arka arkaya birkaç konu eklenebilsin diye odak konu kutusunda kalır
      titleRef.current?.focus();
    } catch (e) {
      setTitle((current) => (current === '' ? draft.title : current));
      setNote((current) => (current === '' ? draft.note : current));
      onError(e.message);
    }
  }

  const listId = `mp-topics-${subject.id}`;
  return (
    <form className="month-add" onSubmit={submit}>
      <input
        ref={titleRef}
        type="text"
        list={listId}
        maxLength={100}
        value={title}
        placeholder="Konu ekle (örn. Türev)"
        aria-label={`${subject.name} için konu`}
        onChange={(e) => setTitle(e.target.value)}
      />
      <datalist id={listId}>
        {suggestions.map((t) => (
          <option key={t.id} value={t.name} />
        ))}
      </datalist>
      <input type="text" maxLength={100} value={note} placeholder="Not (isteğe bağlı)" aria-label="Not" onChange={(e) => setNote(e.target.value)} />
      <button type="submit" disabled={!title.trim()}>
        Ekle
      </button>
    </form>
  );
}

// Bir dersin o aydaki konu tablosu
function SubjectCard({ subject, rows, month, onChanged, onError, onClose, focusAdd }) {
  const { total, done, percent } = progressOf(rows);
  const label = subjectLabel(subject.name, subject.examType);
  const planned = new Set(rows.map((r) => lower(r.title)));
  const suggestions = subject.topics.filter((t) => !planned.has(lower(t.name)));

  return (
    <section className="panel month-card" aria-label={label}>
      <div className="month-card-head">
        <h2 className="panel-label">{label}</h2>
        <span className="month-count">
          {total === 0 ? 'Henüz konu yok' : `${done} / ${total} konu bitti`}
          {total > 0 && <b> · %{percent}</b>}
        </span>
        {total === 0 && (
          <button type="button" className="secondary small" onClick={onClose}>
            Kapat
          </button>
        )}
      </div>
      {total > 0 && (
        <span className="month-meter" role="img" aria-label={`%${percent} tamamlandı`}>
          <i style={{ width: `${percent}%` }} />
        </span>
      )}
      {total > 0 && (
        <table className="month-table" aria-label={`${label} konuları`}>
          <thead>
            <tr>
              <th className="mp-check" aria-label="Bitti" />
              <th>Konu</th>
              <th>Not</th>
              <th className="mp-week">Hafta</th>
              <th className="mp-actions" aria-label="İşlemler" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <PlanRow
                key={row.id}
                row={row}
                month={month}
                subjectName={subject.name}
                othersOpen={rows.filter((r) => !r.doneAt && r.id !== row.id).length}
                onChanged={onChanged}
                onError={onError}
              />
            ))}
          </tbody>
        </table>
      )}
      <AddRow subject={subject} month={month} suggestions={suggestions} onChanged={onChanged} onError={onError} autoFocus={focusAdd} />
    </section>
  );
}

// "Haftalara göre" görünüm: her haftada hangi dersten hangi konular var (haftası belli olmayanlar ayrı)
function WeekOverview({ month, plans, subjects }) {
  const nameOf = new Map(subjects.map((s) => [s.id, subjectLabel(s.name, s.examType)]));
  const order = new Map(subjects.map((s, i) => [s.id, i]));
  const groups = [...Array.from({ length: WEEKS }, (_, i) => i + 1), null];
  const cells = groups.map((week) => {
    const rows = plans
      .filter((p) => (p.week ?? null) === week)
      .sort((a, b) => (order.get(a.subjectId) ?? 99) - (order.get(b.subjectId) ?? 99) || a.id - b.id);
    return { week, rows };
  });
  if (cells[WEEKS].rows.length === 0) cells.pop();
  return (
    <div className="week-overview" aria-label="Haftalara göre konular">
      {cells.map(({ week, rows }) => (
        <section key={week ?? 'none'} className="panel week-overview-card">
          <h3 className="panel-label">
            {week ? `Hafta ${week}` : 'Haftası belli değil'}
            <span className="muted"> {week ? weekLabel(month, week) : ''}</span>
          </h3>
          {rows.length === 0 ? (
            <p className="muted small-note">Konu yok</p>
          ) : (
            <ul>
              {rows.map((r) => (
                <li key={r.id} className={r.doneAt ? 'done' : undefined}>
                  <span className="muted">{nameOf.get(r.subjectId)}</span> {r.title}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export default function MonthlyPlan() {
  // Bugünün ayı sayfa açılırken bir kez alınır; "Bu ay" düğmesi buraya döner
  const [currentMonth] = useState(() => monthOf(toLocalDateString(new Date())));
  const [month, setMonth] = useState(currentMonth);
  const [loaded, setLoaded] = useState(null); // { month, subjects, plans }
  const [error, setError] = useState(null);
  // Tablosu henüz boş olan ama kullanıcının açtığı dersler (ay değişince sıfırlanır)
  const [opened, setOpened] = useState({ month, ids: [] });
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [skipPast, setSkipPast] = useState(true);
  // Ay hızlı değişirse geç gelen eski cevap ekranı bozmasın
  const latestMonth = useRef(month);
  latestMonth.current = month;

  const load = useCallback(async (target) => {
    try {
      const [subjects, plans] = await Promise.all([apiFetch('/api/subjects'), apiFetch(`/api/month-plans?month=${target}`)]);
      if (latestMonth.current !== target) return;
      setLoaded({ month: target, subjects, plans });
      // Planı olan dersler o ay boyunca açık kalır: son konu silinince kart (ve ekleme satırı) kaybolmasın
      setOpened((o) => {
        const same = o.month === target;
        const ids = [...new Set([...(same ? o.ids : []), ...plans.map((p) => p.subjectId)])];
        return { month: target, ids, focus: same ? o.focus : undefined };
      });
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    setError(null);
    load(month);
  }, [month, load]);

  const reload = useCallback(() => load(latestMonth.current), [load]);

  const ready = loaded?.month === month;
  const openedIds = opened.month === month ? opened.ids : [];
  const rowsOf = (subjectId) => (ready ? loaded.plans.filter((p) => p.subjectId === subjectId) : []);
  const shown = ready ? loaded.subjects.filter((s) => rowsOf(s.id).length > 0 || openedIds.includes(s.id)) : [];
  const addable = ready ? loaded.subjects.filter((s) => !shown.includes(s)) : [];
  const total = ready ? progressOf(loaded.plans) : null;

  function openSubject() {
    if (pick === '') return;
    setOpened({ month, ids: [...openedIds, Number(pick)], focus: Number(pick) });
    setPick('');
  }

  async function distribute() {
    const hasWeeks = loaded.plans.some((p) => !p.doneAt && p.week != null);
    if (hasWeeks && !window.confirm('Bazı konuların haftası zaten belirli; yeniden dağıtılınca değişecek. Devam edilsin mi?')) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const fromDate = skipPast && month === currentMonth ? toLocalDateString(new Date()) : null;
      const result = await distributeMonth({ month, fromDate });
      await reload();
      setNotice(distributionSummary(result));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function closeSubject(id) {
    setOpened({ month, ids: openedIds.filter((x) => x !== id), focus: undefined });
  }

  return (
    <section className="monthly-plan">
      <h1>Aylık Plan</h1>
      <p className="muted lede">
        Her ay için derslerini ayrı ayrı planla: o ay bitirmeyi düşündüğün konuları dersin tablosuna ekle, bitirdikçe
        işaretle. Konu adları Dersler ve Konular sayfasından önerilir; istersen kendi cümlenle de yazabilirsin.
      </p>
      <ErrorBanner message={error} />

      <div className="month-toolbar">
        <div className="month-nav" role="group" aria-label="Ay seç">
          <button type="button" className="secondary" aria-label="Önceki ay" disabled={month <= FIRST_MONTH} onClick={() => setMonth(shiftMonth(month, -1))}>
            ‹
          </button>
          <span className="month-name" aria-live="polite">
            {monthLabel(month)}
          </span>
          <button type="button" className="secondary" aria-label="Sonraki ay" disabled={month >= LAST_MONTH} onClick={() => setMonth(shiftMonth(month, 1))}>
            ›
          </button>
          {month !== currentMonth && (
            <button type="button" className="secondary small" onClick={() => setMonth(currentMonth)}>
              Bu aya dön
            </button>
          )}
        </div>
        {ready && (
          <p className="month-summary">
            {total.total === 0 ? (
              'Bu ay için henüz konu planlamadın.'
            ) : (
              <>
                <b>{total.total}</b> konu planladın, <b>{total.done}</b> tanesi bitti <span className="muted">(%{total.percent})</span>.
              </>
            )}
          </p>
        )}
      </div>

      {!ready && !error && <p className="muted page-loading">Yükleniyor…</p>}

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      {ready && total.total > 0 && (
        <>
          <div className="distribute-panel">
            <div>
              <b>Konuları haftalara dağıt</b>
              <p className="muted small-note">
                Ders saatlerin ve Haftalık Program’daki bloklar düşülür; her haftanın boş çalışma süresine oranla
                bitmemiş konular 4 haftaya paylaştırılır. Sonra tablodaki “Hafta” sütunundan elle değiştirebilirsin.
              </p>
            </div>
            {month === currentMonth && (
              <label className="check-row">
                <input type="checkbox" checked={skipPast} onChange={(e) => setSkipPast(e.target.checked)} />
                <span>Geçmiş günleri sayma</span>
              </label>
            )}
            <button type="button" onClick={distribute} disabled={busy || total.done === total.total}>
              {busy ? 'Dağıtılıyor…' : 'Haftalara dağıt'}
            </button>
          </div>
          <WeekOverview month={month} plans={loaded.plans} subjects={loaded.subjects} />
        </>
      )}

      {ready && addable.length > 0 && (
        <div className="month-open">
          <label>
            <span>Derse konu planla</span>
            <select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Ders seç…</option>
              {addable.map((s) => (
                <option key={s.id} value={s.id}>
                  {subjectLabel(s.name, s.examType)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={pick === ''} onClick={openSubject}>
            Tablosunu aç
          </button>
        </div>
      )}

      {ready && shown.length === 0 && (
        <EmptyState
          Doodle={EmptyNote}
          title={`${monthLabel(month)} için plan yok`}
          hint="Yukarıdan bir ders seç; o ay bitirmek istediğin konuları tablo hâlinde topla."
        />
      )}

      {ready && (
        <div className="month-grid">
          {shown.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              rows={rowsOf(subject.id)}
              month={month}
              onChanged={reload}
              onError={setError}
              onClose={() => closeSubject(subject.id)}
              focusAdd={opened.month === month && opened.focus === subject.id}
            />
          ))}
        </div>
      )}

      <p className="muted small-note">
        Bu ayın konularını saatlere yerleştirmek için <Link className="text-link" to="/haftalik">Haftalık Program</Link>’a geç.
      </p>
    </section>
  );
}
