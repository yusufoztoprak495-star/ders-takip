import { describe, it, expect, afterEach, vi } from "vitest";
import {
  SOUND_KINDS,
  BAR_SECONDS,
  CHORDS,
  loadSoundSettings,
  saveSoundSettings,
  pianoBar,
  musicBoxBar,
  synthBar,
  SCALE,
  SYNTH_CHORDS,
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

const pc = (midi) => ((midi % 12) + 12) % 12;

describe("pianoBar", () => {
  it("notalar ölçünün içinde ve yumuşak; sol el akor sesleri, sağ el gamın içinde", () => {
    const rng = seeded(7);
    for (let bar = 0; bar < 48; bar++) {
      const chord = CHORDS[bar % CHORDS.length];
      const notes = pianoBar(rng, bar);
      expect(notes.length).toBeGreaterThan(0);
      for (const n of notes) {
        expect(n.offset).toBeGreaterThanOrEqual(0);
        expect(n.offset).toBeLessThan(BAR_SECONDS);
        expect(n.velocity).toBeGreaterThan(0);
        expect(n.velocity).toBeLessThanOrEqual(0.6);
        if (n.hand === "left") expect(chord.tones).toContain(pc(n.midi));
        else expect(SCALE).toContain(pc(n.midi));
      }
    }
  });

  it("her ölçü sol elin bas notasıyla, ölçünün başında başlar", () => {
    const notes = pianoBar(seeded(3), 0);
    const bass = notes.find((n) => n.hand === "left" && n.offset === 0);
    expect(bass).toBeDefined();
    expect(bass.midi).toBeLessThan(55);
  });

  it("ezgi söylenebilir: güçlü vuruştaki notalar akor sesi, sıçramalar en çok bir beşli, aralık 60–81", () => {
    const rng = seeded(11);
    for (let bar = 0; bar < 48; bar++) {
      const chord = CHORDS[bar % CHORDS.length];
      const melody = pianoBar(rng, bar).filter((n) => n.hand === "right");
      melody.forEach((n, i) => {
        expect(n.midi).toBeGreaterThanOrEqual(60);
        expect(n.midi).toBeLessThanOrEqual(81);
        if (Math.abs(n.beat % 2) === 0) expect(chord.tones).toContain(pc(n.midi));
        if (i > 0) expect(Math.abs(n.midi - melody[i - 1].midi)).toBeLessThanOrEqual(7);
      });
    }
  });

  it("dört ölçülük cümlede ilk iki ölçünün ritmi aynı (motif tekrarı), son ölçü daha seyrek (nefes)", () => {
    const rhythm = (bar) => pianoBar(seeded(5), bar).filter((n) => n.hand === "right").map((n) => n.beat);
    for (const start of [0, 4, 8]) {
      expect(rhythm(start + 1)).toEqual(rhythm(start));
      expect(rhythm(start + 3).length).toBeLessThan(rhythm(start).length);
    }
  });
});

describe("musicBoxBar", () => {
  it("tiz, beşli gamda (pentatonik) ve ölçünün içinde; uyumsuz ses yok", () => {
    const rng = seeded(9);
    for (let bar = 0; bar < 24; bar++) {
      const notes = musicBoxBar(rng, bar);
      expect(notes.length).toBeGreaterThanOrEqual(4);
      for (const n of notes) {
        expect(n.offset).toBeGreaterThanOrEqual(0);
        expect(n.offset).toBeLessThan(BAR_SECONDS);
        expect(n.midi).toBeGreaterThanOrEqual(72);
        expect(n.midi).toBeLessThanOrEqual(96);
        expect([0, 2, 4, 7, 9]).toContain(pc(n.midi));
      }
    }
  });
});

describe("synthBar", () => {
  it("16 eşit adımlı arpej akorun seslerinden, ölçü başında ve ortasında bas", () => {
    for (let bar = 0; bar < 8; bar++) {
      const chord = SYNTH_CHORDS[bar % SYNTH_CHORDS.length];
      const { arp, bass } = synthBar(bar);
      expect(arp).toHaveLength(16);
      arp.forEach((n, i) => {
        expect(n.offset).toBeCloseTo((i * BAR_SECONDS) / 16);
        expect(chord.tones).toContain(pc(n.midi));
      });
      expect(bass.map((n) => n.offset)).toEqual([0, BAR_SECONDS / 2]);
      for (const n of bass) expect(n.midi).toBeLessThan(48);
    }
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

  it("müzik kutusu ve gece sentezi de seçilebilir; her seçeneğin grubu var", () => {
    const ids = SOUND_KINDS.map((k) => k.id);
    expect(ids).toEqual(expect.arrayContaining(["musicbox", "synth"]));
    for (const k of SOUND_KINDS.filter((k) => k.id !== "off")) expect(["music", "ambience"]).toContain(k.group);
  });
});
