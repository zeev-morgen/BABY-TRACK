import { useId, useState } from 'react';

export interface ChartPoint {
  /** גיל בחודשים */
  x: number;
  y: number;
  label: string;
}

interface GrowthChartProps {
  title: string;
  unit: string;
  color: string;
  points: ChartPoint[];
}

const W = 320;
const H = 168;
const PAD = { top: 14, right: 14, bottom: 26, left: 40 };

function niceTicks(min: number, max: number): number[] {
  if (min === max) return [min];
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / 2)));
  const candidates = [step, step * 2, step * 5, step * 10];
  const chosen = candidates.find((c) => span / c <= 4) ?? step * 10;
  const start = Math.floor(min / chosen) * chosen;
  const ticks: number[] = [];
  for (let value = start; value <= max + chosen * 0.001; value += chosen) {
    const tick = Number(value.toFixed(4));
    // רק סימונים שנופלים בתוך התחום המצויר — אחרת התווית נחתכת מתחת לגרף
    if (tick >= min - chosen * 0.001 && tick <= max + chosen * 0.001) ticks.push(tick);
  }
  return ticks;
}

/**
 * גרף קטן לכל מדד בנפרד (משקל / אורך / היקף ראש).
 * כל מדד מקבל ציר משלו — אף פעם לא שני סרגלים על אותו גרף.
 */
export function GrowthChart({ title, unit, color, points }: GrowthChartProps) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="card">
        <h3 className="card__title">{title}</h3>
        <p className="muted small" style={{ marginTop: 6 }}>
          אין עדיין מדידות — מלאו את הטבלה למעלה והגרף יופיע כאן.
        </p>
      </div>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs, xMin + 1);
  const rawMin = Math.min(...ys);
  const rawMax = Math.max(...ys);
  const padY = (rawMax - rawMin) * 0.15 || Math.max(rawMax * 0.08, 0.5);
  const yMin = Math.max(0, rawMin - padY);
  const yMax = rawMax + padY;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const sy = (y: number) => PAD.top + plotH - ((y - yMin) / (yMax - yMin || 1)) * plotH;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${path} L${sx(points[points.length - 1].x).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${sx(points[0].x).toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`;
  const ticks = niceTicks(yMin, yMax);
  const last = points[points.length - 1];
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="card">
      <h3 className="card__title" style={{ marginBottom: 2 }}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 12,
            height: 3,
            borderRadius: 2,
            background: color,
            marginInlineEnd: 7,
            verticalAlign: 'middle',
          }}
        />
        {title}
      </h3>
      <p className="card__sub">
        {points.length === 1 ? 'מדידה אחת' : `${points.length} מדידות`} · {unit}
      </p>

      <div dir="ltr" style={{ position: 'relative', marginTop: 8 }}>
        <svg
          className="chart"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${title} לפי גיל בחודשים. ${points.map((p) => `חודש ${p.x}: ${p.label}`).join(', ')}`}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={sy(tick)}
                y2={sy(tick)}
                stroke="var(--line)"
                strokeWidth="1"
              />
              <text x={PAD.left - 6} y={sy(tick) + 3.5} textAnchor="end" fontSize="9" fill="var(--muted)">
                {tick}
              </text>
            </g>
          ))}

          {points.length > 1 ? <path d={area} fill={`url(#${gradientId})`} /> : null}
          {points.length > 1 ? (
            <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}

          {points.map((point, index) => (
            <g key={`${point.x}-${index}`}>
              <circle cx={sx(point.x)} cy={sy(point.y)} r="4.5" fill={color} stroke="var(--chart-surface)" strokeWidth="2" />
              <circle
                cx={sx(point.x)}
                cy={sy(point.y)}
                r="12"
                fill="transparent"
                onMouseEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                role="button"
                aria-label={`חודש ${point.x}: ${point.label}`}
              />
              <text x={sx(point.x)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--muted)">
                {point.x}
              </text>
            </g>
          ))}

          <text
            x={sx(last.x)}
            y={sy(last.y) - 10}
            textAnchor={sx(last.x) > W - 60 ? 'end' : 'middle'}
            fontSize="10"
            fontWeight="700"
            fill="var(--ink)"
          >
            {last.label}
          </text>
        </svg>

        {active ? (
          <div
            dir="rtl"
            style={{
              position: 'absolute',
              insetInlineStart: `${(sx(active.x) / W) * 100}%`,
              top: `${(sy(active.y) / H) * 100}%`,
              transform: 'translate(-50%, -140%)',
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderRadius: 8,
              padding: '4px 9px',
              fontSize: '0.8rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-sm)',
              pointerEvents: 'none',
            }}
          >
            חודש {active.x} · {active.label}
          </div>
        ) : null}
      </div>
    </div>
  );
}
