import { describe, it, expect, afterEach, vi } from "vitest";
import {
  SOUND_KINDS,
  BAR_SECONDS,
  CHORDS,
  loadSoundSettings,
  saveSoundSettings,
  pianoBar,
  midiToFrequency,
  volumeToGain,
  shouldPlay,
} from "../src/lib/focusSound.js";

// Testlerde rastgelelik sabit olsun diye basit, tohumlu bir sayı üreteci
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("midiToFrequency", () => {
  it("La (A4 = 69) 440 Hz'dir, bir oktav yukarısı iki katıdır", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440);
    expect(midiToFrequency(81)).toBeCloseTo(880);
  });
});

describe("pianoBar", () => {
  it("notalar ölçünün içinde, yumuşak ve akorun seslerinden oluşur", () => {
    const rng = seeded(7);
    for (let bar = 0; bar < 40; bar++) {
      const chord = CHORDS[bar % CHORDS.length];
      const notes = pianoBar(rng, bar);
      expect(notes.length).toBeGreaterThan(0);
      for (const n of notes) {
        expect(n.offset).toBeGreaterThanOrEqual(0);
        expect(n.offset).toBeLessThan(BAR_SECONDS);
        expect(n.velocity).toBeGreaterThan(0);
        expect(n.velocity).toBeLessThanOrEqual(0.6);
        // Her nota akorun bir sesinin herhangi bir oktavı: uyumsuz ses çıkmaz
        expect(chord.tones).toContain(((n.midi % 12) + 12) % 12);
      }
    }
  });

  it("her ölçü bir bas notasıyla, ölçünün başında başlar", () => {
    const notes = pianoBar(seeded(3), 0);
    const bass = notes.find((n) => n.offset === 0);
    expect(bass).toBeDefined();
    expect(bass.midi).toBeLessThan(55);
  });
});

describe("volumeToGain", () => {
  it("0 sessiz, 1 en yüksek; arası kulağa doğal gelsin diye karesiyle artar", () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(1)).toBeCloseTo(1);
    expect(volumeToGain(0.5)).toBeCloseTo(0.25);
    expect(volumeToGain(5)).toBeCloseTo(1);
    expect(volumeToGain(-1)).toBe(0);
  });
});

describe("shouldPlay", () => {
  it("yalnızca çalışma sırasında ve ses açıkken çalar", () => {
    expect(shouldPlay({ kind: "work" }, { kind: "piano" })).toBe(true);
    expect(shouldPlay({ kind: "break" }, { kind: "piano" })).toBe(false);
    expect(shouldPlay(null, { kind: "piano" })).toBe(false);
    expect(shouldPlay({ kind: "work" }, { kind: "off" })).toBe(false);
  });
});

describe("ses ayarları", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubStorage(initial = {}) {
    const store = { ...initial };
    vi.stubGlobal("localStorage", {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
    });
    return store;
  }

  it("kayıt yoksa varsayılan: piyano, orta-düşük ses", () => {
    stubStorage();
    expect(loadSoundSettings()).toEqual({ kind: "piano", volume: 0.5 });
  });

  it("kaydedileni geri okur", () => {
    stubStorage();
    saveSoundSettings({ kind: "rain", volume: 0.3 });
    expect(loadSoundSettings()).toEqual({ kind: "rain", volume: 0.3 });
  });

  it("bilinmeyen ses türü ya da bozuk ses seviyesi varsayılana düşer", () => {
    stubStorage({ "odak.sesi": JSON.stringify({ kind: "metal", volume: 9 }) });
    expect(loadSoundSettings()).toEqual({ kind: "piano", volume: 0.5 });
    stubStorage({ "odak.sesi": "{bozuk" });
    expect(loadSoundSettings()).toEqual({ kind: "piano", volume: 0.5 });
  });

  it("localStorage erişilemezse çökmez", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("engelli");
      },
      setItem: () => {
        throw new Error("engelli");
      },
    });
    expect(loadSoundSettings()).toEqual({ kind: "piano", volume: 0.5 });
    expect(() => saveSoundSettings({ kind: "off", volume: 0 })).not.toThrow();
  });

  it("seçenek listesinde 'Kapalı' var ve kimlikler benzersiz", () => {
    const ids = SOUND_KINDS.map((k) => k.id);
    expect(ids).toContain("off");
    expect(new Set(ids).size).toBe(ids.length);
  });
});
