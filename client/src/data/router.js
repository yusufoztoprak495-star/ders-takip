import { HttpError } from "./errors.js";
import { getSettings, updateSettings } from "./routes/settings.js";
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from "./routes/subjects.js";
import {
  createTopic,
  deleteTopic,
  listDueReviews,
  renameTopic,
  reviewTopic,
  setTopicDone,
  setTopicNote,
} from "./routes/topics.js";
import { createCard, deleteCard, listCards, reviewCard, updateCard } from "./routes/cards.js";
import { createMistake, deleteMistake, listMistakes, reviewMistake, updateMistake } from "./routes/mistakes.js";
import { createExam, deleteExam, listExams, listWrongTopics, setWrongTopics, updateExam } from "./routes/exams.js";
import { getGoals, updateGoals } from "./routes/goals.js";
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
  copyDay,
  createClasses,
  createPlan,
  deleteClass,
  deletePlan,
  getSchedule,
  getToday,
  setPlanDone,
  listClasses,
  listPlans,
  updateClass,
  updatePlan,
  updateSchedule,
} from "./routes/schedule.js";
import {
  getAchievements,
  getBySubject,
  getByTopic,
  getDaily,
  getHourly,
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
  ["PUT", "/api/topics/:id/done", setTopicDone],
  ["PUT", "/api/topics/:id/note", setTopicNote],
  ["POST", "/api/topics/:id/review", reviewTopic],
  ["GET", "/api/reviews", listDueReviews],
  ["GET", "/api/cards", listCards],
  ["POST", "/api/cards", createCard],
  ["POST", "/api/cards/:id/review", reviewCard],
  ["PUT", "/api/cards/:id", updateCard],
  ["DELETE", "/api/cards/:id", deleteCard],
  ["GET", "/api/mistakes", listMistakes],
  ["POST", "/api/mistakes", createMistake],
  ["POST", "/api/mistakes/:id/review", reviewMistake],
  ["PUT", "/api/mistakes/:id", updateMistake],
  ["DELETE", "/api/mistakes/:id", deleteMistake],
  ["GET", "/api/exams/wrong-topics", listWrongTopics],
  ["GET", "/api/exams", listExams],
  ["PUT", "/api/exams/:id/wrong-topics", setWrongTopics],
  ["POST", "/api/exams", createExam],
  ["PUT", "/api/exams/:id", updateExam],
  ["DELETE", "/api/exams/:id", deleteExam],
  ["GET", "/api/goals", getGoals],
  ["PUT", "/api/goals", updateGoals],
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
  ["GET", "/api/classes", listClasses],
  ["POST", "/api/classes", createClasses],
  ["PUT", "/api/classes/:id", updateClass],
  ["DELETE", "/api/classes/:id", deleteClass],
  ["GET", "/api/plans", listPlans],
  ["POST", "/api/plans", createPlan],
  // "copy" kimlik değil: :id kalıbından önce yazılır ki POST /api/plans/:id gibi algılanmasın
  ["POST", "/api/plans/copy", copyDay],
  ["PUT", "/api/plans/:id/done", setPlanDone],
  ["PUT", "/api/plans/:id", updatePlan],
  ["GET", "/api/today", getToday],
  ["DELETE", "/api/plans/:id", deletePlan],
  ["GET", "/api/schedule", getSchedule],
  ["PUT", "/api/schedule", updateSchedule],
  ["GET", "/api/achievements", getAchievements],
  ["GET", "/api/stats/daily", getDaily],
  ["GET", "/api/stats/hourly", getHourly],
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
