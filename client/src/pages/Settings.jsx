import { useEffect, useState } from 'react';
import { getDatabase } from '../api.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import TrackSwitcher from '../components/TrackSwitcher.jsx';
import { useTrack } from '../context/TrackContext.jsx';
import { useBackup } from '../context/BackupContext.jsx';
import { parseBackupText } from '../data/validation.js';
import { backupFileName, readLastBackup, writeLastBackup } from '../lib/backup.js';
import { persistenceLabel, requestPersistence } from '../lib/persistence.js';

// Ayarlar: çalışma hedefi ve veri güvenliği ile ilgili durum ve işlemler
export default function Settings() {
  const track = useTrack();
  const [persistence, setPersistence] = useState('checking');
  const [lastBackup, setLastBackup] = useState(readLastBackup);
  const [error, setError] = useState(null);
  const folder = useBackup();

  // Klasör yedeği arka planda tamamlanınca "Son yedek" satırı da güncellenir
  useEffect(() => {
    setLastBackup(readLastBackup());
  }, [folder.status]);

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
      // Bazı tarayıcılar indirmeyi hemen iptal etmesin diye adres biraz sonra bırakılır
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      setError(e.message || 'Yedek yüklenemedi');
    }
  }

  return (
    <section>
      <h1>Ayarlar</h1>
      <ErrorBanner message={error ?? track.error} />
      <div className="panels">
        <article className="panel panel-wide">
          <h2 className="panel-label">Çalışma hedefi</h2>
          <p className="muted">
            Dersler, kayıtlar ve grafikler seçili hedefe göre gösterilir. Hedef değiştirince diğer
            hedefin kayıtları silinmez, yalnızca gizlenir; geri dönünce yerinde durur.
          </p>
          <TrackSwitcher detailed />
        </article>
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
        <article className="panel panel-wide">
          <h2 className="panel-label">Yedek klasörü</h2>
          {!folder.supported && (
            <p className="muted">
              Bu tarayıcı klasöre yedeklemeyi desteklemiyor; yukarıdaki indirme yolunu kullan.
            </p>
          )}
          {folder.supported && (
            <>
              <ErrorBanner message={folder.status === 'error' ? folder.message : null} />
              <p>
                {folder.folderName ? `Klasör: ${folder.folderName}` : 'Henüz klasör seçilmedi.'}
                {folder.status === 'ok' && ' — bugünün yedeği hazır.'}
              </p>
              <p className="muted">
                Klasör seçilince her gün ilk açılışta oraya tarihli bir yedek yazılır; son 14 yedek
                tutulur, eskileri silinir.
              </p>
              <p>
                <button type="button" onClick={folder.pickFolder}>
                  Yedek klasörü seç
                </button>{' '}
                {folder.status === 'needs-permission' && (
                  <button type="button" onClick={folder.resume}>
                    Yedeklemeyi sürdür
                  </button>
                )}{' '}
                {folder.folderName && (
                  <button type="button" className="secondary" onClick={folder.removeFolder}>
                    Klasörü kaldır
                  </button>
                )}
              </p>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
