// Bugünün yerel günü 'YYYY-AA-GG' olarak (sunucu kullanıcının kendi bilgisayarında çalışır,
// yerel saat dilimi doğru günü verir). `now` testlerde sabit bir an vermek içindir.
export function todayLocal(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
