import { Link } from 'react-router-dom';
import { needsReminder, readLastBackup } from '../lib/backup.js';

// Son yedek yoksa ya da 7 günden eskiyse Ana sayfada küçük bir uyarı gösterir
export default function BackupReminder() {
  if (!needsReminder(readLastBackup())) return null;
  return (
    <div className="error-banner pending" role="status">
      Son yedeğin 7 günden eski (ya da hiç yok). <Link to="/ayarlar">Ayarlar'dan yedek al</Link>
    </div>
  );
}
