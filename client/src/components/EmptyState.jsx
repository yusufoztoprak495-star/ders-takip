// Boş durum: büyük bir çizim, kısa bir başlık ve ne yapılacağını söyleyen tek cümle.
// compact: grafik kartları gibi dar yerler için küçük çizim.
export default function EmptyState({ Doodle, title, hint, compact = false, children }) {
  return (
    <div className={compact ? 'empty-state compact' : 'empty-state'}>
      <Doodle width={compact ? 120 : 180} />
      <p className="empty-title">{title}</p>
      {hint && <p className="muted empty-hint">{hint}</p>}
      {children}
    </div>
  );
}
