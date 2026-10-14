import { HttpError } from "./errors.js";
import { getSettings, updateSettings } from "./routes/settings.js";
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from "./routes/subjects.js";
import { createTopic, deleteTopic, renameTopic } from "./routes/topics.js";
import {
  createSession,
  deleteSession,
  listSessions,
  updateSession,
} from "./routes/sessions.js";
import {
  createResource,
  deleteResource,
  listResources,
  updateResource,
} from "./routes/resources.js";
import {
  createQuestion,
  deleteQuestion,
  listQuestions,
  updateQuestion,
} from "./routes/questions.js";
import {
  getBySubject,
  getByTopic,
  getDaily,
  getTopicDetail,
} from "./routes/stats.js";

// [yöntem, yol, işleyici]. ':id' yol parametresidir. GET dışındakiler veriyi değiştirir.
const ROUTES = [
  ["GET", "/api/health", () => ({ status: 200, body: { status: "ok" } })],
  ["GET", "/api/settings", getSettings],
  ["PUT", "/api/settings", updateSettings],
  ["GET", "/api/subjects", listSubjects],
  ["POST", "/api/subjects", createSubject],
  ["PUT", "/api/subjects/:id", updateSubject],
  ["DELETE", "/api/subjects/:id", deleteSubject],
  ["POST", "/api/topics", createTopic],
  ["PUT", "/api/topics/:id", renameTopic],
  ["DELETE", "/api/topics/:id", deleteTopic],
  ["GET", "/api/sessions", listSessions],
  ["POST", "/api/sessions", createSession],
  ["PUT", "/api/sessions/:id", updateSession],
  ["DELETE", "/api/sessions/:id", deleteSession],
  ["GET", "/api/resources", listResources],
  ["POST", "/api/resources", createResource],
  ["PUT", "/api/resources/:id", updateResource],
  ["DELETE", "/api/resources/:id", deleteResource],
  ["GET", "/api/questions", listQuestions],
  ["POST", "/api/questions", createQuestion],
  ["PUT", "/api/questions/:id", updateQuestion],
  ["DELETE", "/api/questions/:id", deleteQuestion],
  ["GET", "/api/stats/daily", getDaily],
  ["GET", "/api/stats/by-subject", getBySubject],
  ["GET", "/api/stats/by-topic", getByTopic],
  ["GET", "/api/stats/topic/:id", getTopicDetail],
].map(([method, pattern, handler]) => ({
  method,
  handler,
  mutates: method !== "GET",
  regex: new RegExp(`^${pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)")}$`),
}));

// İsteği çözer: hangi işleyici, hangi yol parametreleri ve sorgu değerleri.
// Eşleşme yoksa 404 verir.
export function resolveRoute(method, path) {
  const url = new URL(path, "http://yerel");
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const match = route.regex.exec(url.pathname);
    if (!match) continue;
    const params = Object.fromEntries(
      Object.entries(match.groups ?? {}).map(([k, v]) => [
        k,
        decodeURIComponent(v),
      ]),
    );
    return { route, params, query: url.searchParams };
  }
  throw new HttpError(404, "Bulunamadı");
}
