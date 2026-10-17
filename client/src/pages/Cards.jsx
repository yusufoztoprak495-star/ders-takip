import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { EmptyNote } from '../components/Doodles.jsx';
import SubjectTopicFields from '../components/SubjectTopicFields.jsx';
import { useSubjectSelection } from '../hooks/useSubjectSelection.js';
import { celebrate } from '../lib/celebrate.js';
import { toLocalDateString } from '../lib/dates.js';
import { formatShortDate } from '../lib/format.js';
import { LEITNER_DAYS, buildQuiz } from '../lib/leitner.js';
import { subjectLabel } from '../lib/tracks.js';

const cardMeta = (c) => [subjectLabel(c.subjectName, c.examType), c.topicName].filter(Boolean).join(' · ');

// --- Çalış: tekrarı gelen kartlar tek tek; çevir, "Bildim" ya da "Bilemedim" ---
function Study({ cards, today, onReviewed }) {
  // Sıra bu oturumda yerelde tutulur: bilinemeyen kart sona eklenir ve yeniden sorulur
  const [queue, setQueue] = useState(() => cards.filter((c) => c.nextReview <= today).map((c) => c.id));
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState(null);
  const busy = useRef(false);
  const current = cards.find((c) => c.id === queue[0]);

  const answer = useCallback(
    async (result, anchor) => {
      if (!current || busy.current) return;
      busy.current = true;
      setError(null);
      try {
        await apiFetch(`/api/cards/${current.id}/review`, { method: 'POST', body: { today, result } });
        setFlipped(false);
        setQueue((q) => (result === 'wrong' ? [...q.slice(1), q[0]] : q.slice(1)));
        if (result === 'right') {
          setDone((n) => n + 1);
          if (queue.length === 1) celebrate(anchor ?? null, 'Bugünkü kartlar bitti!');
        }
        onReviewed();
      } catch (e) {
        setError(e.message);
      } finally {
        busy.current = false;
      }
    },
    [current, today, onReviewed, queue.length],
  );

  // Klavye: Boşluk/Enter çevirir; çevrildikten sonra → bildim, ← bilemedim
  useEffect(() => {
    function onKey(e) {
      if (e.target.closest?.('input, textarea, select, dialog')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && e.key === 'ArrowRight') answer('right');
      else if (flipped && e.key === 'ArrowLeft') answer('wrong');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, answer]);

  if (!current) {
    return (
      <EmptyState
        Doodle={EmptyNote}
        title={done > 0 ? `Bugünlük bu kadar: ${done} kart tekrar ettin` : 'Bugün tekrarı gelen kart yok'}
        hint="Yeni kart eklemek için Kartlar sekmesine geç; mini testle kendini de deneyebilirsin."
      />
    );
  }

  return (
    <div className="study">
      <ErrorBanner message={error} />
      <p className="muted study-progress">
        Kalan {queue.length} kart{done > 0 ? ` · ${done} tanesi tamam` : ''}
      </p>
      <button
        type="button"
        className={`flashcard${flipped ? ' is-flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Kartı ön yüzüne çevir' : 'Kartı çevir, cevabı gör'}
      >
        <span className="flashcard-inner">
          <span className="flashcard-face front">
            <span className="flashcard-meta">{cardMeta(current)}</span>
            <span className="flashcard-text">{current.front}</span>
            <span className="flashcard-hint">Çevirmek için dokun ya da Boşluk</span>
          </span>
          <span className="flashcard-face back" aria-hidden={!flipped}>
            <span className="flashcard-meta">Cevap</span>
            <span className="flashcard-text">{current.back}</span>
            <span className="flashcard-hint">Kutu {current.box} / {LEITNER_DAYS.length}</span>
          </span>
        </span>
      </button>
      <div className="study-actions">
        <button type="button" className="secondary" disabled={!flipped} onClick={(e) => answer('wrong', e.currentTarget)}>
          ← Bilemedim
        </button>
        <button type="button" disabled={!flipped} onClick={(e) => answer('right', e.currentTarget)}>
          Bildim →
        </button>
      </div>
    </div>
  );
}

// --- Kartlar: ekle, düzenle, sil ---
function CardForm({ editing, onSaved, onCancel }) {
  const selection = useSubjectSelection(editing?.subjectId ?? null);
  const [front, setFront] = useState(editing?.front ?? '');
  const [back, setBack] = useState(editing?.back ?? '');
  const [error, setError] = useState(null);
  const frontRef = useRef(null);

  // Düzenlenen kartın konusu, ders listesi yüklenince seçilir
  const { loaded, selectTopic } = selection;
  useEffect(() => {
    if (loaded && editing?.topicId) selectTopic(String(editing.topicId));
  }, [loaded, editing, selectTopic]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    const body = {
      subjectId: Number(selection.subjectId),
      topicId: selection.topicId ? Number(selection.topicId) : null,
      front,
      back,
      today: toLocalDateString(new Date()),
    };
    try {
      if (editing) await apiFetch(`/api/cards/${editing.id}`, { method: 'PUT', body });
      else await apiFetch('/api/cards', { method: 'POST', body });
      setFront('');
      setBack('');
      frontRef.current?.focus(); // art arda kart girmek kolay olsun
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <form className="panel card-form" onSubmit={handleSubmit}>
      <h2 className="panel-label">{editing ? 'Kartı düzenle' : 'Yeni kart'}</h2>
      <ErrorBanner message={error ?? selection.error} />
      <div className="card-form-grid">
        <SubjectTopicFields selection={selection} />
      </div>
      <div className="card-form-grid">
        <label>
          Ön yüz (soru, kavram, formülün adı)
          <textarea ref={frontRef} rows={3} maxLength={500} value={front} onChange={(e) => setFront(e.target.value)} placeholder="Örn. Newton'un 2. yasası" />
        </label>
        <label>
          Arka yüz (cevap, tanım)
          <textarea rows={3} maxLength={1000} value={back} onChange={(e) => setBack(e.target.value)} placeholder="Örn. F = m·a" />
        </label>
      </div>
      <p className="form-actions">
        <button type="submit" disabled={!front.trim() || !back.trim() || selection.subjects.length === 0}>
          {editing ? 'Kaydet' : 'Kartı ekle'}
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

function CardList({ cards, today, onEdit, onDelete }) {
  const [subject, setSubject] = useState('all');
  const subjects = useMemo(() => {
    const map = new Map();
    for (const c of cards) map.set(c.subjectId, subjectLabel(c.subjectName, c.examType));
    return [...map];
  }, [cards]);
  const shown = subject === 'all' ? cards : cards.filter((c) => String(c.subjectId) === subject);
  if (cards.length === 0) return null;
  return (
    <>
      <div className="card-list-head">
        <h2>Kartların</h2>
        <select aria-label="Derse göre süz" value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="all">Tüm dersler ({cards.length})</option>
          {subjects.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <ul className="list card-list">
        {shown.map((c) => (
          <li key={c.id}>
            <span className="card-list-text">
              <b>{c.front}</b>
              <span className="muted"> → {c.back}</span>
              <small className="muted">
                {cardMeta(c)} · kutu {c.box} · {c.nextReview <= today ? 'bugün' : formatShortDate(c.nextReview)}
              </small>
            </span>
            <span className="actions">
              <button type="button" className="secondary small" onClick={() => onEdit(c)}>
                Düzenle
              </button>
              <button type="button" className="secondary small" onClick={() => onDelete(c)}>
                Sil
              </button>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

// --- Mini test: kartlardan çoktan seçmeli sorular ---
function Quiz({ cards, today, onReviewed }) {
  const [subject, setSubject] = useState('all');
  const [count, setCount] = useState(10);
  const [quiz, setQuiz] = useState(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState(null);
  const [requeued, setRequeued] = useState(false);

  const subjects = useMemo(() => {
    const map = new Map();
    for (const c of cards) map.set(c.subjectId, subjectLabel(c.subjectName, c.examType));
    return [...map];
  }, [cards]);
  const pool = subject === 'all' ? cards : cards.filter((c) => String(c.subjectId) === subject);

  function start() {
    const built = buildQuiz(pool, count);
    if (built.length === 0) {
      setError('Mini test için bu seçimde cevapları birbirinden farklı en az 4 kart olmalı.');
      return;
    }
    setError(null);
    setQuiz(built);
    setIndex(0);
    setPicked(null);
    setAnswers([]);
    setRequeued(false);
  }

  function pick(i) {
    if (picked !== null) return;
    setPicked(i);
    setAnswers((list) => [...list, { ...quiz[index], picked: i }]);
  }

  async function requeueWrong() {
    setError(null);
    try {
      for (const a of answers.filter((x) => x.picked !== x.answerIndex)) {
        await apiFetch(`/api/cards/${a.cardId}/review`, { method: 'POST', body: { today, result: 'wrong' } });
      }
      setRequeued(true);
      onReviewed();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!quiz) {
    return (
      <div className="panel quiz-setup">
        <h2 className="panel-label">Mini test</h2>
        <p className="muted">
          Kartlarından çoktan seçmeli sorular: soru kartın ön yüzü, şıklar diğer kartların cevapları. Kart kutularını
          değiştirmez; yanlışlarını istersen sonunda tekrar destesine alırsın.
        </p>
        <ErrorBanner message={error} />
        <div className="quiz-options-row">
          <label>
            Ders
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="all">Tüm dersler ({cards.length})</option>
              {subjects.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Soru sayısı
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 10, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="form-actions">
          <button type="button" onClick={start} disabled={pool.length < 4}>
            Testi başlat
          </button>
        </p>
      </div>
    );
  }

  if (answers.length === quiz.length && picked === null) {
    const right = answers.filter((a) => a.picked === a.answerIndex).length;
    const wrong = answers.filter((a) => a.picked !== a.answerIndex);
    return (
      <div className="panel quiz-result">
        <h2 className="panel-label">Sonuç</h2>
        <p className="quiz-score">
          <b>{right}</b> / {quiz.length} <span className="muted">(%{Math.round((right / quiz.length) * 100)})</span>
        </p>
        <ErrorBanner message={error} />
        {wrong.length > 0 && (
          <ul className="quiz-wrong">
            {wrong.map((a) => (
              <li key={a.cardId}>
                <b>{a.question}</b> → {a.options[a.answerIndex]}
                <span className="muted"> (senin cevabın: {a.options[a.picked]})</span>
              </li>
            ))}
          </ul>
        )}
        <p className="form-actions">
          <button type="button" onClick={() => setQuiz(null)}>
            Yeni test
          </button>
          {wrong.length > 0 && (
            <button type="button" className="secondary" onClick={requeueWrong} disabled={requeued}>
              {requeued ? 'Yanlışlar bugünkü tekrara eklendi' : 'Yanlışları bugün tekrar et'}
            </button>
          )}
        </p>
      </div>
    );
  }

  const q = quiz[index];
  const last = index === quiz.length - 1;
  return (
    <div className="panel quiz">
      <p className="muted quiz-count">
        Soru {index + 1} / {quiz.length}
      </p>
      <h2 className="quiz-question">{q.question}</h2>
      <ol className="quiz-choices">
        {q.options.map((option, i) => {
          const state =
            picked === null ? '' : i === q.answerIndex ? ' is-right' : i === picked ? ' is-wrong' : ' is-dim';
          return (
            <li key={option}>
              <button type="button" className={`quiz-choice${state}`} onClick={() => pick(i)} disabled={picked !== null}>
                <span className="quiz-letter">{'ABCD'[i]}</span>
                {option}
              </button>
            </li>
          );
        })}
      </ol>
      {picked !== null && (
        <p className="form-actions">
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              if (!last) setIndex((n) => n + 1);
            }}
          >
            {last ? 'Sonucu gör' : 'Sonraki soru'}
          </button>
        </p>
      )}
    </div>
  );
}

const TABS = [
  ['study', 'Çalış'],
  ['cards', 'Kartlar'],
  ['quiz', 'Mini test'],
];

export default function Cards() {
  const [cards, setCards] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('study');
  const [editing, setEditing] = useState(null);
  const [studyKey, setStudyKey] = useState(0);
  const today = toLocalDateString(new Date());

  const load = useCallback(async () => {
    try {
      setCards(await apiFetch('/api/cards'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(card) {
    if (!window.confirm('Bu kart silinsin mi?')) return;
    try {
      await apiFetch(`/api/cards/${card.id}`, { method: 'DELETE' });
      if (editing?.id === card.id) setEditing(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const due = (cards ?? []).filter((c) => c.nextReview <= today).length;

  return (
    <section className="cards-page">
      <h1>Bilgi Kartları</h1>
      <p className="muted lede">
        Formülleri, tanımları ve ezber gerektiren bilgileri kartlara yaz. Bildiğin kart bir üst kutuya çıkar ve
        1, 2, 4, 8, 16 gün arayla yeniden gelir; bilemediğin kart ilk kutuya döner.
      </p>
      <ErrorBanner message={error} />
      <div className="segmented cards-tabs" role="tablist" aria-label="Bölüm">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : undefined}
            onClick={() => {
              setTab(id);
              if (id === 'study') setStudyKey((k) => k + 1); // sekmeye dönünce sıra baştan kurulsun
            }}
          >
            {label}
            {id === 'study' && <span className="tab-count">{due}</span>}
            {id === 'cards' && cards && <span className="tab-count">{cards.length}</span>}
          </button>
        ))}
      </div>

      {cards && tab === 'study' && <Study key={studyKey} cards={cards} today={today} onReviewed={load} />}
      {cards && tab === 'cards' && (
        <>
          <CardForm
            key={editing ? `edit-${editing.id}` : 'new'}
            editing={editing}
            onSaved={() => {
              setEditing(null);
              load();
            }}
            onCancel={() => setEditing(null)}
          />
          <CardList
            cards={cards}
            today={today}
            onEdit={(c) => {
              setEditing(c);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onDelete={remove}
          />
        </>
      )}
      {cards && tab === 'quiz' && <Quiz cards={cards} today={today} onReviewed={load} />}
    </section>
  );
}
