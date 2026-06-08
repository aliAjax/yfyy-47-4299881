import { useMemo } from 'react';

const CHART_WIDTH = 100;
const CHART_PADDING = { top: 20, right: 10, bottom: 30, left: 40 };

interface LineChartProps {
  data: { date: string; count: number }[];
  height?: number;
  color?: string;
}

export function LineChart({ data, height = 200, color = '#3b82f6' }: LineChartProps) {
  const maxValue = useMemo(() => {
    const max = Math.max(...data.map(d => d.count), 1);
    return Math.ceil(max * 1.2);
  }, [data]);

  const chartWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  const points = useMemo(() => {
    return data.map((d, i) => {
      const x = CHART_PADDING.left + (i / (data.length - 1 || 1)) * chartWidth;
      const y = CHART_PADDING.top + chartHeight - (d.count / maxValue) * chartHeight;
      return { x, y, ...d };
    });
  }, [data, maxValue, chartWidth, chartHeight]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    const baseY = CHART_PADDING.top + chartHeight;
    let d = `M ${points[0].x} ${baseY}`;
    d += ` L ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    d += ` L ${points[points.length - 1].x} ${baseY} Z`;
    return d;
  }, [points, chartHeight]);

  const yTicks = useMemo(() => {
    const ticks = [];
    const step = Math.ceil(maxValue / 4);
    for (let i = 0; i <= 4; i++) {
      ticks.push({
        value: step * i,
        y: CHART_PADDING.top + chartHeight - (step * i / maxValue) * chartHeight,
      });
    }
    return ticks;
  }, [maxValue, chartHeight]);

  const gradientId = `line-gradient-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={CHART_PADDING.left}
              y1={tick.y}
              x2={CHART_WIDTH - CHART_PADDING.right}
              y2={tick.y}
              stroke="#e5e7eb"
              strokeWidth="0.3"
              strokeDasharray="2,2"
            />
            <text
              x={CHART_PADDING.left - 5}
              y={tick.y + 2}
              textAnchor="end"
              fontSize="3"
              fill="#9ca3af"
            >
              {tick.value}
            </text>
          </g>
        ))}

        <path d={areaD} fill={`url(#${gradientId})`} />

        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, i) => (
          <g key={i}>
            <circle cx={point.x} cy={point.y} r="2" fill={color} />
            <text
              x={point.x}
              y={height - CHART_PADDING.bottom + 12}
              textAnchor="middle"
              fontSize="3"
              fill="#6b7280"
            >
              {point.date}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
