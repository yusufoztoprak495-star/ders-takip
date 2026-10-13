import { Link } from 'react-router-dom';
import { useBackup } from '../context/BackupContext.jsx';
import { needsReminder, readLastBackup } from '../lib/backup.js';

// Ana sayfada yedek uyarıları: klasör izni düşmüşse "Yedeklemeyi sürdür" düğmesi,
// son yedek yoksa ya da 7 günden eskiyse Ayarlar'a bağlantı
export default function BackupReminder() {
  const { status, resume } = useBackup();

  if (status === 'needs-permission') {
    return (
      <div className="error-banner pending" role="status">
        Yedek klasörü için izin gerekiyor.{' '}
        <button type="button" className="small" onClick={resume}>
          Yedeklemeyi sürdür
        </button>
      </div>
    );
  }
  if (!needsReminder(readLastBackup())) return null;
  return (
    <div className="error-banner pending" role="status">
      Son yedeğin 7 günden eski (ya da hiç yok). <Link to="/ayarlar">Ayarlar'dan yedek al</Link>
    </div>
  );
}
