// Hata mesajını sayfanın üstünde gösterir; mesaj yoksa hiçbir şey çizmez
export default function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      {message}
    </div>
  );
}
