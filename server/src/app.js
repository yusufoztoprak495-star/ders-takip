import express from "express";
import { notFoundHandler, errorHandler } from "./errors.js";
import { subjectsRouter } from "./routes/subjects.js";
import { topicsRouter } from "./routes/topics.js";
import { sessionsRouter } from "./routes/sessions.js";
import { resourcesRouter } from "./routes/resources.js";
import { questionsRouter } from "./routes/questions.js";

export function createApp(db) {
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

  // Sıra önemli: önce rotalar, sonra 404, en sonda hata yakalayıcı
  app.use("/api", notFoundHandler);
  app.use(errorHandler);
  return app;
}
