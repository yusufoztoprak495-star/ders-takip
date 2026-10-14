import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api.js';
import { createSingleFlight, formatTime, loadSettings, remainingSeconds, saveSettings } from '../lib/pomodoro.js';
import { loadSoundSettings, saveSoundSettings, shouldPlay } from '../lib/focusSound.js';
import { createFocusPlayer } from '../lib/focusPlayer.js';

// Sayaç durumu sayfada değil uygulama düzeyinde tutulur: Pomodoro çalışırken başka
// sayfaya geçince sayaç ve kaydedilemeyen çalışmalar kaybolmaz.
const PomodoroContext = createContext(null);

export function usePomodoro() {
  return useContext(PomodoroContext);
}

export function PomodoroProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);
  // phase: null (boşta) ya da { kind: 'work' | 'break', startedAtMs, durationSeconds, subjectId, topicId }
  const [phase, setPhase] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  // Sunucuya kaydedilemeyen çalışmalar: yeniden denenebilir
  const [pending, setPending] = useState([]);
  const [notice, setNotice] = useState(null);
  const nextPendingId = useRef(1);
  // Odak sesi: ayar + uygulama boyunca tek bir çalar (sayfa değişse de müzik kesilmez)
  const [sound, setSound] = useState(loadSoundSettings);
  const player = useRef(null);
  if (!player.current) player.current = createFocusPlayer();

  // Sayaç çalışırken saati sık sık okur
  useEffect(() => {
    if (!phase) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  const remaining = phase ? remainingSeconds(phase.startedAtMs, phase.durationSeconds, now) : null;

  const saveSession = useCallback(async (payload) => {
    try {
      await apiFetch('/api/sessions', { method: 'POST', body: payload });
      setNotice('Çalışma kaydedildi.');
    } catch (e) {
      // Süre kaybolmasın diye listede tutulur, kullanıcı tekrar deneyebilir
      const id = nextPendingId.current++;
      setPending((list) => [...list, { id, payload, message: e.message }]);
    }
  }, []);

  // Süre dolunca: çalışma bittiyse kaydet ve molaya geç; mola bittiyse boşa dön
  useEffect(() => {
    if (!phase || remaining !== 0) return;
    if (phase.kind === 'work') {
      const payload = {
        subjectId: phase.subjectId,
        topicId: phase.topicId,
        startedAt: new Date(phase.startedAtMs).toISOString(),
        durationSeconds: phase.durationSeconds,
        entryType: 'pomodoro',
      };
      setPhase({
        kind: 'break',
        startedAtMs: Date.now(),
        durationSeconds: settings.breakMinutes * 60,
      });
      setNow(Date.now());
      saveSession(payload);
    } else {
      setPhase(null);
      setNotice('Mola bitti. Yeni bir tur başlatabilirsin.');
    }
  }, [phase, remaining, settings.breakMinutes, saveSession]);

  // Sekmeyi kapatmadan önce uyar: çalışan sayaç ya da kaydedilmemiş çalışma kaybolmasın
  const unsafeToLeave = phase?.kind === 'work' || pending.length > 0;
  useEffect(() => {
    if (!unsafeToLeave) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsafeToLeave]);

  // Sekme başlığında kalan süre
  useEffect(() => {
    if (!phase) return undefined;
    const original = document.title;
    document.title = `${formatTime(remaining)} · ${phase.kind === 'work' ? 'Çalışma' : 'Mola'}`;
    return () => {
      document.title = original;
    };
  }, [phase, remaining]);

  // Çalışma turunda ve ses açıkken çal; mola, bitiş ya da vazgeçte yavaşça sustur
  const playing = shouldPlay(phase, sound);
  useEffect(() => {
    if (playing) player.current.play(sound.kind, sound.volume);
    else player.current.stop();
  }, [playing, sound.kind, sound.volume]);

  // Uygulama kapanırken (ör. sayfa yenilenince) sesi kes
  useEffect(() => () => player.current.stop(), []);

  const updateSound = useCallback((next) => {
    setSound(next);
    saveSoundSettings(next);
  }, []);

  const start = useCallback(
    ({ subjectId, topicId }) => {
      // Tarayıcı sesi ancak bir tıklamayla açar: "Başlat"a basıldığı anda ses motoru hazırlanır
      player.current.unlock();
      setNotice(null);
      setNow(Date.now());
      setPhase({
        kind: 'work',
        startedAtMs: Date.now(),
        durationSeconds: settings.workMinutes * 60,
        subjectId,
        topicId,
      });
    },
    [settings.workMinutes],
  );

  // Vazgeç: kayıt oluşturmaz
  const cancel = useCallback(() => setPhase(null), []);

  const updateSettings = useCallback((next) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  // Çift tıklamada aynı çalışma iki kez kaydedilmesin: aynı kayıt için tek istek uçuşta olabilir
  const retryOnce = useRef(createSingleFlight());

  const retry = useCallback(
    (id) =>
      retryOnce.current(id, async () => {
        const item = pending.find((p) => p.id === id);
        if (!item) return;
        setPending((list) => list.map((p) => (p.id === id ? { ...p, retrying: true } : p)));
        try {
          await apiFetch('/api/sessions', { method: 'POST', body: item.payload });
          setPending((list) => list.filter((p) => p.id !== id));
          setNotice('Çalışma kaydedildi.');
        } catch (e) {
          setPending((list) =>
            list.map((p) => (p.id === id ? { ...p, retrying: false, message: e.message } : p)),
          );
        }
      }),
    [pending],
  );

  const dismissPending = useCallback((id) => {
    setPending((list) => list.filter((p) => p.id !== id));
  }, []);

  const value = {
    settings,
    updateSettings,
    phase,
    remaining,
    pending,
    notice,
    start,
    cancel,
    retry,
    dismissPending,
    sound,
    updateSound,
  };
  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}
