import { useMemo } from 'react';
import { clsx } from 'clsx';

const CHART_WIDTH = 100;
const CHART_PADDING = { top: 20, right: 10, bottom: 40, left: 35 };

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  horizontal?: boolean;
  onItemClick?: (item: { label: string; value: number }) => void;
}

export function BarChart({ data, height = 220, color = '#3b82f6', horizontal = false, onItemClick }: BarChartProps) {
  const maxValue = useMemo(() => {
    const max = Math.max(...data.map(d => d.value), 1);
    return Math.ceil(max * 1.2);
  }, [data]);

  const chartWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const barWidth = (chartWidth / data.length) * 0.6;
  const barGap = (chartWidth / data.length) * 0.4;

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

  if (horizontal) {
    return (
      <div className="w-full space-y-2" style={{ maxHeight: height, overflowY: 'auto' }}>
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          return (
            <div
              key={index}
              onClick={() => onItemClick?.(item)}
              className={clsx(
                'flex items-center gap-3 rounded-md transition-colors',
                onItemClick && item.value > 0 && 'cursor-pointer hover:bg-gray-50'
              )}
            >
              <div className="w-24 flex-shrink-0 text-xs text-gray-600 truncate text-right">
                {item.label}
              </div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                    opacity: 0.85 - (index * 0.05),
                  }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-gray-700">
                  {item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${height}`} className="w-full h-full" preserveAspectRatio="none">
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
              x={CHART_PADDING.left - 3}
              y={tick.y + 2}
              textAnchor="end"
              fontSize="3"
              fill="#9ca3af"
            >
              {tick.value}
            </text>
          </g>
        ))}

        {data.map((item, i) => {
          const x = CHART_PADDING.left + i * (barWidth + barGap) + barGap / 2;
          const barHeight = (item.value / maxValue) * chartHeight;
          const y = CHART_PADDING.top + chartHeight - barHeight;
          return (
            <g
              key={i}
              onClick={() => onItemClick?.(item)}
              className={onItemClick && item.value > 0 ? 'cursor-pointer' : undefined}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx="1"
                className="transition-all duration-500 hover:opacity-80"
              />
              <text
                x={x + barWidth / 2}
                y={y - 3}
                textAnchor="middle"
                fontSize="3"
                fill="#374151"
                fontWeight="500"
              >
                {item.value}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - CHART_PADDING.bottom + 10}
                textAnchor="middle"
                fontSize="2.5"
                fill="#6b7280"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface RankItemProps {
  rank: number;
  label: string;
  value: number;
  subValue?: string;
  maxValue: number;
  color?: string;
  onClick?: () => void;
}

export function RankItem({ rank, label, value, subValue, maxValue, color = '#ef4444', onClick }: RankItemProps) {
  const percentage = (value / maxValue) * 100;
  
  const rankColors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#6b7280'];
  const rankBgColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-gray-400'];

  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 rounded-md transition-colors',
        onClick && 'cursor-pointer hover:bg-gray-50'
      )}
    >
      <div className={clsx(
        'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0',
        rank <= 3 ? rankBgColors[rank - 1] : 'bg-gray-300'
      )}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-800 truncate">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: rank <= 3 ? color : '#6b7280' }}>
              {value}
            </span>
            {subValue && (
              <span className="text-xs text-gray-400">{subValue}</span>
            )}
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${percentage}%`,
              backgroundColor: rank <= 3 ? rankColors[rank - 1] : '#9ca3af',
            }}
          />
        </div>
      </div>
    </div>
  );
}
