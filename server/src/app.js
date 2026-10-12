import express from "express";
import { notFoundHandler, errorHandler } from "./errors.js";
import { subjectsRouter } from "./routes/subjects.js";
import { topicsRouter } from "./routes/topics.js";
import { sessionsRouter } from "./routes/sessions.js";
import { resourcesRouter } from "./routes/resources.js";
import { questionsRouter } from "./routes/questions.js";
import { statsRouter } from "./routes/stats.js";

// clientDist: derlenmiş arayüz klasörü. Verilirse sunucu arayüzü de servis eder.
export function createApp(db, { clientDist } = {}) {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/subjects", subjectsRouter(db));
  app.use("/api/topics", topicsRouter(db));
  app.use("/api/sessions", sessionsRouter(db));
  app.use("/api/resources", resourcesRouter(db));
  app.use("/api/questions", questionsRouter(db));
  app.use("/api/stats", statsRouter(db));
  if (clientDist) app.use(express.static(clientDist));

  // Sıra önemli: önce rotalar, sonra 404, en sonda hata yakalayıcı
  app.use("/api", notFoundHandler);
  app.use(errorHandler);
  return app;
}
