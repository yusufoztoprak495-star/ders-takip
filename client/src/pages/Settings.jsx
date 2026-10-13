import { useEffect, useState } from 'react';
import { getDatabase } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { HttpError } from '../data/errors.js';
import { parseBackupText } from '../data/validation.js';
import { backupFileName, readLastBackup, writeLastBackup } from '../lib/backup.js';
import { persistenceLabel, requestPersistence } from '../lib/persistence.js';

// Ayarlar: veri güvenliği ile ilgili durum ve işlemler
export default function Settings() {
  const [persistence, setPersistence] = useState('checking');
  const [lastBackup, setLastBackup] = useState(readLastBackup);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    requestPersistence().then((status) => {
      if (active) setPersistence(status);
    });
    return () => {
      active = false;
    };
  }, []);

  // Tüm veriyi JSON dosyası olarak indirir
  async function handleDownload() {
    setError(null);
    try {
      const data = await getDatabase().snapshot();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFileName(new Date());
      link.click();
      URL.revokeObjectURL(url);
      writeLastBackup();
      setLastBackup(readLastBackup());
    } catch (e) {
      setError(e.message || 'Yedek indirilemedi');
    }
  }

  // Seçilen yedek dosyasını doğrular; onaylanırsa mevcut verinin yerine geçirir
  async function handleRestore(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const data = parseBackupText(await file.text());
      if (!window.confirm('Mevcut verilerin yerine geçecek. Devam edilsin mi?')) return;
      await getDatabase().replaceAll(data);
      window.location.reload();
    } catch (e) {
      setError(e instanceof HttpError ? e.message : e.message || 'Yedek yüklenemedi');
    }
  }

  return (
    <section>
      <h1>Ayarlar</h1>
      <ErrorBanner message={error} />
      <div className="panels">
        <article className="panel panel-wide">
          <h2 className="panel-label">Veri güvenliği</h2>
          <p>{persistenceLabel(persistence)}</p>
          <p className="muted">
            Kalıcı olursa tarayıcı, disk dolsa bile verilerini kendiliğinden silmez.
          </p>
        </article>
        <article className="panel panel-wide">
          <h2 className="panel-label">Yedekleme</h2>
          <p>
            Son yedek: {lastBackup ? new Date(lastBackup).toLocaleString('tr-TR') : 'Henüz yedek alınmadı'}
          </p>
          <p>
            <button type="button" onClick={handleDownload}>
              Yedeği indir
            </button>
          </p>
          <p>
            <label>
              Yedekten yükle (mevcut verinin yerine geçer){' '}
              <input type="file" accept=".json,application/json" onChange={handleRestore} />
            </label>
          </p>
        </article>
      </div>
    </section>
  );
}
