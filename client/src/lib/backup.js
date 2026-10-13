import { toLocalDateString } from "./dates.js";

// Klasörde tutulan en yeni yedek sayısı
export const BACKUP_KEEP = 14;
// Bu kadar günden eski (ya da hiç olmayan) yedek için hatırlatma çıkar
export const REMINDER_DAYS = 7;

const NAME_PATTERN = /^yedek-(\d{4})-(\d{2})-(\d{2})\.json$/;

// 'yedek-YYYY-AA-GG.json' (yerel gün: gece 00:30'da UTC'nin önceki günü kullanılmaz)
export function backupFileName(date) {
  return `yedek-${toLocalDateString(date)}.json`;
}

// Yalnızca bizim ürettiğimiz desendeki (gerçek bir tarih taşıyan) adlar yedek sayılır
export function isBackupFileName(name) {
  const match = NAME_PATTERN.exec(name);
  if (!match) return false;
  const [, , month, day] = match.map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

// Verilen günün yedeği klasörde var mı?
export function hasBackupForDay(names, date) {
  return names.includes(backupFileName(date));
}

// Silinecek eski yedekler: geçerli adlar tarihe göre sıralanır (ad zaten tarih sıralıdır),
// en yeni `keep` tanesi kalır. Desene uymayan dosyalar asla listeye girmez.
export function namesToDelete(names, keep = BACKUP_KEEP) {
  const backups = names.filter(isBackupFileName).sort().reverse();
  return backups.slice(keep);
}

// Son yedek yoksa, okunamıyorsa ya da REMINDER_DAYS günden eskiyse true
export function needsReminder(lastBackupIso, now = new Date()) {
  if (!lastBackupIso) return true;
  const last = new Date(lastBackupIso).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last > REMINDER_DAYS * 24 * 60 * 60 * 1000;
}

export const LAST_BACKUP_KEY = "ders-takip-son-yedek";

// Son yedeğin ISO tarihi; kayıt yoksa ya da localStorage kapalıysa null
export function readLastBackup() {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

// Son yedek anını kaydeder; localStorage kapalıysa sessizce geçilir (yalnızca hatırlatma etkilenir)
export function writeLastBackup(date = new Date()) {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, date.toISOString());
  } catch {
    // kayıt yapılamazsa hatırlatma "yedek yok" gibi davranır
  }
}
