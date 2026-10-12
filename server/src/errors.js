// Kullanıcıya gösterilmesi güvenli, durum kodu taşıyan hata
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Eşleşmeyen API yolları için 404
export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Bulunamadı' });
}

// Tüm hatalar buraya düşer. Bilinen hatalar aynen, bilinmeyenler genel mesajla döner;
// iç ayrıntı (stack vb.) kullanıcıya hiçbir zaman gönderilmez.
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  // express.json() bozuk gövdede bu türde bir hata üretir
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Geçersiz JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Bir şeyler ters gitti' });
}
