import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { formatDuration, formatNet, formatShortDate } from '../lib/format.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const BAR_MAX_THICKNESS = 24; // çubuklar kalın olmasın, aralarında hava kalsın

// '#2a78d6' + 0.35 -> '#2a78d659' (vurgu dışı kalan işaretleri soluklaştırmak için)
const withAlpha = (hex, alpha) => hex + Math.round(alpha * 255).toString(16).padStart(2, '0');

const numberTr = (n) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

// Tüm grafiklerin ortak görünümü: ince, sessiz ızgara; metinler metin renginde, veri renginde değil
function baseOptions(theme, { horizontal = false, stacked = false, legend = false, tooltipLabel }) {
  const tickStyle = { color: theme.muted, font: { family: FONT, size: 12 } };
  const valueAxis = {
    beginAtZero: true,
    stacked,
    grid: { color: theme.grid, lineWidth: 1 },
    border: { display: false },
    ticks: { ...tickStyle, callback: (v) => numberTr(Number(v)), maxTicksLimit: 6 },
  };
  const categoryAxis = {
    stacked,
    grid: { display: false },
    border: { color: theme.axis },
    ticks: { ...tickStyle, autoSkip: true, maxRotation: 0, maxTicksLimit: horizontal ? undefined : 10 },
  };

  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    // Fare, işaretin tam üstünde olmasa da en yakın konumu bulur (büyük tıklama alanı)
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: legend
        ? {
            position: 'top',
            align: 'start',
            labels: { color: theme.ink, font: { family: FONT, size: 12 }, usePointStyle: true, pointStyle: 'rect', boxWidth: 10, boxHeight: 10 },
          }
        : { display: false },
      tooltip: {
        backgroundColor: theme.surface,
        titleColor: theme.muted,
        bodyColor: theme.ink,
        borderColor: theme.axis,
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
        titleFont: { family: FONT, size: 12, weight: 'normal' },
        bodyFont: { family: FONT, size: 13, weight: 'bold' },
        callbacks: tooltipLabel ? { label: tooltipLabel } : {},
      },
    },
    scales: horizontal ? { y: categoryAxis, x: valueAxis } : { x: categoryAxis, y: valueAxis },
  };
}

// Dikey bar için veri ucu 4px yuvarlak, taban düz
const COLUMN_RADIUS = { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 };
const ROW_RADIUS = { topLeft: 0, topRight: 4, bottomLeft: 0, bottomRight: 4 };

// Süre sütunları: Günlük (dakika) ve Haftalık (saat). `values` saniyedir.
export function DurationColumns({ theme, labels, seconds, unit, ariaLabel }) {
  const divisor = unit === 'saat' ? 3600 : 60;
  const options = baseOptions(theme, {
    tooltipLabel: (ctx) => ` ${formatDuration(seconds[ctx.dataIndex])}`,
  });
  const data = {
    labels,
    datasets: [
      {
        label: 'Çalışma süresi',
        data: seconds.map((s) => Math.round((s / divisor) * 10) / 10),
        backgroundColor: theme.series[0],
        hoverBorderColor: theme.ink,
        hoverBorderWidth: 2,
        borderRadius: COLUMN_RADIUS,
        borderSkipped: 'bottom',
        maxBarThickness: BAR_MAX_THICKNESS,
      },
    ],
  };
  return <Bar role="img" aria-label={ariaLabel} data={data} options={options} />;
}

// Ders bazında süre: 8 ders olduğu için halka yerine yatay çubuk. Seçili ders varsa o vurgulanır.
export function SubjectTimeBars({ theme, rows, highlightId, ariaLabel }) {
  const options = baseOptions(theme, {
    horizontal: true,
    tooltipLabel: (ctx) => ` ${formatDuration(rows[ctx.dataIndex].totalSeconds)}`,
  });
  const color = (row) => (highlightId && row.subjectId !== highlightId ? theme.dim : theme.series[0]);
  const data = {
    labels: rows.map((r) => `${r.subjectName} (${r.examType})`),
    datasets: [
      {
        label: 'Çalışma süresi',
        data: rows.map((r) => Math.round((r.totalSeconds / 3600) * 10) / 10),
        backgroundColor: rows.map(color),
        hoverBorderColor: theme.ink,
        hoverBorderWidth: 2,
        borderRadius: ROW_RADIUS,
        borderSkipped: 'start',
        maxBarThickness: BAR_MAX_THICKNESS,
      },
    ],
  };
  return <Bar role="img" aria-label={ariaLabel} data={data} options={options} />;
}

// Ders bazında doğru / yanlış / boş: yığılmış yatay çubuk, 3 seri (legend var)
export function QuestionStacks({ theme, rows, highlightId, ariaLabel }) {
  const options = baseOptions(theme, {
    horizontal: true,
    stacked: true,
    legend: true,
    tooltipLabel: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.x}`,
  });
  const series = [
    { label: 'Doğru', key: 'correct', color: theme.series[0] },
    { label: 'Yanlış', key: 'wrong', color: theme.series[1] },
    { label: 'Boş', key: 'blank', color: theme.series[2] },
  ];
  const data = {
    labels: rows.map((r) => `${r.subjectName} (${r.examType})`),
    datasets: series.map((s) => ({
      label: s.label,
      data: rows.map((r) => r[s.key]),
      // Seçili ders varsa diğerleri soluklaşır (vurgu); renk her zaman aynı seriye aittir
      backgroundColor: rows.map((r) => (highlightId && r.subjectId !== highlightId ? withAlpha(s.color, 0.3) : s.color)),
      // Parçalar arasında 2px yüzey rengi boşluk
      borderColor: theme.surface,
      borderWidth: 2,
      hoverBorderColor: theme.ink,
      maxBarThickness: BAR_MAX_THICKNESS,
    })),
  };
  return <Bar role="img" aria-label={ariaLabel} data={data} options={options} />;
}

// Dikey işaretçi: fare bir tarihin üstündeyken o konumda ince bir çizgi çizer
const crosshair = {
  id: 'crosshair',
  afterDatasetsDraw(chart, _args, options) {
    const active = chart.tooltip?.getActiveElements?.() ?? [];
    if (active.length === 0) return;
    const { top, bottom } = chart.chartArea;
    const { ctx } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(active[0].element.x, top);
    ctx.lineTo(active[0].element.x, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = options.color;
    ctx.stroke();
    ctx.restore();
  },
};

// Günlük net değişimi: tek seri çizgi (legend yok, başlık neyi gösterdiğini söyler)
export function NetLine({ theme, days, ariaLabel }) {
  const options = baseOptions(theme, { tooltipLabel: (ctx) => ` Net: ${formatNet(ctx.parsed.y)}` });
  options.scales.y.beginAtZero = false;
  options.plugins.crosshair = { color: theme.axis };
  options.interaction = { mode: 'index', intersect: false, axis: 'x' };
  const data = {
    labels: days.map((d) => formatShortDate(d.date)),
    datasets: [
      {
        label: 'Net',
        data: days.map((d) => d.net),
        borderColor: theme.series[0],
        borderWidth: 2,
        borderJoinStyle: 'round',
        borderCapStyle: 'round',
        pointRadius: 4, // 8px nokta
        pointHoverRadius: 6,
        pointHitRadius: 12, // tıklama alanı noktadan büyük
        pointBackgroundColor: theme.series[0],
        pointBorderColor: theme.surface, // 2px yüzey halkası
        pointBorderWidth: 2,
        tension: 0,
        spanGaps: true,
      },
    ],
  };
  return <Line role="img" aria-label={ariaLabel} data={data} options={options} plugins={[crosshair]} />;
}
