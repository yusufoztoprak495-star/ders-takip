import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../api.js';
import DayPicker from './DayPicker.jsx';
import ErrorBanner from './ErrorBanner.jsx';
import { WEEKS, monthLabel, weekLabel } from '../lib/months.js';
import { DAYS, formatClock } from '../lib/schedule.js';
import { subjectLabel } from '../lib/tracks.js';
import { METHODS, availableDays, buildWeekPlan, busyByDayOf, classDays, defaultDays } from '../lib/weekSuggest.js';

// Akıllı öneri → Haftayı planla.
// Adım adım sorar: önce hangi hafta ve hangi günler; sonra ders ders "bu hafta bu dersin amacı ne?"
// (yöntem, oturum süresi, günde kaç oturum, hangi konu kaç gün konu / kaç gün soru); en sonda önizleme.
// "Programa ekle" ile bloklar o haftaya özel çalışma bloğu olarak yazılır. Aynı hafta için yeniden öneri alınırsa
// önceki önerilen bloklar silinip yenileri konur; elle eklenen bloklara dokunulmaz.
// Ders başına seçilen yöntem, süre ve günlük oturum sayısı tarayıcıda hatırlanır (bir sonraki hafta hazır gelir).

const PREFS_KEY = 'haftayi-planla';
const MINUTE_OPTIONS = [30, 45, 60, 75, 90, 120];
const GAP_OPTIONS = [10, 15, 20, 30];
const DAY_COUNT_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7];
const CAP_OPTIONS = [60, 90, 120, 150, 180, 210, 240, 270, 300, 360, 420, 480, 540, 600];
const UNI_TITLE = 'Üniversite dersleri';
const hoursLabel = (m) => (m % 60 ? `${Math.floor(m / 60)},5 saat` : `${m / 60} saat`);

function readPrefs() {
  try {
    const value = JSON.parse(localStorage.getItem(PREFS_KEY));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function writePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage kapalıysa yalnızca hatırlama çalışmaz
  }
}

// Bir dersin başlangıç ayarı: hatırlanan yöntem/süre, konular (bu haftaya atanmış olanlar işaretli)
function initialSubject(subject, topics, week, dayCount, saved) {
  const method = METHODS[saved?.method] ? saved.method : 'ciftDikis';
  const checked = topics.filter((t) => t.week === week);
  const days = defaultDays(method, Math.max(1, checked.length), dayCount);
  return {
    subjectId: subject.id,
    include: checked.length > 0,
    method,
    minutes: MINUTE_OPTIONS.includes(saved?.minutes) ? saved.minutes : 60,
    perDay: [1, 2, 3].includes(saved?.perDay) ? saved.perDay : 1,
    topics: topics.map((t) => ({ id: t.id, title: t.title, week: t.week, on: t.week === week, ...days })),
  };
}

export default function WeekSuggestDialog({ month, initialWeek, todayStr, data, onClose, onApplied, onSwitchToMonth }) {
  const dialogRef = useRef(null);
  const isThisMonth = todayStr.slice(0, 7) === month;
  const [week, setWeek] = useState(initialWeek);
  const [days, setDays] = useState(() => defaultDayList(initialWeek));
  const saved = useMemo(() => readPrefs(), []);
  const [gap, setGap] = useState(GAP_OPTIONS.includes(saved.gap) ? saved.gap : 15);
  // Günlük üst sınır (dakika): okul olan günler ve diğer günler ayrı
  const [schoolCap, setSchoolCap] = useState(CAP_OPTIONS.includes(saved.schoolCap) ? saved.schoolCap : 180);
  const [freeCap, setFreeCap] = useState(CAP_OPTIONS.includes(saved.freeCap) ? saved.freeCap : 360);
  const [afterClasses, setAfterClasses] = useState(saved.afterClasses ?? true);
  const [uniHour, setUniHour] = useState(saved.uniHour ?? true);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [setup, setSetup] = useState(() => buildSetup(initialWeek, defaultDayList(initialWeek)));

  function defaultDayList(w) {
    // Geçmiş günler çıkar; pazar varsayılan olarak boş bırakılır (istenirse işaretlenir)
    const list = availableDays({ month, week: w, fromDate: isThisMonth ? todayStr : null });
    const noSunday = list.filter((d) => d !== 6);
    return noSunday.length > 0 ? noSunday : list;
  }

  // Bu ayın bitmemiş konusu olan dersler, Dersler sayfasındaki sırayla
  function buildSetup(w, dayList) {
    const prefs = readPrefs();
    const open = data.monthPlans.filter((p) => !p.doneAt);
    return data.subjects
      .map((s) => ({ s, topics: open.filter((p) => p.subjectId === s.id).sort((a, b) => a.id - b.id) }))
      .filter((x) => x.topics.length > 0)
      .map(({ s, topics }) => initialSubject(s, topics, w, dayList.length, prefs[s.id]));
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal?.();
  }, []);

  // Hafta değişince günler ve işaretli konular o haftaya göre baştan kurulur
  function changeWeek(w) {
    const list = defaultDayList(w);
    setWeek(w);
    setDays(list);
    setSetup(buildSetup(w, list));
  }

  const subjectOf = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects]);
  const labelOf = (id) => {
    const s = subjectOf.get(id);
    return s ? subjectLabel(s.name, s.examType) : 'Ders';
  };
  const included = setup.filter((x) => x.include);
  const oldAuto = data.weekPlans.filter((p) => p.week === week && p.auto === true).length;
  const sortedDays = [...days].sort((a, b) => a - b);

  function update(subjectId, change) {
    setSetup((list) => list.map((x) => (x.subjectId === subjectId ? { ...x, ...change(x) } : x)));
  }

  function setMethod(subjectId, method) {
    update(subjectId, (x) => {
      const count = Math.max(1, x.topics.filter((t) => t.on).length);
      const d = defaultDays(method, count, sortedDays.length);
      return { method, topics: x.topics.map((t) => ({ ...t, ...d })) };
    });
  }

  function setTopic(subjectId, topicId, change) {
    update(subjectId, (x) => ({ topics: x.topics.map((t) => (t.id === topicId ? { ...t, ...change } : t)) }));
  }

  const schoolDays = useMemo(() => classDays(data.classes), [data.classes]);

  const plan = useMemo(() => {
    const subjects = included.map((x) => ({
      subjectId: x.subjectId,
      perDay: x.perDay,
      minutes: x.minutes,
      topics: x.topics.filter((t) => t.on).map((t) => ({ title: t.title, konu: t.konu, soru: t.soru })),
    }));
    const dailyMaxByDay = {};
    const firstBlocksByDay = {};
    for (const d of sortedDays) {
      const school = schoolDays.includes(d);
      dailyMaxByDay[d] = school ? schoolCap : freeCap;
      if (school && uniHour) firstBlocksByDay[d] = [{ title: UNI_TITLE, minutes: 60 }];
    }
    return buildWeekPlan({
      subjects,
      days: sortedDays,
      busyByDay: busyByDayOf({ week, classes: data.classes, plans: data.plans, weekPlans: data.weekPlans, afterClasses }),
      window: data.win,
      gap,
      dailyMaxByDay,
      firstBlocksByDay,
    });
  }, [included, sortedDays, week, data, gap, schoolDays, schoolCap, freeCap, afterClasses, uniHour]);
  const studyBlocks = plan.blocks.filter((b) => b.type !== 'other').length;

  // Adımlar: 0 = hafta ve günler, 1..n = dersler, n+1 = önizleme
  const lastStep = included.length + 1;
  const current = step >= 1 && step <= included.length ? included[step - 1] : null;

  async function save(blocks, message) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/week-plans/auto', {
        method: 'POST',
        body: {
          month,
          week,
          blocks: blocks.map((b) => ({ day: b.day, start: b.start, end: b.end, kind: b.kind, title: b.title, subjectId: b.subjectId })),
        },
      });
      const prefs = readPrefs();
      for (const x of included) prefs[x.subjectId] = { method: x.method, minutes: x.minutes, perDay: x.perDay };
      Object.assign(prefs, { gap, schoolCap, freeCap, afterClasses, uniHour });
      writePrefs(prefs);
      await onApplied(message);
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="plan-editor suggest-dialog week-suggest" onCancel={onClose} aria-labelledby="ws-title">
      <div className="suggest-body">
        <div className="segmented suggest-tabs" role="tablist" aria-label="Akıllı öneri">
          <button type="button" role="tab" aria-selected="true" className="active">
            Haftayı planla
          </button>
          <button type="button" role="tab" aria-selected="false" onClick={onSwitchToMonth}>
            Aylık öneri
          </button>
        </div>
        <h2 id="ws-title">
          {step === 0 && `Haftayı planla · ${monthLabel(month)}`}
          {current && `${labelOf(current.subjectId)} · bu haftanın amacı`}
          {step === lastStep && `Önizleme · Hafta ${week}`}
        </h2>
        <p className="muted small-note ws-progress">
          Adım {step + 1} / {lastStep + 1}
          {step === lastStep && ` · ${studyBlocks} çalışma oturumu`}
        </p>
        <ErrorBanner message={error} />

        {step === 0 && (
          <>
            <label>
              Hangi hafta
              <select value={week} onChange={(e) => changeWeek(Number(e.target.value))}>
                {Array.from({ length: WEEKS }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Hafta {i + 1} ({weekLabel(month, i + 1)})
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span className="label">Çalışacağın günler</span>
              <DayPicker selected={days} onChange={setDays} label="Çalışacağın günler" />
              <small className="muted">
                {isThisMonth ? 'Geçmiş günler ve pazar işaretsiz geldi. ' : 'Pazar işaretsiz geldi. '}
                Oturumlar ders saatlerinin ve diğer blokların arasındaki boşluklara konur.
              </small>
            </div>
            <div className="row">
              <label>
                {schoolDays.length > 0 ? 'Okul olan günlerde en fazla' : 'Günde en fazla'}
                <select value={schoolDays.length > 0 ? schoolCap : freeCap} onChange={(e) => (schoolDays.length > 0 ? setSchoolCap : setFreeCap)(Number(e.target.value))}>
                  {CAP_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {hoursLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
              {schoolDays.length > 0 && (
                <label>
                  Diğer günlerde en fazla
                  <select value={freeCap} onChange={(e) => setFreeCap(Number(e.target.value))}>
                    {CAP_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {hoursLabel(m)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {schoolDays.length > 0 && (
              <div className="field">
                <label className="check-row">
                  <input type="checkbox" checked={afterClasses} onChange={(e) => setAfterClasses(e.target.checked)} />
                  <span>Okul günlerinde dersler bitince başla (dersler arasındaki boşluklara koyma)</span>
                </label>
                <label className="check-row">
                  <input type="checkbox" checked={uniHour} onChange={(e) => setUniHour(e.target.checked)} />
                  <span>Okul günlerinde üniversite dersleri için 1 saat ayır (YKS süresine sayılmaz)</span>
                </label>
              </div>
            )}
            <label>
              Oturumlar arası mola
              <select value={gap} onChange={(e) => setGap(Number(e.target.value))}>
                {GAP_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} dakika
                  </option>
                ))}
              </select>
            </label>
            {setup.length === 0 ? (
              <p className="notice">Bu ay için bitmemiş konu yok. Önce Aylık Plan’a konu ekle.</p>
            ) : (
              <div className="field">
                <span className="label">Bu hafta çalışacağın dersler</span>
                <ul className="ws-subjects">
                  {setup.map((x) => {
                    const thisWeek = x.topics.filter((t) => t.week === week).length;
                    return (
                      <li key={x.subjectId}>
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={x.include}
                            onChange={(e) => update(x.subjectId, () => ({ include: e.target.checked }))}
                          />
                          <span>
                            <b>{labelOf(x.subjectId)}</b>{' '}
                            <span className="muted">
                              {thisWeek > 0 ? `bu haftaya atanmış ${thisWeek} konu` : `bu haftaya atanmış konu yok (${x.topics.length} açık konu)`}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {oldAuto > 0 && (
              <p className="notice">
                Hafta {week} için daha önce önerilen {oldAuto} blok var; yeni öneriyi eklersen onların yerine geçer.{' '}
                <button type="button" className="text-link" disabled={busy} onClick={() => save([], `Hafta ${week} için önerilen ${oldAuto} blok kaldırıldı.`)}>
                  Önerilenleri kaldır
                </button>
              </p>
            )}
          </>
        )}

        {current && (
          <>
            <div className="field">
              <span className="label">Yöntem</span>
              <div className="segmented" role="group" aria-label="Yöntem">
                {Object.entries(METHODS).map(([id, m]) => (
                  <button
                    key={id}
                    type="button"
                    className={current.method === id ? 'active' : undefined}
                    aria-pressed={current.method === id}
                    onClick={() => setMethod(current.subjectId, id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <small className="muted">{METHODS[current.method].hint}. Konu başına günleri aşağıdan değiştirebilirsin.</small>
            </div>
            <div className="row">
              <label>
                Bir oturum
                <select value={current.minutes} onChange={(e) => update(current.subjectId, () => ({ minutes: Number(e.target.value) }))}>
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} dakika
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Günde en fazla
                <select value={current.perDay} onChange={(e) => update(current.subjectId, () => ({ perDay: Number(e.target.value) }))}>
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n} oturum
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field">
              <span className="label">Konular (sırasıyla)</span>
              <ul className="ws-topics">
                {current.topics.map((t) => (
                  <li key={t.id} className={t.on ? undefined : 'off'}>
                    <label className="check-row">
                      <input type="checkbox" checked={t.on} onChange={(e) => setTopic(current.subjectId, t.id, { on: e.target.checked })} />
                      <span>
                        <b>{t.title}</b>{' '}
                        <span className="muted">{t.week ? `Hafta ${t.week}` : 'haftası yok'}</span>
                      </span>
                    </label>
                    {t.on && (
                      <span className="ws-days">
                        <label>
                          Konu
                          <select value={t.konu} onChange={(e) => setTopic(current.subjectId, t.id, { konu: Number(e.target.value) })}>
                            {DAY_COUNT_OPTIONS.map((n) => (
                              <option key={n} value={n}>
                                {n} gün
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Soru
                          <select value={t.soru} onChange={(e) => setTopic(current.subjectId, t.id, { soru: Number(e.target.value) })}>
                            {DAY_COUNT_OPTIONS.map((n) => (
                              <option key={n} value={n}>
                                {n} gün
                              </option>
                            ))}
                          </select>
                        </label>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <small className="muted">
                Bu haftaya atanmış konular işaretli geldi. Soru haftasıysa geçen haftanın konusunu işaretle.
              </small>
            </div>
          </>
        )}

        {step === lastStep && (
          <>
            {studyBlocks === 0 ? (
              <p className="notice">Eklenecek oturum çıkmadı: ders, konu ya da gün seçilmemiş olabilir.</p>
            ) : (
              <div className="ws-preview-wrap">
                <table className="ws-preview">
                  <thead>
                    <tr>
                      <th>Gün</th>
                      <th>Saat</th>
                      <th>Ders</th>
                      <th>Ne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.blocks.map((b, i) => (
                      <tr key={i} className={i > 0 && plan.blocks[i - 1].day !== b.day ? 'new-day' : undefined}>
                        <td>{i === 0 || plan.blocks[i - 1].day !== b.day ? DAYS[b.day].name : ''}</td>
                        <td className="ws-time">
                          {formatClock(b.start)}–{formatClock(b.end)}
                        </td>
                        <td>{b.type === 'other' ? 'Üniversite' : labelOf(b.subjectId)}</td>
                        <td>
                          {b.type === 'other' ? (
                            <span className="muted">{b.title}</span>
                          ) : (
                            <>
                              <span className={`ws-kind ws-${b.type}`}>{b.type === 'konu' ? 'Konu' : 'Soru'}</span> {b.topic}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {plan.leftover.length > 0 && (
              <div className="notice">
                <b>{plan.leftover.length} oturum bu haftaya sığmadı:</b>
                <ul className="ws-leftover">
                  {plan.leftover.map((l, i) => (
                    <li key={i}>
                      {labelOf(l.subjectId)} · {l.type === 'konu' ? 'Konu' : 'Soru'}: {l.title}
                    </li>
                  ))}
                </ul>
                <small>Gün ekleyebilir, günlük üst sınırı artırabilir, oturumu kısaltabilir ya da günde oturum sayısını artırabilirsin. Kalanları gelecek hafta planlarsın.</small>
              </div>
            )}
            {oldAuto > 0 && <p className="muted small-note">Hafta {week} için önceki {oldAuto} önerilen blok silinip bunlar konacak.</p>}
          </>
        )}

        <div className="form-actions">
          {step > 0 && (
            <button type="button" className="secondary" onClick={() => setStep(step - 1)} disabled={busy}>
              Geri
            </button>
          )}
          {step < lastStep && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && (included.length === 0 || days.length === 0)}
            >
              {step === 0 ? `Başla (${included.length} ders)` : step === included.length ? 'Önizle' : 'Sonraki ders'}
            </button>
          )}
          {step === lastStep && (
            <button
              type="button"
              disabled={busy || studyBlocks === 0}
              onClick={() => {
                const uni = plan.blocks.length - studyBlocks;
                save(plan.blocks, `Hafta ${week} için ${studyBlocks} çalışma oturumu${uni ? ` ve ${uni} üniversite saati` : ''} eklendi.`);
              }}
            >
              {busy ? 'Ekleniyor…' : `Programa ekle (${plan.blocks.length} blok)`}
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose} disabled={busy}>
            Kapat
          </button>
        </div>
      </div>
    </dialog>
  );
}
