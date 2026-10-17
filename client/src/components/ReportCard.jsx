import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api.js';
import { useTrack } from '../context/TrackContext.jsx';
import { weekStartOf } from '../lib/charts.js';
import { toLocalDateString } from '../lib/dates.js';
import { downloadBlob } from '../lib/download.js';
import { addDays } from '../lib/insights.js';
import { weeklyReport } from '../lib/report.js';
import { drawReport, loadReportFonts, themePalette } from '../lib/reportCanvas.js';
import { trackInfo, tracksQuestions } from '../lib/tracks.js';
import ErrorBanner from './ErrorBanner.jsx';

// Haftalık rapor kartı: bu hafta ya da geçen hafta, seçili temanın renkleriyle 1080×1920 PNG.
// "Paylaş" telefonda paylaşım menüsünü açar (destekleniyorsa), "İndir" dosya olarak kaydeder.
export default function ReportCard({ onClose }) {
  const { track } = useTrack();
  const dialogRef = useRef(null);
  const canvasRef = useRef(null);
  const [offset, setOffset] = useState(0); // 0: bu hafta, -1: geçen hafta
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const thisWeek = weekStartOf(toLocalDateString(new Date()));
  const weekStart = addDays(thisWeek, offset * 7);
  const fileName = `ders-takip-hafta-${weekStart}.png`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const end = addDays(weekStart, 6);
    Promise.all([
      apiFetch(`/api/stats/daily?from=${addDays(weekStart, -7)}&to=${end}`),
      apiFetch(`/api/stats/by-subject?from=${weekStart}&to=${end}`),
      loadReportFonts(),
    ])
      .then(([daily, subjects]) => {
        if (cancelled || !canvasRef.current) return;
        drawReport(canvasRef.current, weeklyReport(daily, weekStart, subjects), themePalette(), {
          showQuestions: tracksQuestions(track),
          trackTitle: trackInfo(track).title,
        });
        setReady(true);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [weekStart, track]);

  const toBlob = () => new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png'));

  async function handleDownload() {
    const blob = await toBlob();
    if (blob) downloadBlob(blob, fileName);
  }

  const file = typeof File === 'function' ? new File([], fileName, { type: 'image/png' }) : null;
  const canShare = Boolean(file && navigator.canShare?.({ files: [file] }));

  async function handleShare() {
    try {
      const blob = await toBlob();
      await navigator.share({ files: [new File([blob], fileName, { type: 'image/png' })], title: 'Haftalık rapor' });
    } catch (e) {
      if (e?.name !== 'AbortError') setError('Paylaşılamadı; indirip kendin paylaşabilirsin.');
    }
  }

  return (
    <dialog ref={dialogRef} className="plan-editor report-dialog" onCancel={onClose} aria-labelledby="report-title">
      <div className="report-body">
        <h2 id="report-title">Haftalık rapor kartı</h2>
        <div className="segmented" role="group" aria-label="Hafta">
          {[
            [0, 'Bu hafta'],
            [-1, 'Geçen hafta'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={offset === value ? 'active' : undefined}
              aria-pressed={offset === value}
              onClick={() => setOffset(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <ErrorBanner message={error} />
        <canvas ref={canvasRef} className={ready ? 'report-canvas' : 'report-canvas is-loading'} aria-label="Haftalık rapor kartının önizlemesi" />
        <p className="muted">Kart, seçili temanın renkleriyle çizilir. Telefon hikâyesi boyutunda (1080×1920).</p>
        <div className="form-actions">
          <button type="button" onClick={handleDownload} disabled={!ready}>
            PNG indir
          </button>
          {canShare && (
            <button type="button" className="secondary" onClick={handleShare} disabled={!ready}>
              Paylaş
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </dialog>
  );
}
