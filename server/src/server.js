import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createApp } from "./app.js";
import { openDb } from "./db.js";
import { seedIfEmpty } from "./seed.js";

// Proje kökü: hangi klasörden başlatılırsa başlatılsın (npm start / npm run dev) aynı yer
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

dotenv.config({ path: path.join(rootDir, ".env") });

const port = Number(process.env.PORT) || 3000;
// DB_PATH göreli verilirse proje köküne göre çözülür; böylece tek bir veritabanı dosyası olur
const db = openDb(
  path.resolve(rootDir, process.env.DB_PATH ?? "data/calisma.db"),
);
seedIfEmpty(db);

// Derlenmiş arayüz: client/dist (npm start önce derlemeyi yapar)
const clientDist = path.join(rootDir, "client/dist");

createApp(db, { clientDist }).listen(port, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${port}`);
});
