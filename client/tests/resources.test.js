import { describe, it, expect } from "vitest";
import { bookLabel, selectableBooks, splitByStatus } from "../src/lib/resources.js";

const books = [
  { id: 1, name: "A", publisher: "Hoca", subjectId: 3, status: "elimde" },
  { id: 2, name: "B", publisher: "", subjectId: 3, status: "bitirdim" },
  { id: 3, name: "C", publisher: "Tonguç", subjectId: 4, status: "elimde" },
];

describe("bookLabel", () => {
  it("yayınevi varsa parantez içinde gösterir", () => {
    expect(bookLabel(books[0])).toBe("A (Hoca)");
  });
  it("yayınevi boşsa yalnızca adı gösterir", () => {
    expect(bookLabel(books[1])).toBe("B");
  });
});

describe("selectableBooks", () => {
  it("yalnızca seçilen dersin 'elimde' kitaplarını verir", () => {
    expect(selectableBooks(books, "3").map((b) => b.id)).toEqual([1]);
  });
  it("düzenlenen kaydın kendi kitabı bitirdim olsa da listede kalır", () => {
    expect(selectableBooks(books, "3", "2").map((b) => b.id)).toEqual([1, 2]);
  });
  it("başka dersin kitabı korunmak istense bile gelmez", () => {
    expect(selectableBooks(books, "3", "3").map((b) => b.id)).toEqual([1]);
  });
  it("ders seçilmemişse boş döner", () => {
    expect(selectableBooks(books, "")).toEqual([]);
  });
});

describe("splitByStatus", () => {
  it("elimde ve bitirdim olarak ikiye ayırır, sırayı korur", () => {
    const { active, done } = splitByStatus(books);
    expect(active.map((b) => b.id)).toEqual([1, 3]);
    expect(done.map((b) => b.id)).toEqual([2]);
  });
});
