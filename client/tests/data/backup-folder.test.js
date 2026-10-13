import { describe, it, expect, vi } from "vitest";
import { backupIfDue, runDailyBackup } from "../../src/data/backupFolder.js";

// Bellek içi sahte klasör: gerçek FileSystemDirectoryHandle'ın kullandığımız yüzeyini taklit eder
function fakeDir(initial = {}, { failWrite = false, failRemove = false } = {}) {
  const files = new Map(Object.entries(initial));
  return {
    files,
    async *keys() {
      yield* [...files.keys()];
    },
    async getFileHandle(name) {
      return {
        async createWritable() {
          let buffer = "";
          return {
            async write(text) {
              if (failWrite) throw new Error("disk dolu");
              buffer += text;
            },
            async close() {
              files.set(name, buffer);
            },
          };
        },
      };
    },
    async removeEntry(name) {
      if (failRemove) throw new Error("NotFoundError");
      files.delete(name);
    },
  };
}

const today = new Date(2026, 9, 13, 9, 0);
const snapshot = async () => ({ subjects: [], topics: [] });

describe("runDailyBackup", () => {
  it("klasör boşken bugünün yedeğini yazar", async () => {
    const dir = fakeDir();
    const result = await runDailyBackup(dir, snapshot, today);
    expect(result.status).toBe("written");
    expect(JSON.parse(dir.files.get("yedek-2026-10-13.json"))).toEqual({
      subjects: [],
      topics: [],
    });
  });

  it("bugünün yedeği varsa dokunmaz ve veriyi okumaz", async () => {
    const dir = fakeDir({ "yedek-2026-10-13.json": "{}" });
    const getSnapshot = vi.fn(snapshot);
    const result = await runDailyBackup(dir, getSnapshot, today);
    expect(result.status).toBe("skipped");
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it("14'ü aşınca en eski yedeği siler", async () => {
    const initial = {};
    for (let d = 1; d <= 14; d++)
      initial[`yedek-2026-09-${String(d).padStart(2, "0")}.json`] = "{}";
    const dir = fakeDir(initial);
    const result = await runDailyBackup(dir, snapshot, today);
    expect(result.deleted).toEqual(["yedek-2026-09-01.json"]);
    expect(dir.files.has("yedek-2026-09-01.json")).toBe(false);
    expect(dir.files.size).toBe(14);
  });

  it("desene uymayan dosyalara dokunmaz", async () => {
    const initial = {
      "yedek-notlar.json": "a",
      "yedek-2026-10-13.json.bak": "b",
      "foto.png": "c",
    };
    for (let d = 1; d <= 15; d++)
      initial[`yedek-2026-09-${String(d).padStart(2, "0")}.json`] = "{}";
    const dir = fakeDir(initial);
    await runDailyBackup(dir, snapshot, today);
    expect(dir.files.has("yedek-notlar.json")).toBe(true);
    expect(dir.files.has("yedek-2026-10-13.json.bak")).toBe(true);
    expect(dir.files.has("foto.png")).toBe(true);
  });

  it("yazma başarısız olursa hata verir ve eski yedekler silinmez", async () => {
    const initial = {};
    for (let d = 1; d <= 14; d++)
      initial[`yedek-2026-09-${String(d).padStart(2, "0")}.json`] = "{}";
    const dir = fakeDir(initial, { failWrite: true });
    await expect(runDailyBackup(dir, snapshot, today)).rejects.toThrow(
      "disk dolu",
    );
    expect(dir.files.size).toBe(14);
    expect(dir.files.has("yedek-2026-09-01.json")).toBe(true);
  });
});

describe("eski yedek silinemezse", () => {
  it("bugünün yedeği yazıldığı için yine written döner ve son yedek işaretlenir", async () => {
    const initial = {};
    for (let d = 1; d <= 14; d++)
      initial[`yedek-2026-09-${String(d).padStart(2, "0")}.json`] = "{}";
    const dir = fakeDir(initial, { failRemove: true });
    const result = await runDailyBackup(dir, snapshot, today);
    expect(result.status).toBe("written");
    expect(result.deleted).toEqual([]);
    expect(dir.files.has("yedek-2026-10-13.json")).toBe(true);

    const markBackedUp = vi.fn();
    const handle = {
      ...fakeDir(initial, { failRemove: true }),
      queryPermission: async () => "granted",
    };
    const due = await backupIfDue({
      loadHandle: async () => handle,
      getSnapshot: snapshot,
      now: today,
      markBackedUp,
    });
    expect(due.status).toBe("written");
    expect(markBackedUp).toHaveBeenCalledTimes(1);
  });
});

describe("backupIfDue", () => {
  const base = () => ({
    getSnapshot: snapshot,
    now: today,
    markBackedUp: vi.fn(),
  });
  const handleWith = (dir, permission) => ({
    ...dir,
    keys: dir.keys,
    getFileHandle: dir.getFileHandle,
    removeEntry: dir.removeEntry,
    queryPermission: async () => permission,
    requestPermission: async () => permission,
  });

  it("klasör seçilmemişse no-folder döner", async () => {
    const deps = { ...base(), loadHandle: async () => null };
    expect((await backupIfDue(deps)).status).toBe("no-folder");
    expect(deps.markBackedUp).not.toHaveBeenCalled();
  });

  it("izin yoksa needs-permission döner ve yazmaz", async () => {
    const dir = fakeDir();
    const deps = {
      ...base(),
      loadHandle: async () => handleWith(dir, "prompt"),
    };
    expect((await backupIfDue(deps)).status).toBe("needs-permission");
    expect(dir.files.size).toBe(0);
    expect(deps.markBackedUp).not.toHaveBeenCalled();
  });

  it("izin verilmişse yazar ve markBackedUp'ı bir kez çağırır", async () => {
    const dir = fakeDir();
    const deps = {
      ...base(),
      loadHandle: async () => handleWith(dir, "granted"),
    };
    expect((await backupIfDue(deps)).status).toBe("written");
    expect(deps.markBackedUp).toHaveBeenCalledTimes(1);
  });

  it("yazma hatasında error ve Türkçe mesaj döner", async () => {
    const dir = fakeDir({}, { failWrite: true });
    const deps = {
      ...base(),
      loadHandle: async () => handleWith(dir, "granted"),
    };
    const result = await backupIfDue(deps);
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/Yedek klasörüne yazılamadı/);
    expect(deps.markBackedUp).not.toHaveBeenCalled();
  });
});
