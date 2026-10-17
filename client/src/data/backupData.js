// Yedek dosyasının tamamı: ana veri + hata defteri fotoğrafları ("images": { kimlik: data: adresi }).
// İndirme, klasöre otomatik yedek ve geri yükleme hep buradan geçer.
import { cleanBackupImages } from "./images.js";
import { parseBackupText } from "./validation.js";

export async function collectBackup(db, images) {
  const state = await db.snapshot();
  const pictures = await images.exportAll();
  return Object.keys(pictures).length > 0 ? { ...state, images: pictures } : state;
}

// Önce her şey denetlenir (veri ve fotoğraflar); biri bozuksa hiçbir şey değişmez.
export async function restoreBackupText(text, db, images) {
  const state = parseBackupText(text);
  const pictures = cleanBackupImages(JSON.parse(text).images);
  await db.replaceAll(state);
  await images.replaceAll(pictures);
}
