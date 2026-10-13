import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { todayLocal } from "../../src/lib/dates.js";

function valid(overrides = {}) {
  return {
    name: "Hocalara Geldik Matematik",
    publisher: "Hoca Yayınları",
    subjectId: 3,
    solvedTests: 30,
    status: "elimde",
    ...overrides,
  };
}

// Elle yazılan son çözüm tarihini taklit eder (normalde yalnızca test sayısı artınca yazılır)
async function setLastSolved(app, id, day) {
  const state = await app.snapshot();
  state.resources.find((r) => r.id === id).lastSolvedAt = day;
  await app.replaceAll(state);
}

describe("todayLocal", () => {
  it("YYYY-AA-GG biçiminde yerel günü verir", () => {
    expect(todayLocal(new Date(2026, 9, 5, 23, 59))).toBe("2026-10-05");
    expect(todayLocal(new Date(2026, 0, 1, 0, 1))).toBe("2026-01-01");
  });
});

describe("/api/resources (test kitapları)", () => {
  it("geçerli kitap eklenir (201); toplam test sayısı ya da ilerleme yüzdesi yoktur", async () => {
    const { app } = makeTestApp();
    const res = await request(app).post("/api/resources").send(valid());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      ...valid(),
      lastSolvedAt: todayLocal(),
    });
    expect(res.body).not.toHaveProperty("totalTests");
    expect(res.body).not.toHaveProperty("progressPercent");

    const list = await request(app).get("/api/resources");
    expect(list.body).toHaveLength(1);
  });

  it("solvedTests verilmezse 0, status verilmezse elimde, yayınevi verilmezse boş; son çözüm tarihi null", async () => {
    const { app } = makeTestApp();
    const res = await request(app)
      .post("/api/resources")
      .send({ name: "Kitap", subjectId: 3 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      solvedTests: 0,
      status: "elimde",
      publisher: "",
      lastSolvedAt: null,
    });
  });

  it("eski alanlar (type, totalTests) gönderilse de yok sayılır", async () => {
    const { app } = makeTestApp();
    const res = await request(app)
      .post("/api/resources")
      .send(valid({ type: "video", totalTests: 0 }));
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty("type");
    expect(res.body).not.toHaveProperty("totalTests");
  });

  it.each([
    ["solvedTests negatif", { solvedTests: -1 }],
    ["solvedTests ondalık", { solvedTests: 1.5 }],
    ["solvedTests metin", { solvedTests: "5" }],
    ["solvedTests çok büyük", { solvedTests: 10001 }],
    ["geçersiz durum", { status: "kayip" }],
    ["boş ad", { name: "  " }],
    ["çok uzun yayınevi", { publisher: "x".repeat(101) }],
    ["yayınevi metin değil", { publisher: 5 }],
    ["olmayan ders", { subjectId: 9999 }],
    ["ders eksik", { subjectId: undefined }],
  ])("%s → 400", async (_, overrides) => {
    const { app } = makeTestApp();
    const res = await request(app)
      .post("/api/resources")
      .send(valid(overrides));
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("PUT günceller; solvedTests verilmezse sayaç korunur", async () => {
    const { app } = makeTestApp();
    const { body: created } = await request(app)
      .post("/api/resources")
      .send(valid());
    const res = await request(app)
      .put(`/api/resources/${created.id}`)
      .send(valid({ name: "Yeni Ad", solvedTests: undefined }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Yeni Ad", solvedTests: 30 });
  });

  it("PUT ile durum 'bitirdim' yapılabilir", async () => {
    const { app } = makeTestApp();
    const { body: created } = await request(app)
      .post("/api/resources")
      .send(valid());
    const res = await request(app)
      .put(`/api/resources/${created.id}`)
      .send(valid({ status: "bitirdim" }));
    expect(res.body).toMatchObject({ status: "bitirdim", solvedTests: 30 });
  });

  it("olmayan kaynak: PUT ve DELETE 404", async () => {
    const { app } = makeTestApp();
    expect(
      (await request(app).put("/api/resources/999").send(valid())).status,
    ).toBe(404);
    expect((await request(app).delete("/api/resources/999")).status).toBe(404);
    expect((await request(app).delete("/api/resources/abc")).status).toBe(404);
  });

  it("kitap silinince soru kaydı durur, resourceId boşalır", async () => {
    const { app } = makeTestApp();
    const { body: book } = await request(app)
      .post("/api/resources")
      .send(valid());
    await request(app)
      .post("/api/questions")
      .send({
        date: "2026-10-12",
        subjectId: 3,
        correct: 5,
        wrong: 1,
        blank: 0,
        resourceId: book.id,
      });
    expect(
      (await request(app).delete(`/api/resources/${book.id}`)).status,
    ).toBe(204);
    expect((await app.snapshot()).questions.map((q) => q.resourceId)).toEqual([null]);
  });
});

describe("son çözüm tarihi (lastSolvedAt)", () => {
  it("çözülen test artınca bugüne ayarlanır; aynı kalır ya da azalırsa değişmez", async () => {
    const { app } = makeTestApp();
    const { body: book } = await request(app)
      .post("/api/resources")
      .send(valid({ solvedTests: 0 }));
    expect(book.lastSolvedAt).toBeNull();

    // Eski bir tarih elle yazılır; artış olmayan güncellemeler ona dokunmamalı
    await setLastSolved(app, book.id, "2026-09-01");

    const same = await request(app)
      .put(`/api/resources/${book.id}`)
      .send(valid({ solvedTests: 0 }));
    expect(same.body.lastSolvedAt).toBe("2026-09-01");

    const up = await request(app)
      .put(`/api/resources/${book.id}`)
      .send(valid({ solvedTests: 4 }));
    expect(up.body.lastSolvedAt).toBe(todayLocal());

    await setLastSolved(app, book.id, "2026-09-02");
    const down = await request(app)
      .put(`/api/resources/${book.id}`)
      .send(valid({ solvedTests: 2 }));
    expect(down.body.lastSolvedAt).toBe("2026-09-02");
  });

  it("kitaba bağlı soru kaydının tarihi de sayılır (daha yeniyse o gösterilir)", async () => {
    const { app } = makeTestApp();
    const { body: book } = await request(app)
      .post("/api/resources")
      .send(valid({ solvedTests: 0 }));
    await request(app)
      .post("/api/questions")
      .send({
        date: "2026-10-05",
        subjectId: 3,
        correct: 5,
        wrong: 1,
        blank: 0,
        resourceId: book.id,
      });
    let res = await request(app).get("/api/resources");
    expect(res.body[0].lastSolvedAt).toBe("2026-10-05");

    // Elle yazılan tarih daha yeniyse o kazanır
    await setLastSolved(app, book.id, "2026-10-09");
    res = await request(app).get("/api/resources");
    expect(res.body[0].lastSolvedAt).toBe("2026-10-09");
  });

  it("başka kitabın soru kaydı karışmaz", async () => {
    const { app } = makeTestApp();
    const { body: a } = await request(app)
      .post("/api/resources")
      .send(valid({ solvedTests: 0 }));
    const { body: b } = await request(app)
      .post("/api/resources")
      .send(valid({ name: "B", solvedTests: 0 }));
    await request(app)
      .post("/api/questions")
      .send({
        date: "2026-10-05",
        subjectId: 3,
        correct: 1,
        wrong: 0,
        blank: 0,
        resourceId: a.id,
      });
    const res = await request(app).get("/api/resources");
    expect(res.body.find((r) => r.id === b.id).lastSolvedAt).toBeNull();
  });
});
