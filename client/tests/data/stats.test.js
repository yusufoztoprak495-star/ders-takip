import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { netOf } from "../../src/data/stats.js";

// Yerel saatle (saat dilimi fark etmeksizin) bir çalışma kaydı ekler
async function addSession(app, { subjectId = 1, local, seconds }) {
  const res = await request(app)
    .post("/api/sessions")
    .send({
      subjectId,
      startedAt: new Date(...local).toISOString(),
      durationSeconds: seconds,
      entryType: "manual",
    });
  expect(res.status).toBe(201);
}

async function addQuestions(
  app,
  { subjectId = 1, date, correct, wrong, blank },
) {
  const res = await request(app)
    .post("/api/questions")
    .send({ subjectId, date, correct, wrong, blank });
  expect(res.status).toBe(201);
}

describe("GET /api/stats/daily", () => {
  it("veri yokken boş dizi döner", async () => {
    const { app } = makeTestApp();
    const res = await request(app).get(
      "/api/stats/daily?from=2026-10-01&to=2026-10-31",
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("aynı günün çalışma ve soru kayıtlarını toplar, net toplamdan hesaplanır", async () => {
    const { app } = makeTestApp();
    await addSession(app, { local: [2026, 9, 12, 10], seconds: 600 });
    await addSession(app, { local: [2026, 9, 12, 15], seconds: 900 });
    await addQuestions(app, {
      date: "2026-10-12",
      correct: 6,
      wrong: 2,
      blank: 2,
    });
    await addQuestions(app, {
      date: "2026-10-12",
      correct: 4,
      wrong: 2,
      blank: 0,
    });
    // Yalnızca soru çözülen gün ve yalnızca çalışılan gün
    await addQuestions(app, {
      date: "2026-10-11",
      correct: 1,
      wrong: 0,
      blank: 0,
    });
    await addSession(app, { local: [2026, 9, 13, 9], seconds: 300 });

    const res = await request(app).get(
      "/api/stats/daily?from=2026-10-11&to=2026-10-13",
    );
    expect(res.body).toEqual([
      {
        date: "2026-10-11",
        totalSeconds: 0,
        correct: 1,
        wrong: 0,
        blank: 0,
        net: 1,
      },
      {
        date: "2026-10-12",
        totalSeconds: 1500,
        correct: 10,
        wrong: 4,
        blank: 2,
        net: 9,
      },
      {
        date: "2026-10-13",
        totalSeconds: 300,
        correct: 0,
        wrong: 0,
        blank: 0,
        net: 0,
      },
    ]);
  });

  it("gece 00:30'da başlayan çalışma yerel güne yazılır", async () => {
    const { app } = makeTestApp();
    await addSession(app, { local: [2026, 9, 12, 0, 30], seconds: 600 });
    const res = await request(app).get(
      "/api/stats/daily?from=2026-10-11&to=2026-10-12",
    );
    expect(res.body).toEqual([
      {
        date: "2026-10-12",
        totalSeconds: 600,
        correct: 0,
        wrong: 0,
        blank: 0,
        net: 0,
      },
    ]);
  });

  it("from/to dışındaki kayıtları dışlar", async () => {
    const { app } = makeTestApp();
    await addSession(app, { local: [2026, 9, 9, 12], seconds: 600 });
    await addSession(app, { local: [2026, 9, 12, 12], seconds: 600 });
    await addQuestions(app, {
      date: "2026-10-20",
      correct: 5,
      wrong: 0,
      blank: 0,
    });
    const res = await request(app).get(
      "/api/stats/daily?from=2026-10-10&to=2026-10-15",
    );
    expect(res.body.map((d) => d.date)).toEqual(["2026-10-12"]);
  });

  it("subjectId yalnızca o dersi sayar", async () => {
    const { app } = makeTestApp();
    await addSession(app, {
      subjectId: 1,
      local: [2026, 9, 12, 10],
      seconds: 600,
    });
    await addSession(app, {
      subjectId: 2,
      local: [2026, 9, 12, 11],
      seconds: 400,
    });
    await addQuestions(app, {
      subjectId: 2,
      date: "2026-10-12",
      correct: 8,
      wrong: 4,
      blank: 0,
    });
    const res = await request(app).get(
      "/api/stats/daily?from=2026-10-12&to=2026-10-12&subjectId=2",
    );
    expect(res.body).toEqual([
      {
        date: "2026-10-12",
        totalSeconds: 400,
        correct: 8,
        wrong: 4,
        blank: 0,
        net: 7,
      },
    ]);
  });

  it.each([
    ["from eksik", "to=2026-10-12"],
    ["to eksik", "from=2026-10-12"],
    ["from bozuk", "from=abc&to=2026-10-12"],
    ["from > to", "from=2026-10-13&to=2026-10-12"],
    ["subjectId bozuk", "from=2026-10-12&to=2026-10-12&subjectId=x"],
  ])("%s → 400", async (_, query) => {
    const { app } = makeTestApp();
    const res = await request(app).get(`/api/stats/daily?${query}`);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/stats/by-subject", () => {
  it("veri yokken 15 dersin hepsi sıfırlarla döner (NaN yok; doğruluk oranı bilinçli olarak null)", async () => {
    const { app } = makeTestApp();
    const res = await request(app).get(
      "/api/stats/by-subject?from=2026-10-01&to=2026-10-31",
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(15);
    for (const row of res.body) {
      expect(row).toEqual({
        subjectId: expect.any(Number),
        subjectName: expect.any(String),
        examType: expect.stringMatching(/^(TYT|AYT)$/),
        totalSeconds: 0,
        correct: 0,
        wrong: 0,
        blank: 0,
        net: 0,
        accuracy: null,
      });
    }
  });

  it("dersleri kendi toplamlarıyla verir", async () => {
    const { app } = makeTestApp();
    await addSession(app, {
      subjectId: 1,
      local: [2026, 9, 12, 10],
      seconds: 600,
    });
    await addSession(app, {
      subjectId: 1,
      local: [2026, 9, 13, 10],
      seconds: 300,
    });
    await addQuestions(app, {
      subjectId: 1,
      date: "2026-10-12",
      correct: 10,
      wrong: 4,
      blank: 1,
    });
    await addQuestions(app, {
      subjectId: 3,
      date: "2026-10-12",
      correct: 2,
      wrong: 0,
      blank: 3,
    });

    const res = await request(app).get(
      "/api/stats/by-subject?from=2026-10-12&to=2026-10-13",
    );
    const byId = Object.fromEntries(res.body.map((r) => [r.subjectId, r]));
    expect(byId[1]).toMatchObject({
      totalSeconds: 900,
      correct: 10,
      wrong: 4,
      blank: 1,
      net: 9,
    });
    expect(byId[3]).toMatchObject({
      totalSeconds: 0,
      correct: 2,
      wrong: 0,
      blank: 3,
      net: 2,
    });
    expect(byId[2]).toMatchObject({ totalSeconds: 0, correct: 0, net: 0 });
  });

  it("from/to eksik veya from > to ise 400 döner", async () => {
    const { app } = makeTestApp();
    expect((await request(app).get("/api/stats/by-subject")).status).toBe(400);
    const res = await request(app).get(
      "/api/stats/by-subject?from=2026-10-13&to=2026-10-12",
    );
    expect(res.status).toBe(400);
  });
});

describe("netOf", () => {
  it("net = doğru − yanlış / 4", () => {
    expect(netOf(10, 4)).toBe(9);
    expect(netOf(0, 0)).toBe(0);
  });

  it("2 ondalığa yuvarlar", () => {
    expect(netOf(3, 1)).toBe(2.75);
    expect(netOf(1, 1)).toBe(0.75);
    expect(netOf(0, 1)).toBe(-0.25);
    expect(netOf(1, 2)).toBe(0.5);
  });
});
