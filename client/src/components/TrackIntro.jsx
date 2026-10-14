import { useTrack } from '../context/TrackContext.jsx';
import TrackSwitcher from './TrackSwitcher.jsx';

// İlk açılışta bir kez çıkan "Ne için çalışıyorsun?" kartı
export default function TrackIntro() {
  const { chosen, markChosen } = useTrack();
  if (chosen) return null;
  return (
    <article className="panel panel-wide track-intro">
      <h2 className="panel-label">Ne için çalışıyorsun?</h2>
      <p className="muted">
        Seçtiğin hedefe göre dersler ve istatistikler ayrı tutulur. İstediğin zaman Ayarlar'dan
        değiştirebilirsin; diğer hedeflerdeki kayıtların silinmez.
      </p>
      <TrackSwitcher detailed />
      <p>
        <button type="button" className="secondary" onClick={markChosen}>
          Tamam
        </button>
      </p>
    </article>
  );
}
