import { describe, it, expect } from "vitest";
import { createDatabase, StorageError } from "../../src/data/database.js";
import { HttpError } from "../../src/data/errors.js";
import { memoryStorage } from "../../src/data/storage.js";

const session = {
  subjectId: 1,
  topicId: null,
  startedAt: "2026-10-12T10:00:00.000Z",
  durationSeconds: 600,
  entryType: "manual",
};

describe("createDatabase", () => {
  it("ilk açılışta ders ve konu listesini yükler ve kaydeder", async () => {
    const storage = memoryStorage();
    const db = createDatabase(storage);
    const { body } = await db.request("GET", "/api/subjects");
    expect(body).toHaveLength(8);
    // Kaydedilmiş olmalı: yeni bir veritabanı aynı depodan okuyabilir
    const saved = await storage.load();
    expect(saved.subjects).toHaveLength(8);
  });

  it("yazılan veri depoya gider; yeni bir veritabanı onu geri okur (sayfa yenileme)", async () => {
    const storage = memoryStorage();
    await createDatabase(storage).request("POST", "/api/sessions", session);
    const reopened = createDatabase(storage);
    const { body } = await reopened.request("GET", "/api/sessions");
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: 1, durationSeconds: 600 });
  });

  it("bilinmeyen yol 404 HttpError verir", async () => {
    const db = createDatabase(memoryStorage());
    const error = await db.request("GET", "/api/yok").catch((e) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(404);
  });

  it("geçersiz yazma veriyi değiştirmez", async () => {
    const storage = memoryStorage();
    const db = createDatabase(storage);
    await db.request("POST", "/api/sessions", session);
    await db
      .request("POST", "/api/sessions", { ...session, durationSeconds: -5 })
      .catch(() => {});
    const { body } = await db.request("GET", "/api/sessions");
    expect(body).toHaveLength(1);
  });

  it("kaydetme başarısız olursa StorageError verir ve bellekteki veri geri döner", async () => {
    const inner = memoryStorage();
    let failing = false;
    const storage = {
      load: () => inner.load(),
      save: (state) =>
        failing ? Promise.reject(new Error("disk dolu")) : inner.save(state),
    };
    const db = createDatabase(storage);
    await db.request("POST", "/api/sessions", session);

    failing = true;
    const error = await db
      .request("POST", "/api/sessions", session)
      .catch((e) => e);
    expect(error).toBeInstanceOf(StorageError);

    failing = false;
    const { body } = await db.request("GET", "/api/sessions");
    expect(body).toHaveLength(1);
  });

  it("aynı anda gelen yazmalar sırayla işlenir, kimlikler çakışmaz", async () => {
    const db = createDatabase(memoryStorage());
    const results = await Promise.all([
      db.request("POST", "/api/sessions", session),
      db.request("POST", "/api/sessions", session),
      db.request("POST", "/api/sessions", session),
    ]);
    expect(results.map((r) => r.body.id)).toEqual([1, 2, 3]);
  });

  it("başka sekme veriyi değiştirdiyse bir sonraki istekte yeniden okur", async () => {
    const storage = memoryStorage();
    let notify = () => {};
    storage.onExternalChange = (callback) => {
      notify = callback;
    };
    const db = createDatabase(storage);
    await db.request("GET", "/api/sessions");

    // "Başka sekme": aynı depoya doğrudan yazar
    const state = await storage.load();
    state.sessions.push({ id: 1, ...session });
    await storage.save(state);
    notify();

    const { body } = await db.request("GET", "/api/sessions");
    expect(body).toHaveLength(1);
  });

  it("snapshot ve replaceAll: tüm veri alınıp değiştirilebilir", async () => {
    const db = createDatabase(memoryStorage());
    await db.request("POST", "/api/sessions", session);
    const snapshot = await db.snapshot();
    expect(snapshot.sessions).toHaveLength(1);

    await db.replaceAll({ ...snapshot, sessions: [] });
    expect((await db.request("GET", "/api/sessions")).body).toEqual([]);
  });

  it("konu silinince bağlı çalışma kaydı silinmez, konusuz kalır", async () => {
    const db = createDatabase(memoryStorage());
    await db.request("POST", "/api/sessions", { ...session, topicId: 1 });
    await db.request("DELETE", "/api/topics/1");
    const { body } = await db.request("GET", "/api/sessions");
    expect(body).toHaveLength(1);
    expect(body[0].topicId).toBeNull();
  });
});
