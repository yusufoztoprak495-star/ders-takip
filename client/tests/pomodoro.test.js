import { describe, it, expect, vi, afterEach } from "vitest";
import {
  remainingSeconds,
  formatTime,
  loadSettings,
  saveSettings,
  createSingleFlight,
} from "../src/lib/pomodoro.js";

describe("remainingSeconds", () => {
  it("geçen süreyi başlangıç anından hesaplar", () => {
    expect(remainingSeconds(0, 1500, 10_000)).toBe(1490);
  });

  it("süre dolunca 0 döner, eksiye düşmez", () => {
    expect(remainingSeconds(0, 1500, 1_500_000)).toBe(0);
    expect(remainingSeconds(0, 1500, 9_999_999)).toBe(0);
  });

  it("sekme arka planda kalıp zaman bir anda atlasa bile doğru hesaplar", () => {
    // Sayaç 600 sn boyunca hiç çalışmadı; sonuç yine başlangıca göre
    expect(remainingSeconds(0, 1500, 600_000)).toBe(900);
  });

  it("kalan süreyi yukarı yuvarlar (0:00 yalnızca süre gerçekten bittiğinde)", () => {
    expect(remainingSeconds(0, 1500, 1_499_500)).toBe(1);
  });
});

describe("formatTime", () => {
  it.each([
    [1490, "24:50"],
    [0, "00:00"],
    [61, "01:01"],
    [3600, "60:00"],
  ])("%i saniye → %s", (seconds, text) => {
    expect(formatTime(seconds)).toBe(text);
  });
});

// Basit bir sahte localStorage
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}

describe("loadSettings / saveSettings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("kayıt yokken varsayılan 25 / 5 döner", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    expect(loadSettings()).toEqual({ workMinutes: 25, breakMinutes: 5 });
  });

  it("kaydedilen ayarı geri okur", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    saveSettings({ workMinutes: 50, breakMinutes: 10 });
    expect(loadSettings()).toEqual({ workMinutes: 50, breakMinutes: 10 });
  });

  it.each([
    ["bozuk JSON", "{bad"],
    ["eksik alan", JSON.stringify({ workMinutes: 30 })],
    ["0 dakika", JSON.stringify({ workMinutes: 0, breakMinutes: 5 })],
    ["negatif dakika", JSON.stringify({ workMinutes: 25, breakMinutes: -5 })],
    ["metin dakika", JSON.stringify({ workMinutes: "25", breakMinutes: 5 })],
    ["ondalık dakika", JSON.stringify({ workMinutes: 25.5, breakMinutes: 5 })],
    ["JSON null", "null"],
  ])("%s varsayılana düşer", (_, stored) => {
    vi.stubGlobal("localStorage", fakeStorage({ "pomodoro.settings": stored }));
    expect(loadSettings()).toEqual({ workMinutes: 25, breakMinutes: 5 });
  });

  it("localStorage erişimi hata fırlatırsa varsayılana düşer", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("erişim yok");
      },
    });
    expect(loadSettings()).toEqual({ workMinutes: 25, breakMinutes: 5 });
  });

  it("saveSettings, localStorage hata fırlatsa bile hata vermez", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("kota dolu");
      },
    });
    expect(() =>
      saveSettings({ workMinutes: 25, breakMinutes: 5 }),
    ).not.toThrow();
  });
});

describe("createSingleFlight (tekrar dene çift tıklama koruması)", () => {
  it("aynı anahtar için eşzamanlı ikinci çağrıyı çalıştırmaz", async () => {
    const run = createSingleFlight();
    let calls = 0;
    let release;
    const slow = () =>
      new Promise((resolve) => {
        calls += 1;
        release = resolve;
      });
    const first = run("a", slow);
    const second = await run("a", slow); // ilki hâlâ sürerken
    expect(second).toBeUndefined();
    expect(calls).toBe(1);
    release("tamam");
    expect(await first).toBe("tamam");
  });

  it("farklı anahtarlar birbirini engellemez", async () => {
    const run = createSingleFlight();
    const results = await Promise.all([run("a", async () => 1), run("b", async () => 2)]);
    expect(results).toEqual([1, 2]);
  });

  it("iş bitince (hatayla bitse bile) anahtar serbest kalır", async () => {
    const run = createSingleFlight();
    await expect(
      run("a", async () => {
        throw new Error("başarısız");
      }),
    ).rejects.toThrow("başarısız");
    expect(await run("a", async () => "yeniden")).toBe("yeniden");
  });
});
