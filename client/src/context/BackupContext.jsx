import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getDatabase } from '../api.js';
import {
  backupIfDue,
  clearFolderHandle,
  loadFolderHandle,
  saveFolderHandle,
} from '../data/backupFolder.js';
import { writeLastBackup } from '../lib/backup.js';

// Klasör yedeğinin durumu uygulama düzeyinde tutulur: açılışta bir kez günlük yedek denenir,
// Ayarlar ve Ana sayfa aynı durumu okur.
const BackupContext = createContext(null);

export function useBackup() {
  return useContext(BackupContext);
}

// Tarayıcı klasör seçmeyi destekliyor mu? (telefon ve Firefox'ta yok)
const supported = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

// backupIfDue sonucunu ekranda kullanılan duruma çevirir
function statusOf(result) {
  switch (result.status) {
    case 'no-folder':
      return 'no-folder';
    case 'needs-permission':
      return 'needs-permission';
    case 'error':
      return 'error';
    default:
      return 'ok';
  }
}

export function BackupProvider({ children }) {
  // idle: henüz denenmedi / destek yok
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState(null);
  const [folderName, setFolderName] = useState(null);
  const started = useRef(false);
  // Çalışmalar sırayla yapılır (aynı klasöre iki yazma üst üste binmesin) ve ekrana yalnızca
  // en son başlatılanın sonucu yazılır: eski klasörle başlayan bir çalışma yenisini ezmez.
  const queue = useRef(Promise.resolve());
  const latest = useRef(0);

  const run = useCallback((requestPermission) => {
    const id = ++latest.current;
    const task = async () => {
      const result = await backupIfDue({
        loadHandle: loadFolderHandle,
        getSnapshot: () => getDatabase().snapshot(),
        markBackedUp: writeLastBackup,
        requestPermission,
      });
      const handle = await loadFolderHandle();
      if (id !== latest.current) return;
      setStatus(statusOf(result));
      setMessage(result.message ?? null);
      setFolderName(handle ? handle.name : null);
    };
    queue.current = queue.current.then(task, task);
    return queue.current;
  }, []);

  // Açılışta bir kez: klasör seçiliyse ve izin varsa bugünün yedeği alınır
  useEffect(() => {
    if (!supported || started.current) return;
    started.current = true;
    run(false);
  }, [run]);

  const pickFolder = useCallback(async () => {
    let handle;
    try {
      handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (e) {
      // Kullanıcı pencereyi kapattıysa hata değildir
      if (e?.name === 'AbortError') return;
      setStatus('error');
      setMessage(`Klasör seçilemedi: ${e?.message ?? 'bilinmeyen hata'}`);
      return;
    }
    try {
      await saveFolderHandle(handle);
    } catch {
      setStatus('error');
      setMessage('Klasör kaydedilemedi (tarayıcı depolaması kullanılamıyor)');
      return;
    }
    await run(true);
  }, [run]);

  const resume = useCallback(() => run(true), [run]);

  const removeFolder = useCallback(async () => {
    // Sırada bekleyen çalışmaların sonucu kaldırılan klasörün durumunu ezmesin
    latest.current += 1;
    try {
      await clearFolderHandle();
    } catch {
      // silinemezse bir sonraki açılışta yine denenir
    }
    setStatus('no-folder');
    setMessage(null);
    setFolderName(null);
  }, []);

  const value = { supported, status, message, folderName, pickFolder, resume, removeFolder };
  return <BackupContext.Provider value={value}>{children}</BackupContext.Provider>;
}
