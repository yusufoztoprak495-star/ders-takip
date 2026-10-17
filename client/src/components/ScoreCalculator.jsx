import { useMemo, useState } from 'react';
import { findExamType, sectionNet } from '../lib/exams.js';
import { RANK_YEAR, SCORE_TYPES, estimateRank, obpContribution, placementScore, rawScore, scoreForRank } from '../lib/yksScore.js';

const KEY = 'puan-hesap';
const numberTr = (n, digits = 2) => n.toLocaleString('tr-TR', { maximumFractionDigits: digits });
const toNumber = (text) => {
  const n = Number(String(text).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

// Kaydedilen girdiler (diploma notu, alan, hedef sıra) bu cihazda hatırlanır
function loadSaved() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && typeof v === 'object') return v;
  } catch {
    // yok
  }
  return {};
}

// Son n denemenin bölüm netleri ortalaması (iki ondalık)
function averageNets(exams, typeId, n = 3) {
  const type = findExamType(typeId);
  const recent = exams.filter((e) => e.type === typeId).slice(0, n);
  if (!type || recent.length === 0) return null;
  return Object.fromEntries(
    type.sections.map((s) => [
      s.id,
      String(Math.round((recent.reduce((sum, e) => sum + sectionNet(e.results[s.id] ?? { correct: 0, wrong: 0 }), 0) / recent.length) * 100) / 100).replace('.', ','),
    ]),
  );
}

function NetInputs({ typeId, values, onChange }) {
  const type = findExamType(typeId);
  return (
    <div className="net-grid">
      {type.sections.map((s) => (
        <label key={s.id}>
          <span>
            {s.label}
            <span className="optional"> / {s.count}</span>
          </span>
          <input type="text" inputMode="decimal" value={values[s.id] ?? ''} placeholder="0" onChange={(e) => onChange({ ...values, [s.id]: e.target.value })} />
        </label>
      ))}
    </div>
  );
}

// YKS puan ve sıralama tahmini: netler elle ya da son denemelerden, diploma notu ile yerleştirme puanı
export default function ScoreCalculator({ exams }) {
  const saved = useMemo(loadSaved, []);
  const [field, setField] = useState(saved.field ?? 'SAY');
  const [diploma, setDiploma] = useState(saved.diploma ?? '80');
  const [placed, setPlaced] = useState(Boolean(saved.placed));
  const [targetRank, setTargetRank] = useState(saved.targetRank ?? '1000');
  const [tyt, setTyt] = useState(() => averageNets(exams, 'TYT') ?? {});
  const fieldType = SCORE_TYPES.find((t) => t.id === field);
  const [ayt, setAyt] = useState(() => averageNets(exams, fieldType.exam) ?? {});

  const remember = (patch) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ field, diploma, placed, targetRank, ...patch }));
    } catch {
      // kaydedilemedi
    }
  };

  function chooseField(id) {
    setField(id);
    remember({ field: id });
    setAyt(averageNets(exams, SCORE_TYPES.find((t) => t.id === id).exam) ?? {});
  }

  function fillFromExams() {
    setTyt(averageNets(exams, 'TYT') ?? {});
    setAyt(averageNets(exams, fieldType.exam) ?? {});
  }

  const nets = {
    tyt: Object.fromEntries(Object.entries(tyt).map(([k, v]) => [k, toNumber(v)])),
    ayt: Object.fromEntries(Object.entries(ayt).map(([k, v]) => [k, toNumber(v)])),
  };
  const diplomaNumber = Math.min(100, Math.max(50, toNumber(diploma) || 50));
  const obp = obpContribution(diplomaNumber, placed);
  const tytRaw = rawScore('TYT', nets);
  const fieldRaw = rawScore(field, nets);
  const results = [
    { id: 'TYT', label: 'TYT', raw: tytRaw },
    { id: field, label: fieldType.label, raw: fieldRaw, blocked: tytRaw < 150 },
  ].map((r) => {
    const placement = placementScore(r.raw, diplomaNumber, placed);
    return { ...r, placement, rank: estimateRank(r.id, placement) };
  });
  const target = Math.max(1, Math.round(toNumber(targetRank)));
  const needed = scoreForRank(field, target);
  const hasTyt = exams.some((e) => e.type === 'TYT');

  return (
    <div className="score-calc">
      <div className="panel score-inputs">
        <div className="score-head">
          <h2 className="panel-label">Netlerin</h2>
          {hasTyt && (
            <button type="button" className="secondary small" onClick={fillFromExams}>
              Son 3 denememin ortalamasıyla doldur
            </button>
          )}
        </div>
        <h3 className="score-sub">TYT</h3>
        <NetInputs typeId="TYT" values={tyt} onChange={setTyt} />
        <div className="score-sub-row">
          <h3 className="score-sub">AYT</h3>
          <div className="segmented" role="group" aria-label="Puan türü">
            {SCORE_TYPES.filter((t) => t.id !== 'TYT').map((t) => (
              <button key={t.id} type="button" className={field === t.id ? 'active' : undefined} aria-pressed={field === t.id} onClick={() => chooseField(t.id)}>
                {t.id === 'SOZ' ? 'SÖZ' : t.id}
              </button>
            ))}
          </div>
        </div>
        <NetInputs typeId={fieldType.exam} values={ayt} onChange={setAyt} />
        <div className="row">
          <label>
            Diploma notu (50–100)
            <input
              type="text"
              inputMode="decimal"
              value={diploma}
              onChange={(e) => {
                setDiploma(e.target.value);
                remember({ diploma: e.target.value });
              }}
            />
          </label>
          <label className="check-row placed-check">
            <input
              type="checkbox"
              checked={placed}
              onChange={(e) => {
                setPlaced(e.target.checked);
                remember({ placed: e.target.checked });
              }}
            />
            <span>Geçen yıl bir programa yerleştim (OBP yarıya iner)</span>
          </label>
        </div>
      </div>

      <div className="score-results">
        {results.map((r) => (
          <article key={r.id} className="panel score-card">
            <h2 className="panel-label">{r.label}</h2>
            {r.blocked ? (
              <p className="panel-note">AYT puanı için TYT ham puanı en az 150 olmalı.</p>
            ) : (
              <>
                <span className="value">{numberTr(r.placement)}</span>
                <p className="panel-note">
                  ham {numberTr(r.raw)} + OBP {numberTr(obp)}
                </p>
                <p className="score-rank">
                  tahmini sıra <b>{r.rank.toLocaleString('tr-TR')}</b>
                </p>
              </>
            )}
          </article>
        ))}
        <article className="panel score-card target-card">
          <h2 className="panel-label">Hedefin</h2>
          <label>
            Başarı sırası
            <input
              type="text"
              inputMode="numeric"
              value={targetRank}
              onChange={(e) => {
                setTargetRank(e.target.value);
                remember({ targetRank: e.target.value });
              }}
            />
          </label>
          <p className="panel-note">
            {RANK_YEAR}'te {fieldType.id === 'SOZ' ? 'SÖZ' : fieldType.id} puan türünde ilk {target.toLocaleString('tr-TR')} için yaklaşık{' '}
            <b>{numberTr(needed)}</b> yerleştirme puanı gerekiyordu; OBP'nle bu <b>{numberTr(Math.max(0, needed - obp))}</b> ham puan demek.
            {results[1].placement >= needed ? (
              <span className="change-up"> Şu anki netlerin yetiyor.</span>
            ) : (
              <span className="change-down"> {numberTr(needed - results[1].placement)} puan eksik.</span>
            )}
          </p>
        </article>
      </div>
      <p className="muted score-disclaimer">
        Bu bir <b>tahmindir</b>. ÖSYM puanları her yıl adayların ortalama ve standart sapmasına göre hesaplar ve katsayıları
        açıklamaz; burada geçmiş yıllardan çıkarılmış yaklaşık katsayılar kullanılıyor. Sıralama, {RANK_YEAR}-YKS yerleştirme
        puanlarının dağılımından aradeğerle bulunur; bu yılın zorluğuna ve aday sayısına göre değişir.
      </p>
    </div>
  );
}
