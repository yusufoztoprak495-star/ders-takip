import { useEffect, useState } from 'react';
import { apiFetch } from '../api.js';
import { daysAgo, toLocalDateString } from '../lib/dates.js';
import { peakWindow } from '../lib/forecast.js';
import { formatDuration } from '../lib/format.js';
import ChartCard from './ChartCard.jsx';
import { DurationColumns } from './ProgressCharts.jsx';

const hourLabel = (h) => `${String(h % 24).padStart(2, '0')}:00`;

// "Verimli saatler": seçili aralıkta günün hangi saatlerinde ne kadar çalışıldığı
export default function HourlyCard({ range, subjectId, scope }) {
  const [hours, setHours] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    const subject = subjectId ? `&subjectId=${subjectId}` : '';
    apiFetch(`/api/stats/hourly?from=${daysAgo(range - 1, today)}&to=${toLocalDateString(today)}${subject}`)
      .then((rows) => !cancelled && setHours(rows))
      .catch(() => !cancelled && setHours([]));
    return () => {
      cancelled = true;
    };
  }, [range, subjectId]);

  if (!hours) return null;
  const peak = peakWindow(hours);
  // Uzun aralıkta saat başına toplamlar büyür: eksen saat cinsinden olsun
  const unit = Math.max(...hours.map((h) => h.seconds), 0) >= 3 * 3600 ? 'saat' : 'dakika';

  return (
    <ChartCard
      title="Verimli saatler"
      subtitle={
        peak
          ? `En çok ${hourLabel(peak.start)}–${hourLabel(peak.end)} arası çalışıyorsun (%${peak.share}) · ${scope}`
          : `Son ${range} gün`
      }
      empty={!peak}
      headers={['Saat', 'Süre']}
      rows={hours.filter((h) => h.seconds > 0).map((h) => [`${hourLabel(h.hour)}–${hourLabel(h.hour + 1)}`, formatDuration(h.seconds)])}
    >
      <DurationColumns
        labels={hours.map((h) => String(h.hour).padStart(2, '0'))}
        seconds={hours.map((h) => h.seconds)}
        unit={unit}
        ariaLabel={`Son ${range} günde günün saatlerine göre çalışma süresi`}
      />
    </ChartCard>
  );
}
