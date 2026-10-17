import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";

async function addSession(app, local, minutes, extra = {}) {
  const res = await request(app)
    .post("/api/sessions")
    .send({ subjectId: 1, startedAt: new Date(...local).toISOString(), durationSeconds: minutes * 60, entryType: "pomodoro", ...extra });
  expect(res.status).toBe(201);
}

describe("GET /api/achievements", () => {
  it("boş veride hepsi sıfır", async () => {
    const { app } = makeTestApp();
    const res = await request(app).get("/api/achievements");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ sessions: 0, totalSeconds: 0, pomodoros: 0, longestStreak: 0, questions: 0 });
  });

  it("çalışmalardan seri, en iyi gün, erken/geç ve dikkatsiz pomodoroları sayar", async () => {
    const { app } = makeTestApp();
    await addSession(app, [2026, 9, 10, 6, 30], 25, { distractions: 0 }); // erken
    await addSession(app, [2026, 9, 11, 23, 15], 25, { distractions: 2 }); // geç
    await addSession(app, [2026, 9, 12, 10, 0], 50);
    await addSession(app, [2026, 9, 12, 14, 0], 60, { entryType: "manual" });
    await addSession(app, [2026, 9, 14, 10, 0], 25, { distractions: 0 });
    await request(app).post("/api/questions").send({ subjectId: 1, date: "2026-10-12", correct: 20, wrong: 5, blank: 5 });
    const { body } = await request(app).get("/api/achievements");
    expect(body).toMatchObject({
      sessions: 5,
      pomodoros: 4,
      focusedPomodoros: 2,
      totalSeconds: (25 + 25 + 50 + 60 + 25) * 60,
      longestStreak: 3,
      bestDaySeconds: 110 * 60,
      earlySessions: 1,
      lateSessions: 1,
      questions: 30,
    });
  });
});
