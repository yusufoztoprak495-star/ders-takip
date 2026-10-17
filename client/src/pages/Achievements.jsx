import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api.js';
import BadgeGlyph from '../components/BadgeGlyph.jsx';
import Collection from '../components/Collection.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { badgeList } from '../lib/badges.js';
import { rememberBadges } from '../lib/badgeMemory.js';

// Rozetin ilerleme metni: saat ölçülü rozetlerde saat, diğerlerinde sayı
function progressText(b) {
  const fmt = (n) => n.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  if (b.unit === 'saat') return `${fmt(Math.min(b.value, b.target) / 3600)} / ${fmt(b.target / 3600)} saat`;
  return `${fmt(Math.min(b.value, b.target))} / ${fmt(b.target)}`;
}

export default function Achievements() {
  const [facts, setFacts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/achievements')
      .then(setFacts)
      .catch((e) => setError(e.message));
  }, []);

  const badges = useMemo(() => (facts ? badgeList(facts) : []), [facts]);
  // Bu sayfada görülen rozetler artık "yeni" sayılmaz (ana sayfadaki kutlama tekrar etmesin)
  useEffect(() => {
    if (badges.length) rememberBadges(badges.filter((b) => b.earned).map((b) => b.id));
  }, [badges]);

  if (!facts) {
    return (
      <section>
        <h1>Başarılar</h1>
        <ErrorBanner message={error} />
      </section>
    );
  }
  const earned = badges.filter((b) => b.earned);
  // Kazanılanlar önde; kilitliler ilerlemesi en yüksek olandan başlayarak
  const ordered = [...earned, ...badges.filter((b) => !b.earned).sort((a, b) => b.progress - a.progress)];

  return (
    <section className="achievements-page">
      <h1>Başarılar</h1>
      <p className="muted lede">
        {earned.length} / {badges.length} rozet kazandın. Rozetler kayıtlarından hesaplanır; bir şey yapmana gerek yok,
        çalıştıkça açılırlar.
      </p>
      <Collection count={facts.pomodoros} />
      <ul className="badge-grid">
        {ordered.map((b) => (
          <li key={b.id} className={b.earned ? 'badge-card earned' : 'badge-card'}>
            <span className="badge-glyph">
              <BadgeGlyph glyph={b.glyph} />
            </span>
            <span className="badge-text">
              <b>{b.name}</b>
              <span className="muted">{b.hint}</span>
              {!b.earned && (
                <span className="badge-progress">
                  <span className="badge-track" aria-hidden="true">
                    <i style={{ width: `${b.progress * 100}%` }} />
                  </span>
                  <small className="muted">{progressText(b)}</small>
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
