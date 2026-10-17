// Fotoğraf küçültme: telefon kamerasının 4000 px'lik fotoğrafı ~1400 px'e indirilip WebP (yoksa JPEG)
// olarak sıkıştırılır. Bir soru fotoğrafı böylece birkaç MB yerine ~100-250 KB tutar.
export const MAX_SIDE = 1400;

// Uzun kenarı max'a indiren boyut (küçük görsel büyütülmez)
export function fitSize(width, height, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

export async function compressImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Seçilen dosya bir fotoğraf değil");
  // imageOrientation: telefon fotoğrafının yan dönmüş görünmemesi için EXIF yönü uygulanır
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // saydam PNG'ler JPEG'de siyah olmasın
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  let blob = await toBlob(canvas, "image/webp", 0.72);
  // Safari eski sürümleri WebP yazamaz: PNG döner; o zaman JPEG
  if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", 0.75);
  if (!blob) throw new Error("Fotoğraf işlenemedi");
  return blob;
}
