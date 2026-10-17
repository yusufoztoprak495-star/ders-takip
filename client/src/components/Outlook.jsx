import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api.js';
import { toLocalDateString } from '../lib/dates.js';
import { BRANCH_TYPE, findExamType } from '../lib/exams.js';
import { netProjection, topicForecast } from '../lib/forecast.js';
import { formatDate, formatNet } from '../lib/format.js';
import { addDays } from '../lib/insights.js';

// Son denemeden hedef güne kaç gün var (tahmin sınav gününe mi, daha yakına mı yapıldı)
const daysUntil = (series, date) =>
  Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${series[series.length - 1].date}T00:00:00Z`)) / 86400000);
const signed = (n) => `${n >= 0 ? '+' : ''}${formatNet(n)}`;

// İlerleme sayfasının "Gidişat" kartları: deneme netinin sınav gününe uzatılmış tahmini
// ve konu bitirme hızına göre bitiş tahmini. showExams: soru/deneme takibi olan hedeflerde.
export default function Outlook({ showExams }) {
  const [data, setData] = useState(null);
  const today = toLocalDateString(new Date());

  useEffect(() => {
    Promise.all([
      apiFetch('/api/subjects'),
      apiFetch('/api/goals'),
      showExams ? apiFetch('/api/exams') : Promise.resolve([]),
    ])
      .then(([subjects, goals, exams]) => setData({ subjects, goals, exams }))
      .catch(() => setData(null));
  }, [showExams]);

  const view = useMemo(() => {
    if (!data) return null;
    const examDate = data.goals.examDate && data.goals.examDate > today ? data.goals.examDate : null;
    const topics = topicForecast(data.subjects.flatMap((s) => s.topics), today, examDate);

    // En çok girilen genel deneme türü (branş denemeleri net ölçeği farklı olduğu için hariç)
    const counts = new Map();
    for (const e of data.exams) if (e.type !== BRANCH_TYPE) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    const typeId = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
    const type = typeId ? findExamType(typeId) : null;
    let exam = null;
    if (type) {
      const series = data.exams
        .filter((e) => e.type === type.id)
        .slice()
        .reverse()
        .map((e) => ({ date: e.date, net: e.totals.net }));
      const target = examDate ?? addDays(today, 30);
      const maxNet = type.sections.reduce((s, x) => s + x.count, 0);
      exam = { type, series, target, examDate, projection: netProjection(series, target, maxNet), maxNet };
    }
    return { topics, exam, examDate };
  }, [data, today]);

  if (!view || view.topics.total === 0) return null;
  const { topics, exam, examDate } = view;

  return (
    <div className="panels outlook">
      {showExams && (
        <article className="panel">
          <h2 className="panel-label">{exam ? `${exam.type.short ?? exam.type.label} net gidişatı` : 'Net gidişatı'}</h2>
          {exam?.projection ? (
            <>
              <span className="value">
                ~{formatNet(exam.projection.projected)}
                <small className="muted"> / {exam.maxNet}</small>
              </span>
              <p className="panel-note">
                {examDate && exam.projection.days === daysUntil(exam.series, examDate)
                  ? 'Bu gidişle sınav günü'
                  : `Bu gidişle ${Math.round(exam.projection.days / 30)} ay sonra`}{' '}
                tahmini net. Son {exam.projection.count} denemede ayda{' '}
                <span className={exam.projection.perMonth >= 0 ? 'change-up' : 'change-down'}>
                  {signed(exam.projection.perMonth)} net
                </span>
                .
              </p>
            </>
          ) : (
            <p className="panel-note">
              Gidişat için aynı türden en az 3 deneme gir. <Link to="/denemeler">Denemeler</Link>
            </p>
          )}
        </article>
      )}
      <article className="panel">
        <h2 className="panel-label">Konu bitiş tahmini</h2>
        <span className="value">
          {topics.done}
          <small className="muted"> / {topics.total} konu</small>
        </span>
        <div className="outlook-meter" aria-hidden="true">
          <i style={{ width: `${(topics.done / topics.total) * 100}%` }} />
        </div>
        <p className="panel-note">
          {topics.remaining === 0
            ? 'Bütün konular bitti; artık tekrar ve deneme zamanı.'
            : topics.finishDate
              ? `Son 4 haftadaki hızınla (haftada ${formatNet(topics.perWeek)} konu) kalan ${topics.remaining} konu ${formatDate(topics.finishDate)} civarı biter.`
              : 'Son 4 haftada konu bitirmemişsin. Bitirdiklerini Dersler ve Konular sayfasında işaretle.'}
          {topics.neededPerWeek !== null && topics.remaining > 0 && (
            <>
              {' '}
              Sınava yetişmek için haftada{' '}
              <span className={topics.onTrack ? 'change-up' : 'change-down'}>{topics.neededPerWeek} konu</span> gerekiyor.
            </>
          )}
        </p>
      </article>
    </div>
  );
}
