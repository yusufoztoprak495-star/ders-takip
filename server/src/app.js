import express from 'express';
import { notFoundHandler, errorHandler } from './errors.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Sıra önemli: önce rotalar, sonra 404, en sonda hata yakalayıcı
  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}
