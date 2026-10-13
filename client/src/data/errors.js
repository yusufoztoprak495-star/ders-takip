// Kullanıcıya gösterilmesi güvenli, durum kodu taşıyan hata (400 geçersiz girdi, 404 bulunamadı)
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
