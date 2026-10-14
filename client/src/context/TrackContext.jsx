import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import { DEFAULT_TRACK } from '../lib/tracks.js';

// Seçili çalışma hedefi (YKS / DGS / Üniversite) tüm sayfalarda ortak.
// Değer veri katmanında saklanır (yedeğe de girer); burada yalnızca ekrana yansıtılır.
const TrackContext = createContext(null);

// İlk açılışta hedef seçme kartı bir kez gösterilir; seçim yapılınca bu işaret konur
const CHOSEN_KEY = 'hedef-secildi';

function readChosen() {
  try {
    return localStorage.getItem(CHOSEN_KEY) === '1';
  } catch {
    return true; // depolama kapalıysa kart her açılışta çıkıp rahatsız etmesin
  }
}

export function TrackProvider({ children }) {
  const [track, setTrackState] = useState(null);
  const [chosen, setChosen] = useState(readChosen);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/settings')
      .then((s) => setTrackState(s.track))
      .catch((e) => {
        setError(e.message);
        setTrackState(DEFAULT_TRACK);
      });
  }, []);

  const markChosen = useCallback(() => {
    setChosen(true);
    try {
      localStorage.setItem(CHOSEN_KEY, '1');
    } catch {
      // kaydedilemezse kart yalnızca bu oturumda kapanır
    }
  }, []);

  // Hedefi değiştirir; başarılıysa sayfalar yeni hedefin verisiyle yeniden yüklenir
  const setTrack = useCallback(
    async (next) => {
      setError(null);
      try {
        const saved = await apiFetch('/api/settings', { method: 'PUT', body: { track: next } });
        setTrackState(saved.track);
        markChosen();
        return true;
      } catch (e) {
        setError(e.message);
        return false;
      }
    },
    [markChosen],
  );

  return (
    <TrackContext.Provider value={{ track, setTrack, chosen, markChosen, error }}>
      {children}
    </TrackContext.Provider>
  );
}

export function useTrack() {
  return useContext(TrackContext);
}
