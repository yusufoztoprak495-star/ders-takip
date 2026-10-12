import { Link } from 'react-router-dom';

// Sayfa yolu: İlerleme › Matematik › Türev. Son öğe bulunulan sayfadır, bağlantısız yazılır.
export default function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Konum">
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label}>
              {last || !item.to ? (
                <span aria-current={last ? 'page' : undefined}>{item.label}</span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
