import { afterEach, describe, it, expect, vi } from "vitest";
import {
  backupFileName,
  hasBackupForDay,
  isBackupFileName,
  namesToDelete,
  needsReminder,
  readLastBackup,
  writeLastBackup,
} from "../src/lib/backup.js";

describe("backupFileName", () => {
  it("yerel güne göre ad üretir (gece 00:30 UTC'ye kaymaz)", () => {
    expect(backupFileName(new Date(2026, 9, 13, 0, 30))).toBe("yedek-2026-10-13.json");
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe("yedek-2026-01-05.json");
  });
});

describe("isBackupFileName", () => {
  it("yalnızca yedek-YYYY-AA-GG.json desenini kabul eder", () => {
    expect(isBackupFileName("yedek-2026-10-13.json")).toBe(true);
    expect(isBackupFileName("yedek-notlar.json")).toBe(false);
    expect(isBackupFileName("yedek-2026-10-13.json.bak")).toBe(false);
    expect(isBackupFileName("yedek-2026-13-45.json")).toBe(false);
    expect(isBackupFileName("foto.png")).toBe(false);
  });
});

describe("hasBackupForDay", () => {
  const today = new Date(2026, 9, 13, 9, 0);
  it("bugünün yedeği listede varsa true", () => {
    expect(hasBackupForDay(["yedek-2026-10-12.json", "yedek-2026-10-13.json"], today)).toBe(true);
  });
  it("yoksa false", () => {
    expect(hasBackupForDay(["yedek-2026-10-12.json", "notlar.txt"], today)).toBe(false);
  });
});

describe("namesToDelete", () => {
  const days = Array.from({ length: 16 }, (_, i) => `yedek-2026-09-${String(i + 1).padStart(2, "0")}.json`);
  it("en yeni 14'ü tutar, en eski geçerli yedekleri siler; başka dosyaya dokunmaz", () => {
    const result = namesToDelete([...days, "notlar.txt"]);
    expect(result.sort()).toEqual(["yedek-2026-09-01.json", "yedek-2026-09-02.json"]);
  });
  it("14 ya da daha azında boş döner", () => {
    expect(namesToDelete(days.slice(0, 14))).toEqual([]);
    expect(namesToDelete([])).toEqual([]);
  });
});

describe("needsReminder", () => {
  const now = new Date(2026, 9, 13, 12, 0);
  const daysBefore = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
  it("hiç yedek yoksa true", () => expect(needsReminder(null, now)).toBe(true));
  it("6 gün önceyse false", () => expect(needsReminder(daysBefore(6), now)).toBe(false));
  it("8 gün önceyse true", () => expect(needsReminder(daysBefore(8), now)).toBe(true));
  it("geçersiz tarih metninde true", () => expect(needsReminder("abc", now)).toBe(true));
});

describe("son yedek tarihi (localStorage)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("yazılan tarih geri okunur", () => {
    const store = {};
    vi.stubGlobal("localStorage", {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = v;
      },
    });
    writeLastBackup(new Date(Date.UTC(2026, 9, 13, 9, 0)));
    expect(readLastBackup()).toBe("2026-10-13T09:00:00.000Z");
  });

  it("localStorage erişilemezse çökmez: okuma null, yazma sessiz", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("erişim yok");
      },
      setItem: () => {
        throw new Error("erişim yok");
      },
    });
    expect(readLastBackup()).toBeNull();
    expect(() => writeLastBackup()).not.toThrow();
  });
});
