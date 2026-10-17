import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api.js';
import ChartCard from '../components/ChartCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { EmptyNote } from '../components/Doodles.jsx';
import { AccuracyLine, NetLine } from '../components/ProgressCharts.jsx';
import { useTrack } from '../context/TrackContext.jsx';
import { toLocalDateString } from '../lib/dates.js';
import { BRANCH_MAX_QUESTIONS, BRANCH_TYPE, examShortLabel, examTotals, examTypesFor, sectionNet } from '../lib/exams.js';
import { formatDate, formatNet } from '../lib/format.js';
import { subjectLabel } from '../lib/tracks.js';
import { celebrate } from '../lib/celebrate.js';
import WrongTopicsDialog from '../components/WrongTopicsDialog.jsx';
import WrongTopicsSummary from '../components/WrongTopicsSummary.jsx';
import ScoreCalculator from '../components/ScoreCalculator.jsx';

const FIELDS = [
  ['correct', 'doğru', 'Doğru'],
  ['wrong', 'yanlış', 'Yanlış'],
  ['blank', 'boş', 'Boş'],
];

// Formdaki her bölümün boş hâli (metin olarak tutulur: kullanıcı yazarken alan boş kalabilsin)
const emptyRow = () => ({ correct: '', wrong: '', blank: '' });
const emptyResults = (type) => Object.fromEntries(type.sections.map((s) => [s.id, emptyRow()]));

const toNumber = (v) => (v === '' ? 0 : Number(v));
const numericRow = (r) => ({ correct: toNumber(r.correct), wrong: toNumber(r.wrong), blank: toNumber(r.blank) });
const numericResults = (results) => Object.fromEntries(Object.entries(results).map(([id, r]) => [id, numericRow(r)]));
const textRow = (r) => ({ correct: String(r.correct), wrong: String(r.wrong), blank: String(r.blank) });

// Net yüzdesi: farklı soru sayılı branş denemeleri birbiriyle kıyaslanabilsin diye (negatif net 0 sayılır)
const netPercent = (exam) => Math.max(0, Math.round((exam.totals.net / exam.questionCount) * 100));

// Son birkaç denemede bölümlerin ortalama başarısı (net / soru sayısı): en düşüğü "en zayıf bölüm"
function weakestSection(type, exams) {
  const recent = exams.filter((e) => e.type === type.id).slice(0, 5);
  if (recent.length < 2) return null;
  const scored = type.sections.map((s) => {
    const avg = recent.reduce((sum, e) => sum + sectionNet(e.results[s.id] ?? { correct: 0, wrong: 0 }), 0) / recent.length;
    return { ...s, avg, ratio: avg / s.count };
  });
  return scored.sort((a, b) => a.ratio - b.ratio)[0];
}

// Ortak: bir satırın üç kutusu (doğru/yanlış/boş)
function ResultInputs({ label, row, max, onChange }) {
  return FIELDS.map(([field, word]) => (
    <td key={field}>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max={max}
        value={row[field]}
        aria-label={`${label} ${word}`}
        onChange={(e) => onChange(field, e.target.value)}
      />
    </td>
  ));
}

// --- Genel deneme (TYT, AYT alanları, DGS) ---
function ExamForm({ types, editing, onSave, onCancel }) {
  const [typeId, setTypeId] = useState(editing?.type ?? types[0].id);
  const type = types.find((t) => t.id === typeId) ?? types[0];
  const [date, setDate] = useState(editing?.date ?? toLocalDateString(new Date()));
  const [name, setName] = useState(editing?.name ?? '');
  const [results, setResults] = useState(() =>
    editing
      ? Object.fromEntries(Object.entries(editing.results).map(([id, r]) => [id, textRow(r)]))
      : emptyResults(type),
  );

  function changeType(id) {
    setTypeId(id);
    setResults(emptyResults(types.find((t) => t.id === id)));
  }

  const totals = examTotals({ results: numericResults(results) });

  async function handleSubmit(event) {
    event.preventDefault();
    const ok = await onSave({ date, name, type: type.id, results: numericResults(results) }, event);
    if (ok && !editing) {
      setName('');
      setResults(emptyResults(type));
    }
  }

  return (
    <form className="card exam-form" onSubmit={handleSubmit}>
      <h2 className="panel-label">{editing ? 'Denemeyi düzenle' : 'Yeni genel deneme'}</h2>
      {types.length > 1 && (
        <div className="segmented exam-types" role="group" aria-label="Deneme türü">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === type.id ? 'active' : undefined}
              aria-pressed={t.id === type.id}
              title={t.label}
              onClick={() => changeType(t.id)}
              disabled={Boolean(editing)}
            >
              {t.short ?? t.label}
            </button>
          ))}
        </div>
      )}
      <div className="row">
        <label>
          Tarih
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span>
            Deneme adı <span className="optional">isteğe bağlı</span>
          </span>
          <input type="text" value={name} maxLength={60} placeholder="Örn. Türkiye geneli 3" onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
      <table className="exam-table">
        <thead>
          <tr>
            <th scope="col">Bölüm</th>
            {FIELDS.map(([f, , head]) => (
              <th key={f} scope="col">
                {head}
              </th>
            ))}
            <th scope="col">Net</th>
          </tr>
        </thead>
        <tbody>
          {type.sections.map((s) => {
            const r = results[s.id] ?? emptyRow();
            const n = numericRow(r);
            return (
              <tr key={s.id} className={n.correct + n.wrong + n.blank > s.count ? 'over' : undefined}>
                <th scope="row">
                  {s.label}
                  <span className="muted"> {s.count} soru</span>
                </th>
                <ResultInputs
                  label={s.label}
                  row={r}
                  max={s.count}
                  onChange={(field, value) => setResults((all) => ({ ...all, [s.id]: { ...all[s.id], [field]: value } }))}
                />
                <td className="exam-net">{formatNet(sectionNet(n))}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Toplam</th>
            <td>{totals.correct}</td>
            <td>{totals.wrong}</td>
            <td>{totals.blank}</td>
            <td className="exam-net">{formatNet(totals.net)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="form-actions">
        <button type="submit">{editing ? 'Kaydet' : 'Denemeyi ekle'}</button>
        {editing && (
          <button type="button" className="secondary" onClick={onCancel}>
            Vazgeç
          </button>
        )}
      </p>
    </form>
  );
}

// --- Branş denemesi: tek ders, soru sayısını kullanıcı girer ---
function BranchForm({ subjects, editing, onSave, onCancel }) {
  const [date, setDate] = useState(editing?.date ?? toLocalDateString(new Date()));
  const [subjectId, setSubjectId] = useState(editing ? String(editing.subjectId) : String(subjects[0]?.id ?? ''));
  const [name, setName] = useState(editing?.name ?? '');
  const [count, setCount] = useState(editing ? String(editing.questionCount) : '40');
  const [row, setRow] = useState(editing ? textRow(editing.results.brans) : emptyRow());
  const n = numericRow(row);
  const q = toNumber(count);
  const net = sectionNet(n);

  async function handleSubmit(event) {
    event.preventDefault();
    const ok = await onSave(
      { date, name, type: BRANCH_TYPE, subjectId: Number(subjectId), questionCount: q, results: { brans: n } },
      event,
    );
    if (ok && !editing) {
      setName('');
      setRow(emptyRow());
    }
  }

  return (
    <form className="card exam-form" onSubmit={handleSubmit}>
      <h2 className="panel-label">{editing ? 'Branş denemesini düzenle' : 'Yeni branş denemesi'}</h2>
      <div className="row">
        <label>
          Ders
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {subjectLabel(s.name, s.examType)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tarih
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <div className="row">
        <label>
          <span>
            Deneme adı <span className="optional">isteğe bağlı</span>
          </span>
          <input type="text" value={name} maxLength={60} placeholder="Örn. Paragraf 12" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="narrow-field">
          Soru sayısı
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max={BRANCH_MAX_QUESTIONS}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
      </div>
      <table className="exam-table">
        <thead>
          <tr>
            {FIELDS.map(([f, , head]) => (
              <th key={f} scope="col">
                {head}
              </th>
            ))}
            <th scope="col">Net</th>
            <th scope="col">Net %</th>
          </tr>
        </thead>
        <tbody>
          <tr className={n.correct + n.wrong + n.blank > q ? 'over' : undefined}>
            <ResultInputs label="Branş" row={row} max={q} onChange={(field, value) => setRow((r) => ({ ...r, [field]: value }))} />
            <td className="exam-net">{formatNet(net)}</td>
            <td className="exam-net">{q > 0 ? `%${Math.max(0, Math.round((net / q) * 100))}` : '—'}</td>
          </tr>
        </tbody>
      </table>
      <p className="form-actions">
        <button type="submit" disabled={subjects.length === 0}>
          {editing ? 'Kaydet' : 'Branş denemesini ekle'}
        </button>
        {editing && (
          <button type="button" className="secondary" onClick={onCancel}>
            Vazgeç
          </button>
        )}
      </p>
    </form>
  );
}

function ExamList({ exams, editingId, onEdit, onRemove, onTopics }) {
  return (
    <ul className="list exam-list">
      {exams.map((e) => (
        <li key={e.id} className={editingId === e.id ? 'is-editing' : undefined}>
          <span className="exam-when">
            {formatDate(e.date)} <span className="badge">{examShortLabel(e.type)}</span>
          </span>
          <span className="exam-name">
            {e.type === BRANCH_TYPE ? `${subjectLabel(e.subjectName, e.examType)} · ` : ''}
            {e.name || 'Deneme'}
            <span className="muted">
              {' '}
              {e.totals.correct} D · {e.totals.wrong} Y · {e.totals.blank} B
              {e.type === BRANCH_TYPE ? ` / ${e.questionCount}` : ''}
            </span>
          </span>
          <strong className="exam-total">
            {formatNet(e.totals.net)} net
            {e.type === BRANCH_TYPE && <small> %{netPercent(e)}</small>}
          </strong>
          <span className="actions">
            {e.totals.wrong + e.totals.blank > 0 && (
              <button
                type="button"
                className="secondary small"
                title="Yanlış ve boş soruların konularını işle"
                onClick={() => onTopics(e)}
              >
                Konular{e.wrongTopics.length > 0 && <span className="tab-count">{e.wrongTopics.length}</span>}
              </button>
            )}
            <button type="button" className="secondary small" onClick={() => onEdit(e)}>
              Düzenle
            </button>
            <button type="button" className="secondary small" onClick={() => onRemove(e)}>
              Sil
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

// Genel denemelerin özeti: son net, değişim, en zayıf bölüm, net grafiği
function GeneralStats({ types, exams }) {
  const [chartType, setChartType] = useState(() => exams[0]?.type ?? types[0].id);
  const type = types.find((t) => t.id === chartType) ?? types[0];
  const series = useMemo(
    () =>
      exams
        .filter((e) => e.type === type.id)
        .slice()
        .reverse()
        .map((e) => ({ date: e.date, net: e.totals.net })),
    [exams, type],
  );
  const weak = weakestSection(type, exams);
  const lastTwo = series.slice(-2);
  const label = type.short ?? type.label;

  return (
    <>
      {types.length > 1 && (
        <div className="range-buttons exam-switch" role="group" aria-label="Özetteki deneme türü">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === type.id ? undefined : 'secondary'}
              aria-pressed={t.id === type.id}
              title={t.label}
              onClick={() => setChartType(t.id)}
            >
              {t.short ?? t.label}
            </button>
          ))}
        </div>
      )}
      <div className="panels">
        <article className="panel">
          <h2 className="panel-label">Son {label} neti</h2>
          {lastTwo.length > 0 ? (
            <>
              <span className="value">{formatNet(lastTwo[lastTwo.length - 1].net)}</span>
              {lastTwo.length === 2 && (
                <p className="panel-note">
                  Bir önceki denemeye göre{' '}
                  <span className={lastTwo[1].net >= lastTwo[0].net ? 'change-up' : 'change-down'}>
                    {lastTwo[1].net >= lastTwo[0].net ? '+' : ''}
                    {formatNet(Math.round((lastTwo[1].net - lastTwo[0].net) * 100) / 100)} net
                  </span>
                </p>
              )}
            </>
          ) : (
            <p className="panel-note">Henüz {type.label} denemesi yok.</p>
          )}
        </article>
        <article className="panel">
          <h2 className="panel-label">En zayıf bölüm</h2>
          {weak ? (
            <>
              <span className="value">{weak.label}</span>
              <p className="panel-note">
                Son denemelerde ortalama {formatNet(Math.round(weak.avg * 100) / 100)} net / {weak.count} soru
              </p>
            </>
          ) : (
            <p className="panel-note">Aynı türden en az iki deneme girince burada görünür.</p>
          )}
        </article>
      </div>
      <ChartCard
        title={`${type.label} toplam neti`}
        subtitle="Denemeler tarih sırasıyla"
        empty={series.length === 0}
        emptyText={`Henüz ${type.label} denemesi yok.`}
        headers={['Tarih', 'Net']}
        rows={series.map((d) => [formatDate(d.date), formatNet(d.net)])}
      >
        <NetLine days={series} ariaLabel={`${type.label} denemelerinin toplam neti`} />
      </ChartCard>
    </>
  );
}

// Branş denemelerinin özeti: ders başına deneme sayısı ve ortalama, seçili dersin net yüzdesi grafiği
function BranchStats({ exams }) {
  const bySubject = useMemo(() => {
    const map = new Map();
    for (const e of exams) {
      const key = e.subjectId;
      if (!map.has(key)) map.set(key, { id: key, name: subjectLabel(e.subjectName, e.examType), rows: [] });
      map.get(key).rows.push(e);
    }
    return [...map.values()].map((g) => ({
      ...g,
      avg: Math.round(g.rows.reduce((s, e) => s + netPercent(e), 0) / g.rows.length),
      last: netPercent(g.rows[0]),
    }));
  }, [exams]);
  const [selected, setSelected] = useState(() => bySubject[0]?.id ?? null);
  const group = bySubject.find((g) => g.id === selected) ?? bySubject[0];
  const series = group
    ? group.rows
        .slice()
        .reverse()
        .map((e) => ({ date: e.date, accuracy: netPercent(e) }))
    : [];

  return (
    <>
      <div className="table-wrap branch-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Ders</th>
              <th scope="col">Deneme</th>
              <th scope="col">Ortalama</th>
              <th scope="col">Son</th>
            </tr>
          </thead>
          <tbody>
            {bySubject
              .slice()
              .sort((a, b) => a.avg - b.avg)
              .map((g) => (
                <tr key={g.id} className={g.id === group?.id ? 'is-selected' : undefined}>
                  <td>
                    <button type="button" className="link-button" onClick={() => setSelected(g.id)}>
                      {g.name}
                    </button>
                  </td>
                  <td>{g.rows.length}</td>
                  <td>%{g.avg}</td>
                  <td>%{g.last}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="muted small-note">En düşük ortalama en üstte. Grafiği görmek için bir derse tıkla.</p>
      </div>
      {group && (
        <ChartCard
          title={`${group.name} branş denemeleri`}
          subtitle="Net yüzdesi (net ÷ soru sayısı), tarih sırasıyla"
          empty={series.length === 0}
          headers={['Tarih', 'Net %']}
          rows={series.map((d) => [formatDate(d.date), `%${d.accuracy}`])}
        >
          <AccuracyLine days={series} ariaLabel={`${group.name} branş denemelerinin net yüzdesi`} />
        </ChartCard>
      )}
    </>
  );
}

// Deneme sınavları: Genel (TYT, AYT alanları, DGS) ve Branş (tek ders) sekmeleri
export default function Exams() {
  const { track } = useTrack();
  const types = examTypesFor(track);
  const [tab, setTab] = useState('general');
  const [exams, setExams] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [topicsFor, setTopicsFor] = useState(null); // konuları işlenen deneme
  const [topicsError, setTopicsError] = useState(null);
  const [wrongTopics, setWrongTopics] = useState([]);
  const [justSaved, setJustSaved] = useState(null); // yeni eklenen deneme: konuları işlemeyi öner

  const load = useCallback(async () => {
    try {
      const [list, subjectList, wrong] = await Promise.all([
        apiFetch('/api/exams'),
        apiFetch('/api/subjects'),
        apiFetch('/api/exams/wrong-topics'),
      ]);
      setExams(list);
      setSubjects(subjectList);
      setWrongTopics(wrong);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const general = (exams ?? []).filter((e) => e.type !== BRANCH_TYPE);
  const branch = (exams ?? []).filter((e) => e.type === BRANCH_TYPE);
  const shown = tab === 'general' ? general : branch;

  async function save(body, event) {
    setError(null);
    try {
      const previousBest = Math.max(-Infinity, ...(exams ?? []).filter((e) => e.type === body.type && (body.type !== BRANCH_TYPE || e.subjectId === body.subjectId)).map((e) => e.totals.net));
      const saved = editing
        ? await apiFetch(`/api/exams/${editing.id}`, { method: 'PUT', body })
        : await apiFetch('/api/exams', { method: 'POST', body });
      // Yeni rekor net: küçük bir kutlama (aynı türde daha önce deneme varsa)
      if (!editing && Number.isFinite(previousBest) && saved.totals.net > previousBest) {
        celebrate(event?.nativeEvent?.submitter ?? null, 'Yeni rekor net!');
      }
      if (!editing && saved.totals.wrong + saved.totals.blank > 0) setJustSaved(saved);
      setEditing(null);
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function remove(exam) {
    if (!window.confirm(`${formatDate(exam.date)} tarihli ${examShortLabel(exam.type)} denemesi silinsin mi?`)) return;
    setError(null);
    try {
      await apiFetch(`/api/exams/${exam.id}`, { method: 'DELETE' });
      if (editing?.id === exam.id) setEditing(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function openTopics(exam) {
    setTopicsError(null);
    setJustSaved(null);
    setTopicsFor(exam);
  }

  async function saveTopics(items) {
    setTopicsError(null);
    try {
      await apiFetch(`/api/exams/${topicsFor.id}/wrong-topics`, { method: 'PUT', body: { items } });
      setTopicsFor(null);
      await load();
    } catch (e) {
      setTopicsError(e.message);
    }
  }

  function switchTab(next) {
    setTab(next);
    setEditing(null);
    setError(null);
  }

  return (
    <section className="exams-page">
      <h1>Denemeler</h1>
      <p className="muted lede">
        Genel denemeleri bölüm bölüm, branş denemelerini ders ders gir; net (doğru − yanlış / 4) kendiliğinden
        hesaplanır. Gidişatın ve en çok zorlandığın yer aşağıda görünür.
      </p>
      <div className="segmented exam-tabs" role="tablist" aria-label="Deneme türü">
        <button type="button" role="tab" aria-selected={tab === 'general'} className={tab === 'general' ? 'active' : undefined} onClick={() => switchTab('general')}>
          Genel denemeler <span className="tab-count">{general.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'branch'} className={tab === 'branch' ? 'active' : undefined} onClick={() => switchTab('branch')}>
          Branş denemeleri <span className="tab-count">{branch.length}</span>
        </button>
        {track === 'yks' && (
          <button type="button" role="tab" aria-selected={tab === 'score'} className={tab === 'score' ? 'active' : undefined} onClick={() => switchTab('score')}>
            Puan ve sıralama
          </button>
        )}
      </div>
      <ErrorBanner message={error} />
      {justSaved && (
        <p className="notice" role="status">
          Deneme kaydedildi. Yanlış ve boş bıraktığın soruların konularını da işlersen hangi konuların sana soru
          kaybettirdiği ortaya çıkar.{' '}
          <button type="button" className="link-button" onClick={() => openTopics(justSaved)}>
            Konuları işle
          </button>
        </p>
      )}

      {tab === 'score' && exams && <ScoreCalculator exams={general} />}

      {tab === 'score' ? null : tab === 'general' ? (
        <ExamForm key={editing ? `edit-${editing.id}` : 'new'} types={types} editing={editing} onSave={save} onCancel={() => setEditing(null)} />
      ) : (
        <BranchForm key={editing ? `edit-${editing.id}` : `new-${subjects.length}`} subjects={subjects} editing={editing} onSave={save} onCancel={() => setEditing(null)} />
      )}

      {tab !== 'score' && exams && shown.length > 0 && (
        <>
          {tab === 'general' ? <GeneralStats key={general.length} types={types} exams={general} /> : <BranchStats key={branch.length} exams={branch} />}
          <WrongTopicsSummary rows={wrongTopics} />
          <h2>{tab === 'general' ? 'Geçmiş genel denemeler' : 'Geçmiş branş denemeleri'}</h2>
          <ExamList exams={shown} editingId={editing?.id} onEdit={setEditing} onRemove={remove} onTopics={openTopics} />
        </>
      )}

      {tab !== 'score' && exams && shown.length === 0 && (
        <EmptyState
          Doodle={EmptyNote}
          title={tab === 'general' ? 'Henüz genel deneme yok' : 'Henüz branş denemesi yok'}
          hint={
            tab === 'general'
              ? 'İlk denemenin sonuçlarını yukarıdan gir; netinin gidişatı burada çizilir.'
              : 'Paragraf, problem ya da fizik gibi tek derslik denemelerini buraya gir; ders ders ortalaman çıkar.'
          }
        />
      )}
      {topicsFor && (
        <WrongTopicsDialog
          key={topicsFor.id}
          exam={topicsFor}
          subjects={subjects}
          error={topicsError}
          onSave={saveTopics}
          onClose={() => setTopicsFor(null)}
        />
      )}
    </section>
  );
}
