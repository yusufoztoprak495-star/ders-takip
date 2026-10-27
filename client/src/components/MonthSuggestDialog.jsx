import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { monthLabel, shiftMonth } from '../lib/months.js';
import { FIRST_PART, buildSuggestions, firstPart } from '../lib/monthSuggest.js';
import { subjectLabel } from '../lib/tracks.js';
import ErrorBanner from './ErrorBanner.jsx';

// Akıllı öneri: aylık plana göre ne yapılacağını söyler.
//  - Bu ayın bitmemiş konusu varsa: kaç konu kaldığını söyler, konuları haftalara dağıtmayı önerir.
//  - Bu ayın hepsi bittiyse: önceki aydan bitmeyenleri, önceki ayı tekrarı ve sonraki ayı öne çekmeyi sırayla sorar.
//    Her grupta sıradaki ilk 5 konu işaretli gelir; istediğini işaretleyip ekler.
export default function MonthSuggestDialog({ month, current, subjects, onClose, onChanged, onDistribute, onSwitchToWeek }) {
  const dialogRef = useRef(null);
  const [others, setOthers] = useState(null); // { previous, next }
  const [picked, setPicked] = useState({}); // grup kimliği → kullanıcının değiştirdiği seçim (Set)
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchOthers = useCallback(async () => {
    try {
      const [previous, next] = await Promise.all([
        apiFetch(`/api/month-plans?month=${shiftMonth(month, -1)}`),
        apiFetch(`/api/month-plans?month=${shiftMonth(month, 1)}`),
      ]);
      setOthers({ previous, next });
    } catch (e) {
      setError(e.message);
    }
  }, [month]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal?.();
    fetchOthers();
  }, [fetchOthers]);

  const subjectName = useMemo(() => new Map(subjects.map((s) => [s.id, subjectLabel(s.name, s.examType)])), [subjects]);
  const result = useMemo(
    () =>
      others
        ? buildSuggestions({ current, previous: others.previous, next: others.next, subjectOrder: subjects.map((s) => s.id) })
        : null,
    [others, current, subjects],
  );

  // Kullanıcı dokunmadıysa ilk kısım işaretlidir
  const selectedOf = (group) => picked[group.id] ?? new Set(firstPart(group.items));
  const chosenOf = (group) => group.items.filter((item) => selectedOf(group).has(item.id));

  function toggle(group, id) {
    const next = new Set(selectedOf(group));
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked((p) => ({ ...p, [group.id]: next }));
  }

  async function apply(group) {
    const ids = chosenOf(group).map((item) => item.id);
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/month-plans/carry', { method: 'POST', body: { month, ids, mode: group.mode } });
      const verb = group.mode === 'copy' ? 'tekrar için eklendi' : 'bu aya alındı';
      await Promise.all([onChanged(`${ids.length} konu ${verb}.`), fetchOthers()]);
      setPicked((p) => ({ ...p, [group.id]: undefined }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function distribute() {
    setBusy(true);
    setError(null);
    try {
      await onDistribute();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="plan-editor suggest-dialog" onCancel={onClose} aria-labelledby="suggest-title">
      <div className="suggest-body">
        {onSwitchToWeek && (
          <div className="segmented suggest-tabs" role="tablist" aria-label="Akıllı öneri">
            <button type="button" role="tab" aria-selected="false" onClick={onSwitchToWeek}>
              Haftayı planla
            </button>
            <button type="button" role="tab" aria-selected="true" className="active">
              Aylık öneri
            </button>
          </div>
        )}
        <h2 id="suggest-title">Akıllı öneri · {monthLabel(month)}</h2>
        <ErrorBanner message={error} />
        {!result && !error && <p className="muted">Önceki ve sonraki ayın planına bakıyorum…</p>}

        {result && !result.monthDone && (
          <>
            <p>
              Bu ayın <b>{result.openCount}</b> konusu henüz bitmedi. Hepsini bitirince önceki aydan kalanları, tekrarı
              ve sonraki ayı sorarım.
            </p>
            <p className="muted">
              Şimdilik konuları haftalara paylaştırabilirsin: ders saatlerine ve ortak bloklara göre her haftanın boş
              çalışma süresine oranla dağıtılır.
            </p>
            <div className="form-actions">
              <button type="button" onClick={distribute} disabled={busy}>
                {busy ? 'Dağıtılıyor…' : 'Konuları haftalara dağıt'}
              </button>
              <Link className="button-link secondary" to="/aylik">
                Aylık plana git
              </Link>
              <button type="button" className="secondary" onClick={onClose}>
                Kapat
              </button>
            </div>
          </>
        )}

        {result && result.monthDone && (
          <>
            <p>
              {result.empty ? 'Bu ay için planlı konu yok.' : 'Bu ayın bütün konularını bitirdin.'} İstersen şunlarla
              devam edelim. Her listede sıradaki ilk {FIRST_PART} konu
              işaretli geldi; istediğini değiştir.
            </p>
            {result.groups.length === 0 && (
              <p className="notice">
                Önerecek bir şey bulamadım: önceki ve sonraki ayın planı boş ya da konuların hepsi bu ayda zaten var.{' '}
                <Link className="text-link" to="/aylik">
                  Aylık Plan’dan yeni konu ekleyebilirsin.
                </Link>
              </p>
            )}
            {result.groups.map((group) => {
              const chosen = chosenOf(group);
              return (
                <section key={group.id} className="suggest-group" aria-label={group.title}>
                  <h3>{group.title}</h3>
                  <p className="muted small-note">{group.hint}</p>
                  <ul className="suggest-list">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <label className="check-row">
                          <input type="checkbox" checked={selectedOf(group).has(item.id)} onChange={() => toggle(group, item.id)} />
                          <span>
                            <b>{item.title}</b> <span className="muted">{subjectName.get(item.subjectId)}</span>
                            {item.note && <small className="muted suggest-reason">{item.note}</small>}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className="form-actions">
                    <button type="button" onClick={() => apply(group)} disabled={busy || chosen.length === 0}>
                      {group.mode === 'copy' ? `${chosen.length} konuyu tekrar için ekle` : `${chosen.length} konuyu bu aya al`}
                    </button>
                  </div>
                </section>
              );
            })}
            <div className="form-actions">
              <button type="button" className="secondary" onClick={onClose}>
                Kapat
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
