import { useEffect, useState } from 'react';
import { persistenceLabel, requestPersistence } from '../lib/persistence.js';

// Ayarlar: veri güvenliği ile ilgili durum ve işlemler
export default function Settings() {
  const [persistence, setPersistence] = useState('checking');

  useEffect(() => {
    let active = true;
    requestPersistence().then((status) => {
      if (active) setPersistence(status);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <h1>Ayarlar</h1>
      <div className="panels">
        <article className="panel panel-wide">
          <h2 className="panel-label">Veri güvenliği</h2>
          <p>{persistenceLabel(persistence)}</p>
          <p className="muted">
            Kalıcı olursa tarayıcı, disk dolsa bile verilerini kendiliğinden silmez.
          </p>
        </article>
      </div>
    </section>
  );
}
