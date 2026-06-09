import { useMemo } from 'react';

interface PieChartProps {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  innerRadius?: number;
  onItemClick?: (item: { label: string; value: number }) => void;
}

const DEFAULT_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

export function PieChart({ data, size = 180, innerRadius = 50, onItemClick }: PieChartProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  const segments = useMemo(() => {
    let currentAngle = -90;
    return data.map((item, index) => {
      const angle = total > 0 ? (item.value / total) * 360 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const outerRadius = size / 2 - 10;
      const x1 = size / 2 + outerRadius * Math.cos(startRad);
      const y1 = size / 2 + outerRadius * Math.sin(startRad);
      const x2 = size / 2 + outerRadius * Math.cos(endRad);
      const y2 = size / 2 + outerRadius * Math.sin(endRad);

      const ix1 = size / 2 + innerRadius * Math.cos(endRad);
      const iy1 = size / 2 + innerRadius * Math.sin(endRad);
      const ix2 = size / 2 + innerRadius * Math.cos(startRad);
      const iy2 = size / 2 + innerRadius * Math.sin(startRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path = [
        `M ${x1} ${y1}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}`,
        'Z',
      ].join(' ');

      return {
        path,
        color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        value: item.value,
        label: item.label,
        rawItem: item,
        percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
      };
    });
  }, [data, total, size, innerRadius]);

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill={segment.color}
              onClick={() => onItemClick?.(segment.rawItem)}
              className={`transition-all duration-300 hover:opacity-80 ${onItemClick && segment.value > 0 ? 'cursor-pointer' : ''}`}
            />
          ))}
          <text
            x={size / 2}
            y={size / 2 - 8}
            textAnchor="middle"
            className="text-2xl font-bold fill-gray-800"
          >
            {total}
          </text>
          <text
            x={size / 2}
            y={size / 2 + 12}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            工单总数
          </text>
        </svg>
      </div>
      <div className="flex-1 space-y-2">
        {segments.map((segment, index) => (
          <div
            key={index}
            onClick={() => onItemClick?.(segment.rawItem)}
            className={`flex items-center gap-2 rounded px-1 py-0.5 transition-colors ${onItemClick && segment.value > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-xs text-gray-600 flex-1 truncate">{segment.label}</span>
            <span className="text-xs font-medium text-gray-800">{segment.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
