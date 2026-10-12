import { openDb } from "../src/db.js";
import { seedIfEmpty } from "../src/seed.js";
import { createApp } from "../src/app.js";

// Her test için temiz, bellek içi veritabanıyla bir uygulama kurar
export function makeTestApp() {
  const db = openDb(":memory:");
  seedIfEmpty(db);
  return { app: createApp(db), db };
}
