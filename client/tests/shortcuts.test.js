import { describe, it, expect } from "vitest";
import { SHORTCUTS, shortcutFor, isTypingTarget } from "../src/lib/shortcuts.js";

const key = (k, extra = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...extra });

describe("shortcutFor", () => {
  it("harf tuşlarını sayfalara eşler", () => {
    expect(shortcutFor(key("p"), { exam: true })).toBe("/pomodoro");
    expect(shortcutFor(key("P"), { exam: true })).toBe("/pomodoro"); // büyük harf de olur
    expect(shortcutFor(key("i"), { exam: true })).toBe("/ilerleme");
  });

  it("soru sayfaları yalnızca sınav hedeflerinde açılır", () => {
    expect(shortcutFor(key("s"), { exam: true })).toBe("/sorular");
    expect(shortcutFor(key("s"), { exam: false })).toBeNull();
  });

  it("Ctrl/Cmd/Alt ile basılan tuşlara karışmaz (tarayıcı kısayolları bozulmasın)", () => {
    expect(shortcutFor(key("p", { ctrlKey: true }), { exam: true })).toBeNull();
    expect(shortcutFor(key("p", { metaKey: true }), { exam: true })).toBeNull();
    expect(shortcutFor(key("p", { altKey: true }), { exam: true })).toBeNull();
  });

  it("? yardım penceresini açar; bilinmeyen tuş null", () => {
    expect(shortcutFor(key("?"), { exam: true })).toBe("help");
    expect(shortcutFor(key("x"), { exam: true })).toBeNull();
  });

  it("her kısayolun tuşu tek ve benzersizdir", () => {
    const keys = SHORTCUTS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("isTypingTarget", () => {
  it("yazı alanlarında kısayollar çalışmaz", () => {
    expect(isTypingTarget({ tagName: "INPUT", type: "text" })).toBe(true);
    expect(isTypingTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTypingTarget({ tagName: "SELECT" })).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("onay kutusu, düğme ve boş hedefte çalışır", () => {
    expect(isTypingTarget({ tagName: "INPUT", type: "checkbox" })).toBe(false);
    expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
