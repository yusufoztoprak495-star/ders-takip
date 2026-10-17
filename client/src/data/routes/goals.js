import { HttpError } from "../errors.js";
import { requireBody, requireDate, requireInt } from "../validation.js";

// Hedefler: seçili hedefin sınav tarihi (geri sayım için) ve günlük çalışma hedefi (dakika).
// Sınav tarihi her hedef için ayrı tutulur (YKS ve DGS tarihi farklı); günlük hedef ortaktır.
export const DAILY_GOAL_MAX = 16 * 60;

export function getGoals({ state }) {
  const { examDates = {}, dailyGoal = 0 } = state.settings;
  return { status: 200, body: { examDate: examDates[state.settings.track] ?? null, dailyGoal } };
}

export function updateGoals({ state, body: rawBody }) {
  const body = requireBody(rawBody);
  const examDate = body.examDate === null || body.examDate === "" ? null : requireDate(body.examDate, "Sınav tarihi");
  const dailyGoal = requireInt(body.dailyGoal, "Günlük hedef", { min: 0, max: DAILY_GOAL_MAX });
  if (dailyGoal % 5 !== 0) throw new HttpError(400, "Günlük hedef 5 dakikalık adımlarla girilmeli");
  const dates = { ...(state.settings.examDates ?? {}) };
  if (examDate) dates[state.settings.track] = examDate;
  else delete dates[state.settings.track];
  state.settings.examDates = dates;
  if (dailyGoal > 0) state.settings.dailyGoal = dailyGoal;
  else delete state.settings.dailyGoal;
  return getGoals({ state });
}
