import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api.js';
import ChartCard from '../components/ChartCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { EmptyNote } from '../components/Doodles.jsx';
import { NetLine } from '../components/ProgressCharts.jsx';
import { useTrack } from '../context/TrackContext.jsx';
import { toLocalDateString } from '../lib/dates.js';
import { examTotals, examTypesFor, sectionNet } from '../lib/exams.js';
import { formatDate, formatNet } from '../lib/format.js';

// Formdaki her bölümün boş hâli (metin olarak tutulur: kullanıcı yazarken alan boş kalabilsin)
const emptyResults = (type) =>
  Object.fromEntries(type.sections.map((s) => [s.id, { correct: '', wrong: '', blank: '' }]));

const toNumber = (v) => (v === '' ? 0 : Number(v));
const numericResults = (results) =>
  Object.fromEntries(
    Object.entries(results).map(([id, r]) => [
      id,
      { correct: toNumber(r.correct), wrong: toNumber(r.wrong), blank: toNumber(r.blank) },
    ]),
  );

// Son birkaç denemede bölümlerin ortalama başarısı (net / soru sayısı): en düşüğü "en zayıf bölüm"
function weakestSection(type, exams) {
  const recent = exams.filter((e) => e.type === type.id).slice(0, 5);
  if (recent.length < 2) return null;
  const scored = type.sections.map((s) => {
    const avg = recent.reduce((sum, e) => sum + sectionNet(e.results[s.id]), 0) / recent.length;
    return { ...s, avg, ratio: avg / s.count };
  });
  return scored.sort((a, b) => a.ratio - b.ratio)[0];
}

function ExamForm({ types, editing, onSave, onCancel }) {
  const [typeId, setTypeId] = useState(editing?.type ?? types[0].id);
  const type = types.find((t) => t.id === typeId) ?? types[0];
  const [date, setDate] = useState(editing?.date ?? toLocalDateString(new Date()));
  const [name, setName] = useState(editing?.name ?? '');
  const [results, setResults] = useState(() =>
    editing
      ? Object.fromEntries(
          Object.entries(editing.results).map(([id, r]) => [
            id,
            { correct: String(r.correct), wrong: String(r.wrong), blank: String(r.blank) },
          ]),
        )
      : emptyResults(type),
  );

  function changeType(id) {
    setTypeId(id);
    setResults(emptyResults(types.find((t) => t.id === id)));
  }

  function setField(sectionId, field, value) {
    setResults((r) => ({ ...r, [sectionId]: { ...r[sectionId], [field]: value } }));
  }

  const totals = examTotals({ results: numericResults(results) });

  async function handleSubmit(event) {
    event.preventDefault();
    const ok = await onSave({ date, name, type: type.id, results: numericResults(results) });
    if (ok && !editing) {
      setName('');
      setResults(emptyResults(type));
    }
  }

  return (
    <form className="card exam-form" onSubmit={handleSubmit}>
      <h2 className="panel-label">{editing ? 'Denemeyi düzenle' : 'Yeni deneme'}</h2>
      {types.length > 1 && (
        <div className="segmented" role="group" aria-label="Deneme türü">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === type.id ? 'active' : undefined}
              aria-pressed={t.id === type.id}
              onClick={() => changeType(t.id)}
              disabled={Boolean(editing)}
            >
              {t.id}
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
            <th scope="col">Doğru</th>
            <th scope="col">Yanlış</th>
            <th scope="col">Boş</th>
            <th scope="col">Net</th>
          </tr>
        </thead>
        <tbody>
          {type.sections.map((s) => {
            const r = results[s.id] ?? { correct: '', wrong: '', blank: '' };
            const used = toNumber(r.correct) + toNumber(r.wrong) + toNumber(r.blank);
            return (
              <tr key={s.id} className={used > s.count ? 'over' : undefined}>
                <th scope="row">
                  {s.label}
                  <span className="muted"> {s.count} soru</span>
                </th>
                {['correct', 'wrong', 'blank'].map((field) => (
                  <td key={field}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={s.count}
                      value={r[field]}
                      aria-label={`${s.label} ${{ correct: 'doğru', wrong: 'yanlış', blank: 'boş' }[field]}`}
                      onChange={(e) => setField(s.id, field, e.target.value)}
                    />
                  </td>
                ))}
                <td className="exam-net">{formatNet(sectionNet({ correct: toNumber(r.correct), wrong: toNumber(r.wrong) }))}</td>
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

// Deneme sınavları: sonuç girişi, toplam net grafiği, en zayıf bölüm ve geçmiş denemeler
export default function Exams() {
  const { track } = useTrack();
  const types = examTypesFor(track);
  const [exams, setExams] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [chartType, setChartType] = useState(types[0]?.id);

  const load = useCallback(async () => {
    try {
      setExams(await apiFetch('/api/exams'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(body) {
    setError(null);
    try {
      if (editing) await apiFetch(`/api/exams/${editing.id}`, { method: 'PUT', body });
      else await apiFetch('/api/exams', { method: 'POST', body });
      setEditing(null);
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function remove(exam) {
    if (!window.confirm(`${formatDate(exam.date)} tarihli ${exam.type} denemesi silinsin mi?`)) return;
    setError(null);
    try {
      await apiFetch(`/api/exams/${exam.id}`, { method: 'DELETE' });
      if (editing?.id === exam.id) setEditing(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const chartType_ = types.find((t) => t.id === chartType) ?? types[0];
  const series = useMemo(
    () =>
      (exams ?? [])
        .filter((e) => e.type === chartType_?.id)
        .slice()
        .reverse()
        .map((e) => ({ date: e.date, net: e.totals.net })),
    [exams, chartType_],
  );
  const weak = chartType_ && exams ? weakestSection(chartType_, exams) : null;
  const lastTwo = series.slice(-2);

  return (
    <section className="exams-page">
      <h1>Denemeler</h1>
      <p className="muted lede">
        Deneme sonuçlarını bölüm bölüm gir; net (doğru − yanlış / 4) kendiliğinden hesaplanır. Netinin zaman
        içindeki değişimini ve en çok zorlandığın bölümü aşağıda görürsün.
      </p>
      <ErrorBanner message={error} />

      <ExamForm
        key={editing ? `edit-${editing.id}` : 'new'}
        types={types}
        editing={editing}
        onSave={save}
        onCancel={() => setEditing(null)}
      />

      {exams && exams.length > 0 && (
        <>
          {types.length > 1 && (
            <div className="range-buttons exam-switch" role="group" aria-label="Grafikteki deneme türü">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={t.id === chartType_.id ? undefined : 'secondary'}
                  aria-pressed={t.id === chartType_.id}
                  onClick={() => setChartType(t.id)}
                >
                  {t.id}
                </button>
              ))}
            </div>
          )}
          <div className="panels">
            <article className="panel">
              <h2 className="panel-label">Son {chartType_.id} neti</h2>
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
                <p className="panel-note">Henüz {chartType_.id} denemesi yok.</p>
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
                <p className="panel-note">En az iki deneme girince burada görünür.</p>
              )}
            </article>
          </div>

          <ChartCard
            title={`${chartType_.id} toplam neti`}
            subtitle="Denemeler tarih sırasıyla"
            empty={series.length === 0}
            emptyText={`Henüz ${chartType_.id} denemesi yok.`}
            headers={['Tarih', 'Net']}
            rows={series.map((d) => [formatDate(d.date), formatNet(d.net)])}
          >
            <NetLine days={series} ariaLabel={`${chartType_.id} denemelerinin toplam neti`} />
          </ChartCard>

          <h2>Geçmiş denemeler</h2>
          <ul className="list exam-list">
            {exams.map((e) => (
              <li key={e.id} className={editing?.id === e.id ? 'is-editing' : undefined}>
                <span className="exam-when">
                  {formatDate(e.date)} <span className="badge">{e.type}</span>
                </span>
                <span className="exam-name">
                  {e.name || 'Deneme'}
                  <span className="muted">
                    {' '}
                    {e.totals.correct} D · {e.totals.wrong} Y · {e.totals.blank} B
                  </span>
                </span>
                <strong className="exam-total">{formatNet(e.totals.net)} net</strong>
                <span className="actions">
                  <button type="button" className="secondary small" onClick={() => setEditing(e)}>
                    Düzenle
                  </button>
                  <button type="button" className="secondary small" onClick={() => remove(e)}>
                    Sil
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {exams?.length === 0 && (
        <EmptyState
          Doodle={EmptyNote}
          title="Henüz deneme yok"
          hint="İlk denemenin sonuçlarını yukarıdan gir; netinin gidişatı burada çizilir."
        />
      )}
    </section>
  );
}
