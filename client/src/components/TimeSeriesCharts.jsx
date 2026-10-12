import { formatDate, formatDuration, formatNet, formatShortDate } from '../lib/format.js';
import ChartCard from './ChartCard.jsx';
import { DurationColumns, NetLine } from './ProgressCharts.jsx';

// Zaman grafikleri: günlük süre, haftalık süre, günlük net. Ana ilerleme ve ders sayfasında ortak.
// view: useDailyStats çıktısı; scope: alt başlıkta yazan kapsam ("tüm dersler", "Matematik (AYT)").
export default function TimeSeriesCharts({ view, range, scope, totalNote = '' }) {
  return (
    <>
      <ChartCard
        title="Günlük çalışma süresi (dakika)"
        subtitle={`Son ${range} gün · ${scope}`}
        empty={view.summary.totalSeconds === 0}
        headers={['Tarih', 'Süre']}
        rows={view.days.map((d) => [formatDate(d.date), formatDuration(d.totalSeconds)])}
      >
        <DurationColumns
          unit="dakika"
          labels={view.days.map((d) => formatShortDate(d.date))}
          seconds={view.days.map((d) => d.totalSeconds)}
          ariaLabel={`Son ${range} günün günlük çalışma süresi`}
        />
      </ChartCard>

      <ChartCard
        title="Haftalık çalışma süresi (saat)"
        subtitle={`Haftalar Pazartesi başlar · ${scope}`}
        empty={view.weeks.every((w) => w.totalSeconds === 0)}
        headers={['Hafta başlangıcı', 'Süre']}
        rows={view.weeks.map((w) => [formatDate(w.weekStart), formatDuration(w.totalSeconds)])}
      >
        <DurationColumns
          unit="saat"
          labels={view.weeks.map((w) => formatShortDate(w.weekStart))}
          seconds={view.weeks.map((w) => w.totalSeconds)}
          ariaLabel="Haftalık çalışma süresi"
        />
      </ChartCard>

      <ChartCard
        title="Günlük net değişimi"
        subtitle={`Son ${range} gün · ${scope}${totalNote} · yalnızca soru çözülen günler`}
        empty={view.netDays.length === 0}
        headers={['Tarih', 'Doğru', 'Yanlış', 'Boş', 'Net']}
        rows={view.netDays.map((d) => [formatDate(d.date), d.correct, d.wrong, d.blank, formatNet(d.net)])}
      >
        <NetLine days={view.netDays} ariaLabel={`Son ${range} günün günlük net değişimi`} />
      </ChartCard>
    </>
  );
}
