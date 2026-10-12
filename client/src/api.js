// Sunucudan gelen hata mesajını taşıyan hata (örn. "Ders zorunlu")
export class ApiError extends Error {}

// Sunucuya istek atar. `path` /api ile başlayan yoldur (örn. '/api/subjects').
// Başarısız isteklerde kullanıcıya gösterilebilecek Türkçe bir mesajla hata fırlatır.
export async function apiFetch(path, { method = "GET", body } = {}) {
  const options = { method };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, options);
  } catch {
    // fetch yalnızca ağ hatasında (sunucu kapalı vb.) reddedilir
    throw new Error("Sunucuya ulaşılamıyor");
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? "Bir şeyler ters gitti");
  }
  return data;
}
