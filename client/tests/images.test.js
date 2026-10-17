import { describe, it, expect } from "vitest";
import { fitSize } from "../src/lib/imageCompress.js";
import { cleanBackupImages, MAX_IMAGE_CHARS } from "../src/data/images.js";
import { memoryImageStore } from "../src/data/images.js";

describe("fitSize", () => {
  it("uzun kenarı sınıra indirir, oranı korur", () => {
    expect(fitSize(4000, 3000, 1400)).toEqual({ width: 1400, height: 1050 });
    expect(fitSize(1000, 3000, 1400)).toEqual({ width: 467, height: 1400 });
  });

  it("zaten küçükse büyütmez", () => {
    expect(fitSize(800, 600, 1400)).toEqual({ width: 800, height: 600 });
  });
});

describe("cleanBackupImages", () => {
  const ok = "data:image/webp;base64,UklGRhAAAABXRUJQ";

  it("geçerli görselleri alır; yoksa boş nesne", () => {
    expect(cleanBackupImages({ "abc12345-img": ok })).toEqual({ "abc12345-img": ok });
    expect(cleanBackupImages(undefined)).toEqual({});
  });

  it("görsel olmayan, çok büyük ya da kimliği bozuk girişleri reddeder", () => {
    expect(() => cleanBackupImages({ "abc12345-img": "data:text/html;base64,PHNjcmlwdD4=" })).toThrow(/görsel/);
    expect(() => cleanBackupImages({ "abc12345-img": "data:image/svg+xml;base64,PHN2Zz4=" })).toThrow(/görsel/);
    expect(() => cleanBackupImages({ "../x": ok })).toThrow(/görsel/);
    expect(() => cleanBackupImages({ "abc12345-img": `data:image/jpeg;base64,${"A".repeat(MAX_IMAGE_CHARS)}` })).toThrow(/görsel/);
    expect(() => cleanBackupImages([ok])).toThrow(/görsel/);
  });

  it("__proto__ gibi anahtarlar nesneyi kirletemez", () => {
    const text = `{"__proto__": "${ok}"}`;
    expect(() => cleanBackupImages(JSON.parse(text))).toThrow(/görsel/);
  });
});

describe("memoryImageStore", () => {
  it("kaydeder, okur, siler, hepsini dışa verir ve değiştirir", async () => {
    const store = memoryImageStore();
    await store.put("a1b2c3d4-x", new Blob(["x"], { type: "image/webp" }));
    expect((await store.get("a1b2c3d4-x")).type).toBe("image/webp");
    expect(Object.keys(await store.exportAll())).toEqual(["a1b2c3d4-x"]);
    await store.replaceAll({ "zzzzzzzz-y": "data:image/jpeg;base64,/9j/" });
    expect(await store.get("a1b2c3d4-x")).toBeNull();
    expect((await store.get("zzzzzzzz-y")).type).toBe("image/jpeg");
    await store.remove("zzzzzzzz-y");
    expect(await store.exportAll()).toEqual({});
  });
});

describe("yedek dosyası: veri + fotoğraflar", () => {
  it("fotoğraflar yedeğe girer ve geri yüklenince yerine gelir; bozuk fotoğraf hiçbir şeyi değiştirmez", async () => {
    const { collectBackup, restoreBackupText } = await import("../src/data/backupData.js");
    const { createDatabase } = await import("../src/data/database.js");
    const { memoryStorage } = await import("../src/data/storage.js");
    const { emptyState, seedIfEmpty } = await import("../src/data/seed.js");
    const seeded = emptyState();
    seedIfEmpty(seeded);
    const db = createDatabase(memoryStorage(seeded));
    const images = memoryImageStore();
    await images.put("abcdefgh-1", new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" }));
    const backup = await collectBackup(db, images);
    expect(backup.images["abcdefgh-1"]).toBe("data:image/webp;base64,AQID");
    const text = JSON.stringify(backup);

    const db2 = createDatabase(memoryStorage(emptyState()));
    const images2 = memoryImageStore();
    await restoreBackupText(text, db2, images2);
    expect(new Uint8Array(await (await images2.get("abcdefgh-1")).arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect((await db2.snapshot()).subjects.length).toBe(seeded.subjects.length);

    const broken = JSON.stringify({ ...backup, images: { "abcdefgh-1": "data:text/html;base64,AA==" } });
    const images3 = memoryImageStore();
    await images3.put("keepkeep-1", new Blob(["x"], { type: "image/png" }));
    await expect(restoreBackupText(broken, db2, images3)).rejects.toThrow(/görsel/);
    expect(await images3.get("keepkeep-1")).not.toBeNull();
  });

  it("fotoğrafsız yedekte images alanı olmaz", async () => {
    const { collectBackup } = await import("../src/data/backupData.js");
    const { createDatabase } = await import("../src/data/database.js");
    const { memoryStorage } = await import("../src/data/storage.js");
    const { emptyState } = await import("../src/data/seed.js");
    const backup = await collectBackup(createDatabase(memoryStorage(emptyState())), memoryImageStore());
    expect(backup).not.toHaveProperty("images");
  });
});
