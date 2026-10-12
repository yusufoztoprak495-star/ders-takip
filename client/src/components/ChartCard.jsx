import { useState } from 'react';
import EmptyState from './EmptyState.jsx';
import { EmptyChart } from './Doodles.jsx';

// Bir grafiğin kartı: başlık, açıklama ve grafik/tablo görünümü arasında geçiş.
// Tablo görünümü her grafiğin eşdeğeridir: renk ya da fare imleciyle okunamayan değerler için.
export default function ChartCard({
  title,
  subtitle,
  empty,
  emptyText = 'Bu aralıkta kayıt yok.',
  headers,
  rows,
  children,
}) {
  const [asTable, setAsTable] = useState(false);

  return (
    <section className="chart-card">
      <header>
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {!empty && (
          <button
            type="button"
            className="secondary small"
            aria-pressed={asTable}
            onClick={() => setAsTable((v) => !v)}
          >
            {asTable ? 'Grafik' : 'Tablo'}
          </button>
        )}
      </header>

      {empty ? (
        <EmptyState Doodle={EmptyChart} title={emptyText} compact />
      ) : asTable ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-box">{children}</div>
      )}
    </section>
  );
}
