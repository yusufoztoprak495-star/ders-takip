import { Router } from 'express';
import { HttpError } from '../errors.js';
import { dailyStats, subjectStats, topicDetail, topicStats } from '../stats.js';
import { parseId, requireDate, requireInt } from '../validation.js';

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

  // Bir dersin konu bazında toplamları (ders sayfasındaki zayıf → güçlü liste için)
  router.get('/by-topic', (req, res) => {
    const range = parseRange(req.query);
    const subjectId = requireInt(Number(req.query.subjectId), 'Ders');
    if (!db.prepare('SELECT 1 FROM subjects WHERE id = ?').get(subjectId)) {
      throw new HttpError(404, 'Ders bulunamadı');
    }
    res.json(topicStats(db, { ...range, subjectId }));
  });

  // Tek bir konunun tüm zamanlardaki ayrıntısı
  router.get('/topic/:id', (req, res) => {
    const detail = topicDetail(db, parseId(req.params.id));
    if (!detail) throw new HttpError(404, 'Konu bulunamadı');
    res.json(detail);
  });

  return router;
}
