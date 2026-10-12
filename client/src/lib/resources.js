// Test kitapları için saf yardımcılar.

// 'Ad (Yayınevi)'; yayınevi yoksa yalnızca ad
export function bookLabel(book) {
  return book.publisher ? `${book.name} (${book.publisher})` : book.name;
}

// Soru kaydında seçilebilecek kitaplar: seçili dersin, elimde olanlar.
// keepId verilirse (kaydı düzenlerken) o kitap bitirdim olsa bile listede kalır; ama başka dersin kitabı gelmez.
export function selectableBooks(books, subjectId, keepId = "") {
  return books.filter(
    (b) =>
      String(b.subjectId) === subjectId &&
      (b.status === "elimde" || String(b.id) === String(keepId)),
  );
}

// Kitap listesini "elimde" ve "bitirdim" olarak ikiye ayırır
export function splitByStatus(books) {
  return {
    active: books.filter((b) => b.status === "elimde"),
    done: books.filter((b) => b.status === "bitirdim"),
  };
}
