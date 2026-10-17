import { useEffect, useRef, useState } from 'react';
import { THEMES } from '../lib/theme.js';

// Temanın küçük önizlemesi: zemin üstünde bir kart, kartta vurgu çizgisi ve ikinci vurgu noktası
function Swatch({ colors: [bg, surface, accent, accent2] }) {
  return (
    <svg className="swatch" viewBox="0 0 40 28" aria-hidden="true">
      <rect width="40" height="28" rx="3" fill={bg} />
      <rect x="7" y="7" width="26" height="14" rx="2" fill={surface} />
      <rect x="11" y="11" width="12" height="2" fill={accent} />
      <rect x="11" y="15" width="8" height="2" fill={accent} opacity="0.45" />
      <circle cx="28" cy="16" r="2.4" fill={accent2} />
    </svg>
  );
}

// Menüdeki tema düğmesi ve açılan tema listesi. Seçim, düğmenin bulunduğu noktadan yayılarak uygulanır.
export default function ThemePicker({ theme, onChoose }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  // Açılınca seçili tema odaklanır; dışarı tıklanınca ya da Esc ile kapanır
  useEffect(() => {
    if (!open) return undefined;
    listRef.current?.querySelector('[aria-checked="true"]')?.focus();
    const onDown = (e) => {
      if (!listRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(id) {
    setOpen(false);
    if (id === theme) return;
    // Yayılmanın merkezi: tema düğmesinin ortası
    const rect = buttonRef.current.getBoundingClientRect();
    onChoose(id, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  // Ok tuşlarıyla listede gezinme (radyo grubu alışkanlığı)
  function onListKey(e) {
    const items = [...listRef.current.querySelectorAll('[role="radio"]')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') items[(i + 1) % items.length].focus();
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') items[(i - 1 + items.length) % items.length].focus();
    else return;
    e.preventDefault();
  }

  return (
    <div className="theme-picker">
      <button
        ref={buttonRef}
        type="button"
        className="theme-toggle"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Tema: ${current.name}. Değiştir`}
        title={`Tema: ${current.name}`}
        onClick={() => setOpen((o) => !o)}
      >
        {/* Düğmede temanın dört rengi dilimli küçük bir daire olarak durur */}
        <span
          className="swatch-dot"
          style={{
            background: `conic-gradient(${current.swatch[2]} 0 25%, ${current.swatch[3]} 0 50%, ${current.swatch[1]} 0 75%, ${current.swatch[0]} 0)`,
          }}
        />
      </button>
      {open && (
        <div ref={listRef} className="theme-menu" role="radiogroup" aria-label="Tema" onKeyDown={onListKey}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === theme}
              tabIndex={t.id === theme ? 0 : -1}
              className="theme-option"
              onClick={() => pick(t.id)}
            >
              <Swatch colors={t.swatch} />
              <span className="theme-text">
                <span className="theme-name">{t.name}</span>
                <span className="theme-hint">{t.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
