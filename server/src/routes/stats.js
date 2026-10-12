import { Router } from 'express';
import { HttpError } from '../errors.js';
import { dailyStats, subjectStats } from '../stats.js';
import { requireDate, requireInt } from '../validation.js';

// from ve to zorunlu; from, to'dan büyük olamaz (YYYY-MM-DD metin olarak da sıralanır)
function parseRange(query) {
  const from = requireDate(query.from, 'Başlangıç tarihi');
  const to = requireDate(query.to, 'Bitiş tarihi');
  if (from > to) throw new HttpError(400, 'Başlangıç tarihi bitiş tarihinden sonra olamaz');
  return { from, to };
}

export function statsRouter(db) {
  const router = Router();

  router.get('/daily', (req, res) => {
    const range = parseRange(req.query);
    // Sorgu metni her zaman string gelir; sayıya çevirip tam sayı olup olmadığına bakılır
    const subjectId =
      req.query.subjectId === undefined ? null : requireInt(Number(req.query.subjectId), 'Ders');
    res.json(dailyStats(db, { ...range, subjectId }));
  });

  router.get('/by-subject', (req, res) => {
    res.json(subjectStats(db, parseRange(req.query)));
  });

  return router;
}
