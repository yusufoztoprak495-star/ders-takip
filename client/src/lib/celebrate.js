// Küçük kutlama: ekranda konfeti patlaması ve kısa bir mesaj (components/Celebration.jsx çizer).
// Sayfalar yalnızca bu fonksiyonu çağırır; aralarında bağımlılık olmasın diye pencere olayıyla haberleşilir.
// anchor: patlamanın çıkacağı öğe (genelde basılan düğme). Yoksa ekranın üst ortası.
export const CELEBRATE_EVENT = 'ders-takip:kutlama';

export function celebrate(anchor, message) {
  let x = window.innerWidth / 2;
  let y = window.innerHeight * 0.3;
  if (anchor?.getBoundingClientRect) {
    const r = anchor.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  }
  window.dispatchEvent(new CustomEvent(CELEBRATE_EVENT, { detail: { x, y, message } }));
}

// Sessiz bildirim: konfetisiz, yalnızca kısa mesaj (ör. 20-20-20 göz molası hatırlatması)
export function notify(message) {
  window.dispatchEvent(new CustomEvent(CELEBRATE_EVENT, { detail: { x: 0, y: 0, message, quiet: true } }));
}
