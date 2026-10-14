import { subjectLabel } from '../lib/tracks.js';
import { useEffect, useRef, useState } from 'react';
import { labelIndexes, niceTicks } from '../lib/scale.js';
import { formatDuration, formatNet, formatPercent, formatShortDate } from '../lib/format.js';

// İlerleme sayfasının grafikleri: Chart.js yerine elle çizilmiş SVG.
// Ortak kurallar: ince çizgi ve çubuklar, sessiz ızgara, metinler metin renginde,
// veri ucu yuvarlak, parçalar arasında 2px boşluk, üzerine gelince ayrıntı balonu.

const HEIGHT = 280;
const numberTr = (n) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

// Kapsayıcının genişliğini izler: SVG her zaman tam genişlikte, bozulmadan çizilir
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// Üstü yuvarlak, tabanı düz dikey çubuk
function columnPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}

// Sağ ucu yuvarlak, tabanı düz yatay çubuk
function rowPath(x, y, w, h, r) {
  const radius = Math.min(r, h / 2, w);
  return `M${x},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h - radius} Q${x + w},${y + h} ${x + w - radius},${y + h} H${x} Z`;
}

// Üzerine gelince çıkan ayrıntı balonu (HTML: metin düzgün sarılır, SVG'den bağımsız)
function Tip({ tip, width }) {
  if (!tip) return null;
  const left = Math.min(Math.max(tip.x, 8), Math.max(width - 168, 8));
  return (
    <div className="chart-tip" style={{ left, top: Math.max(tip.y - 8, 0) }} role="presentation">
      <span className="chart-tip-title">{tip.title}</span>
      {tip.lines.map((line) => (
        <span key={line.label ?? line.text} className="chart-tip-line">
          {line.color && <i style={{ background: line.color }} />}
          {line.label ? `${line.label}: ` : ''}
          <b>{line.text}</b>
        </span>
      ))}
    </div>
  );
}

// Yatay ızgara çizgileri ve sol eksen yazıları (dikey çubuk ve çizgi grafikleri için)
function ValueGrid({ ticks, y, left, right, format }) {
  return ticks.map((t) => (
    <g key={t}>
      <line x1={left} x2={right} y1={y(t)} y2={y(t)} className={t === ticks[0] ? 'axis-line' : 'grid-line'} />
      <text x={left - 8} y={y(t) + 4} textAnchor="end" className="axis-text">
        {format(t)}
      </text>
    </g>
  ));
}

function CategoryLabels({ labels, x, baseline, maxLabels }) {
  return labelIndexes(labels.length, maxLabels).map((i) => (
    <text key={i} x={x(i)} y={baseline + 18} textAnchor="middle" className="axis-text">
      {labels[i]}
    </text>
  ));
}

// Süre sütunları: Günlük (dakika) ve Haftalık (saat). `seconds` saniyedir.
export function DurationColumns({ labels, seconds, unit, ariaLabel }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  const [hover, setHover] = useState(null);

  const divisor = unit === 'saat' ? 3600 : 60;
  const values = seconds.map((s) => s / divisor);
  const { max, ticks } = niceTicks(Math.max(...values, 0), { count: 4 });
  const m = { top: 20, right: 8, bottom: 28, left: 36 };
  const plotW = Math.max(width - m.left - m.right, 10);
  const plotH = HEIGHT - m.top - m.bottom;
  const band = plotW / values.length;
  const barW = Math.min(Math.max(band * 0.42, 3), 12);
  const y = (v) => m.top + plotH - (v / max) * plotH;
  const x = (i) => m.left + band * i + band / 2;
  const peak = values.indexOf(Math.max(...values));

  return (
    <div ref={ref} className="svg-chart" onMouseLeave={() => (setTip(null), setHover(null))}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label={ariaLabel}>
          <ValueGrid ticks={ticks} y={y} left={m.left} right={width - m.right} format={numberTr} />
          {values.map((v, i) => {
            const h = Math.max(plotH - (y(v) - m.top), 0);
            return (
              <g key={i}>
                {v > 0 && (
                  <path
                    d={columnPath(x(i) - barW / 2, y(v), barW, h, 3)}
                    className={hover === i ? 'mark mark-hover' : 'mark'}
                    fill="var(--series-1)"
                  />
                )}
                <rect
                  x={m.left + band * i}
                  y={m.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => {
                    setHover(i);
                    setTip({
                      x: x(i) + 10,
                      y: Math.max(y(v), m.top + 64), // uzun çubukta balon grafik alanında kalsın
                      title: labels[i],
                      lines: [{ text: formatDuration(seconds[i]) }],
                    });
                  }}
                />
              </g>
            );
          })}
          {values[peak] > 0 && hover === null && (
            <text x={x(peak)} y={y(values[peak]) - 7} textAnchor="middle" className="value-text">
              {formatDuration(seconds[peak])}
            </text>
          )}
          <CategoryLabels labels={labels} x={x} baseline={m.top + plotH} maxLabels={Math.floor(plotW / 52)} />
        </svg>
      )}
      <Tip tip={tip} width={width} />
    </div>
  );
}

// Yatay çubuk satırları için ortak yerleşim: sol tarafta ders adları, sağda değer
function useRows(count, width) {
  const rowH = 34;
  const labelW = width < 460 ? 108 : 150;
  return {
    rowH,
    labelW,
    height: Math.max(count * rowH + 8, 60),
    plotLeft: labelW + 8,
    plotRight: Math.max(width - 64, labelW + 40),
  };
}

function RowLabel({ text, y, labelW, dim }) {
  // Uzun ders adları sığmazsa kısaltılır (tam adı balonda ve tabloda var)
  const max = Math.floor(labelW / 7);
  const shown = text.length > max ? `${text.slice(0, max - 1)}…` : text;
  return (
    <text x={labelW} y={y} textAnchor="end" className={dim ? 'axis-text dim' : 'row-text'}>
      {shown}
    </text>
  );
}

// Ders bazında süre: 8 ders olduğu için halka yerine yatay çubuk. Seçili ders varsa o vurgulanır.
export function SubjectTimeBars({ rows, highlightId, ariaLabel }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  const [hover, setHover] = useState(null);
  const layout = useRows(rows.length, width);
  const maxSeconds = Math.max(...rows.map((r) => r.totalSeconds), 1);
  const plotW = layout.plotRight - layout.plotLeft;

  return (
    <div ref={ref} className="svg-chart" onMouseLeave={() => (setTip(null), setHover(null))}>
      {width > 0 && (
        <svg width={width} height={layout.height} role="img" aria-label={ariaLabel}>
          {rows.map((r, i) => {
            const cy = i * layout.rowH + layout.rowH / 2 + 4;
            const w = Math.max((r.totalSeconds / maxSeconds) * plotW, 2);
            const faded = highlightId && r.subjectId !== highlightId;
            const name = subjectLabel(r.subjectName, r.examType);
            return (
              <g key={r.subjectId}>
                <RowLabel text={name} y={cy + 4} labelW={layout.labelW} dim={faded} />
                <path
                  d={rowPath(layout.plotLeft, cy - 4, w, 8, 4)}
                  fill={faded ? 'var(--series-dim)' : 'var(--series-1)'}
                  className={hover === i ? 'mark mark-hover' : 'mark'}
                />
                <text x={layout.plotLeft + w + 8} y={cy + 4} className="value-text">
                  {formatDuration(r.totalSeconds)}
                </text>
                <rect
                  x="0"
                  y={i * layout.rowH + 4}
                  width={width}
                  height={layout.rowH}
                  fill="transparent"
                  onMouseEnter={() => {
                    setHover(i);
                    setTip({
                      x: layout.plotLeft + w + 12,
                      y: cy,
                      title: name,
                      lines: [{ text: formatDuration(r.totalSeconds) }],
                    });
                  }}
                />
              </g>
            );
          })}
        </svg>
      )}
      <Tip tip={tip} width={width} />
    </div>
  );
}

// Doğru / yanlış / boş: "boş" bilinçli olarak nötr gri, çünkü bir sonuç değil, bir eksik
const QUESTION_SERIES = [
  { label: 'Doğru', key: 'correct', color: 'var(--series-2)' },
  { label: 'Yanlış', key: 'wrong', color: 'var(--series-3)' },
  { label: 'Boş', key: 'blank', color: 'var(--series-blank)' },
];

// Ders bazında doğru / yanlış / boş: yığılmış yatay çubuk, parçalar arasında 2px boşluk
export function QuestionStacks({ rows, highlightId, ariaLabel }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  const [hover, setHover] = useState(null);
  const layout = useRows(rows.length, width);
  const maxTotal = Math.max(...rows.map((r) => r.correct + r.wrong + r.blank), 1);
  const plotW = layout.plotRight - layout.plotLeft;

  return (
    <div ref={ref} className="svg-chart" onMouseLeave={() => (setTip(null), setHover(null))}>
      <ul className="chart-legend">
        {QUESTION_SERIES.map((s) => (
          <li key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      {width > 0 && (
        <svg width={width} height={layout.height} role="img" aria-label={ariaLabel}>
          {rows.map((r, i) => {
            const cy = i * layout.rowH + layout.rowH / 2 + 4;
            const total = r.correct + r.wrong + r.blank;
            const faded = highlightId && r.subjectId !== highlightId;
            const name = subjectLabel(r.subjectName, r.examType);
            let cursor = layout.plotLeft;
            return (
              <g key={r.subjectId} opacity={faded ? 0.35 : 1}>
                <RowLabel text={name} y={cy + 4} labelW={layout.labelW} />
                {QUESTION_SERIES.map((s) => {
                  const w = (r[s.key] / maxTotal) * plotW;
                  const x = cursor;
                  cursor += w;
                  // 2px boşluk: her parça yüzey renginde 2px çizgiyle ayrılır
                  return w > 0 ? (
                    <rect
                      key={s.key}
                      x={x}
                      y={cy - 5}
                      width={w}
                      height={10}
                      fill={s.color}
                      stroke="var(--bg)"
                      strokeWidth="2"
                      className={hover === i ? 'mark mark-hover' : 'mark'}
                    />
                  ) : null;
                })}
                <text x={cursor + 8} y={cy + 4} className="value-text">
                  {total}
                </text>
                <rect
                  x="0"
                  y={i * layout.rowH + 4}
                  width={width}
                  height={layout.rowH}
                  fill="transparent"
                  onMouseEnter={() => {
                    setHover(i);
                    setTip({
                      x: cursor + 12,
                      y: cy,
                      title: name,
                      lines: [
                        ...QUESTION_SERIES.map((s) => ({ label: s.label, text: String(r[s.key]), color: s.color })),
                        { label: 'Net', text: formatNet(r.net) },
                      ],
                    });
                  }}
                />
              </g>
            );
          })}
        </svg>
      )}
      <Tip tip={tip} width={width} />
    </div>
  );
}

// Günlük değişim çizgisi: tek seri. Başlık neyi gösterdiğini söyler, bu yüzden açıklama kutusu yok.
// valueOf: bir günden çizilecek değeri alır; format: değerin yazısı; label: balondaki ad;
// domain: eksen sınırları sabitse ([0, 100] gibi), verilmezse veriye göre hesaplanır.
function TrendLine({ days, valueOf, format, label, domain, ariaLabel }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);

  const values = days.map(valueOf);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // Eksen 0'dan başlamak zorunda değil: hep pozitifse verinin biraz altından başlar, negatif varsa onu da kapsar
  const { min, max, ticks } = domain
    ? { min: domain[0], max: domain[1], ticks: niceTicks(domain[1], { min: domain[0], count: 4 }).ticks }
    : niceTicks(hi, { min: lo >= 0 ? Math.floor(lo * 0.8) : lo, count: 4 });
  const m = { top: 20, right: 16, bottom: 28, left: 40 };
  const plotW = Math.max(width - m.left - m.right, 10);
  const plotH = HEIGHT - m.top - m.bottom;
  const y = (v) => m.top + plotH - ((v - min) / (max - min)) * plotH;
  const x = (i) => (days.length === 1 ? m.left + plotW / 2 : m.left + (plotW * i) / (days.length - 1));
  const labels = days.map((d) => formatShortDate(d.date));
  const path = days.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(valueOf(d))}`).join(' ');

  function onMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const i = Math.round(((px - m.left) / plotW) * (days.length - 1));
    setHover(Math.min(Math.max(days.length === 1 ? 0 : i, 0), days.length - 1));
  }

  const active = hover === null ? null : { i: hover, day: days[hover] };

  return (
    <div ref={ref} className="svg-chart" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label={ariaLabel}>
          <ValueGrid ticks={ticks} y={y} left={m.left} right={width - m.right} format={(v) => (domain ? format(v) : numberTr(v))} />
          {active && <line x1={x(active.i)} x2={x(active.i)} y1={m.top} y2={m.top + plotH} className="crosshair" />}
          {days.length > 1 && <path d={path} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
          {days.map((d, i) => (
            <circle
              key={d.date}
              cx={x(i)}
              cy={y(valueOf(d))}
              r={active?.i === i ? 5 : 4}
              fill="var(--series-1)"
              stroke="var(--bg)"
              strokeWidth="2"
            />
          ))}
          {!active && (
            <text x={x(days.length - 1)} y={y(valueOf(days[days.length - 1])) - 12} textAnchor="end" className="value-text">
              {format(valueOf(days[days.length - 1]))}
            </text>
          )}
          <CategoryLabels labels={labels} x={x} baseline={m.top + plotH} maxLabels={Math.floor(plotW / 52)} />
          <rect x={m.left} y={m.top} width={plotW} height={plotH} fill="transparent" onMouseMove={onMove} />
        </svg>
      )}
      <Tip
        width={width}
        tip={
          active && {
            x: x(active.i) + 12,
            y: y(valueOf(active.day)),
            title: labels[active.i],
            lines: [{ label, text: format(valueOf(active.day)) }],
          }
        }
      />
    </div>
  );
}

// Günlük net değişimi
export function NetLine({ days, ariaLabel }) {
  return (
    <TrendLine days={days} valueOf={(d) => d.net} format={formatNet} label="Net" ariaLabel={ariaLabel} />
  );
}

// Zaman içinde doğruluk oranı (0–100 sabit eksen: yüzdeler birbiriyle kıyaslanabilsin)
export function AccuracyLine({ days, ariaLabel }) {
  return (
    <TrendLine
      days={days}
      valueOf={(d) => d.accuracy}
      format={formatPercent}
      label="Doğruluk"
      domain={[0, 100]}
      ariaLabel={ariaLabel}
    />
  );
}
