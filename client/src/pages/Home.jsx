import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';

// Karşılama sayfası: sunucuyla bağlantının çalıştığını da gösterir
export default function Home() {
  const [subjects, setSubjects] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/subjects')
      .then(setSubjects)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <section>
      <h1>Ders Çalışma Takibi</h1>
      <p>YKS sayısal hazırlığın için çalışma, soru ve kaynak takibi.</p>
      <ErrorBanner message={error} />
      {subjects && <p className="muted">Sunucuya bağlandı: {subjects.length} ders yüklü.</p>}
    </section>
  );
}
