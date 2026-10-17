// Rozet simgeleri: 32x32 alanda ince çizgili küçük çizimler (Icons.jsx ile aynı dil)
const PATHS = {
  seed: <><path d="M16 26V15" /><path d="M16 17c-5 0-7-3-7-7 4 0 7 2 7 7z" /><path d="M16 15c0-4 3-7 8-7 0 5-3 7-8 7z" /></>,
  tomato: <><circle cx="16" cy="18" r="8.5" /><path d="M12 9.5l4 2 4-2M16 11.5V7" /></>,
  clock: <><circle cx="16" cy="16" r="10" /><path d="M16 10v6l4 3" /></>,
  flame: <path d="M16 27c-5 0-8-3.4-8-7.6C8 14 13 12 13 6c3 2 5 5 5 8 1-1 2-3 2-4 2.5 2.4 4 5.3 4 8.6C24 23.6 21 27 16 27z" />,
  mountain: <><path d="M4 25l8-13 5 7 3-4 8 10z" /><path d="M10.5 14.5l1.5 1.5 1.6-1.6" /></>,
  eye: <><path d="M4 16c3-5.5 7-8 12-8s9 2.5 12 8c-3 5.5-7 8-12 8s-9-2.5-12-8z" /><circle cx="16" cy="16" r="3.5" /></>,
  check: <><rect x="6" y="6" width="20" height="20" rx="2" /><path d="M11 16.5l3.5 3.5 7-8" /></>,
  page: <><path d="M9 5h10l5 5v17H9z" /><path d="M12.5 15h8M12.5 19h8M12.5 23h5" /></>,
  book: <><path d="M6 8c4-1.5 7-1 10 1v17c-3-2-6-2.5-10-1z" /><path d="M26 8c-4-1.5-7-1-10 1v17c3-2 6-2.5 10-1z" /></>,
  target: <><circle cx="16" cy="16" r="10" /><circle cx="16" cy="16" r="5.5" /><circle cx="16" cy="16" r="1.5" /></>,
  cards: <><rect x="10" y="8" width="15" height="18" rx="2" /><path d="M7 22V7a2 2 0 0 1 2-2h11" /></>,
  sun: <><circle cx="16" cy="16" r="5" /><path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2 2M22.5 22.5l2 2M7.5 24.5l2-2M22.5 9.5l2-2" /></>,
  moon: <path d="M21 25A10 10 0 0 1 13 6.5 9 9 0 1 0 25.5 19 10 10 0 0 1 21 25z" />,
};

export default function BadgeGlyph({ glyph }) {
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      {PATHS[glyph] ?? PATHS.seed}
    </svg>
  );
}
