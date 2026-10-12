import "dotenv/config";
import { createApp } from "./app.js";
import { openDb } from "./db.js";
import { seedIfEmpty } from "./seed.js";

const port = Number(process.env.PORT) || 3000;
const db = openDb(process.env.DB_PATH ?? "./data/calisma.db");
seedIfEmpty(db);

createApp(db).listen(port, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${port}`);
});
