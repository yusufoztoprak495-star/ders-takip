import { createDatabase } from "../../src/data/database.js";
import { HttpError } from "../../src/data/errors.js";
import { emptyState, seedIfEmpty } from "../../src/data/seed.js";
import { memoryStorage } from "../../src/data/storage.js";

// Her test için temiz, bellek içi bir veritabanı kurar. `db`, hazır ders/konu listesinin kopyasıdır
// (kimlikleri bulmak için okunur; veritabanının kendisi ayrı tutulur).
export function makeTestApp() {
  const seeded = emptyState();
  seedIfEmpty(seeded);
  return { app: createDatabase(memoryStorage(seeded)), db: seeded };
}

// Eski sunucu testlerindeki supertest yazımını taklit eder:
//   await request(app).post("/api/x").send({ ... })  ->  { status, body }
// Böylece testlerin gövdesi değişmeden aynı davranışı denetler.
export default function request(app) {
  const call = (method, path) => {
    let body;
    const run = async () => {
      const payload = body === undefined ? undefined : JSON.parse(JSON.stringify(body));
      try {
        const res = await app.request(method, path, payload);
        return { status: res.status, body: res.body ?? {} };
      } catch (error) {
        if (error instanceof HttpError) return { status: error.status, body: { error: error.message } };
        throw error;
      }
    };
    const chain = {
      send(value) {
        body = value;
        return chain;
      },
      then: (resolve, reject) => run().then(resolve, reject),
    };
    return chain;
  };
  return {
    get: (path) => call("GET", path),
    post: (path) => call("POST", path),
    put: (path) => call("PUT", path),
    delete: (path) => call("DELETE", path),
  };
}
