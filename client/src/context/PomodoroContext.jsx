import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api.js';
import { celebrate, notify } from '../lib/celebrate.js';
import { breakAfter, breakTip, eyeReminderIndex, loadBreakSettings, nextStreak, saveBreakSettings } from '../lib/breaks.js';
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
  // Mola sağlığı ayarları (uzun mola, 20-20-20) ve art arda tur serisi
  const [breakSettings, setBreakSettings] = useState(loadBreakSettings);
  const streak = useRef(null); // { count, lastEndedAtMs }
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
      celebrate(null, 'Bir pomodoro daha bitti, çalışma kaydedildi.');
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
        distractions: phase.distractions ?? 0,
      };
      // Her 4. turdan sonra uzun mola (ayarlanabilir); molada küçük bir öneri gösterilir
      const next = breakAfter(phase.round ?? 1, settings.breakMinutes, breakSettings);
      streak.current = { count: phase.round ?? 1, lastEndedAtMs: Date.now() };
      setPhase({
        kind: 'break',
        startedAtMs: Date.now(),
        durationSeconds: next.minutes * 60,
        long: next.long,
        round: phase.round ?? 1,
        tip: breakTip(next.long, Math.floor(Date.now() / 1000)),
      });
      setNow(Date.now());
      saveSession(payload);
      if (phase.planId) {
        apiFetch(`/api/plans/${phase.planId}/done`, {
          method: 'PUT',
          body: { date: phase.planDate, done: true },
        }).catch(() => {});
      }
    } else {
      // Uzun moladan sonra seri baştan başlar
      streak.current = phase.long ? null : { count: phase.round ?? 0, lastEndedAtMs: Date.now() };
      setPhase(null);
      setNotice('Mola bitti. Yeni bir tur başlatabilirsin.');
    }
  }, [phase, remaining, settings.breakMinutes, breakSettings, saveSession]);

  // Odak: çalışma turunda sekmeden/uygulamadan çıkılan her sefer sayılır (tur kaydına yazılır)
  const working = phase?.kind === 'work';
  useEffect(() => {
    if (!working) return undefined;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setPhase((p) => (p?.kind === 'work' ? { ...p, distractions: (p.distractions ?? 0) + 1 } : p));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [working]);

  // 20-20-20: uzun turlarda her 20 dakikada bir göz molası hatırlatması
  useEffect(() => {
    if (!phase || phase.kind !== 'work' || !breakSettings.eyeReminder || remaining === null) return;
    const index = eyeReminderIndex(phase.durationSeconds - remaining, phase.durationSeconds);
    if (index > (phase.eyeIndex ?? 0)) {
      setPhase((p) => ({ ...p, eyeIndex: index }));
      notify('Göz molası: 20 saniye boyunca 6 metre uzağa bak.');
    }
  }, [phase, remaining, breakSettings.eyeReminder]);

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
    ({ subjectId, topicId, planId = null, planDate = null }) => {
      // Tarayıcı sesi ancak bir tıklamayla açar: "Başlat"a basıldığı anda ses motoru hazırlanır
      player.current.unlock();
      setNotice(null);
      setNow(Date.now());
      const now = Date.now();
      setPhase({
        kind: 'work',
        startedAtMs: now,
        durationSeconds: settings.workMinutes * 60,
        subjectId,
        topicId,
        // Serideki kaçıncı tur (uzun mola bununla belirlenir), dikkat sayacı, son göz hatırlatması
        round: nextStreak(streak.current, now) + 1,
        distractions: 0,
        eyeIndex: 0,
        // Haftalık programdaki bir bloktan başlatıldıysa: tur bitince o blok bugün için "yapıldı" olur
        planId,
        planDate,
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

  const updateBreakSettings = useCallback((next) => {
    setBreakSettings(next);
    saveBreakSettings(next);
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
    breakSettings,
    updateBreakSettings,
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
