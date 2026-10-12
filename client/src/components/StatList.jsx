import { Link } from 'react-router-dom';

// Satır satır özet listesi (ders ve konu listeleri).
// columns: ilk eleman ad sütununun başlığı, diğerleri hücre başlıkları.
// rows: { key, to?, name, hint?, muted?, cells: (metin | { text, bar })[] }. `bar` 0–100 ise yüzde çubuğu çizer.
// `to` verilirse satır bağlantı olur; `muted` satırı sönük gösterir (verisi olmayan satırlar için).
export default function StatList({ columns, rows }) {
  const style = { '--cols': columns.length - 1 };
  return (
    <div className="stat-list" style={style}>
      <div className="stat-head" aria-hidden="true">
        {columns.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <ul>
        {rows.map((row) => {
          const content = (
            <>
              <span className="stat-name">
                <strong>{row.name}</strong>
                {row.hint && <small className="muted">{row.hint}</small>}
              </span>
              {row.cells.map((cell, i) => {
                const text = typeof cell === 'object' ? cell.text : cell;
                const bar = typeof cell === 'object' ? cell.bar : null;
                return (
                  <span key={columns[i + 1]} className="stat-cell" data-label={columns[i + 1]}>
                    {bar !== null && bar !== undefined && (
                      <span className="stat-bar" aria-hidden="true">
                        <i style={{ width: `${bar}%` }} />
                      </span>
                    )}
                    {text}
                  </span>
                );
              })}
            </>
          );
          return (
            <li key={row.key} className={row.muted ? 'is-muted' : undefined}>
              {row.to ? (
                <Link to={row.to} className="stat-row">
                  {content}
                </Link>
              ) : (
                <div className="stat-row">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
