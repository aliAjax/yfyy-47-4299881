import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface DashboardCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  action?: ReactNode;
}

export function DashboardCard({
  title,
  icon: Icon,
  children,
  className,
  contentClassName,
  action,
}: DashboardCardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden',
        'hover:shadow-md transition-shadow duration-300',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary-600" />
            </div>
          )}
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className={clsx('p-4', contentClassName)}>{children}</div>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number | string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  icon?: LucideIcon;
  trend?: 'up' | 'down';
  trendValue?: string;
  onClick?: () => void;
}

const colorStyles = {
  blue: 'text-blue-600 bg-blue-50',
  green: 'text-green-600 bg-green-50',
  yellow: 'text-yellow-600 bg-yellow-50',
  red: 'text-red-600 bg-red-50',
  purple: 'text-purple-600 bg-purple-50',
};

export function StatItem({
  label,
  value,
  color = 'blue',
  icon: Icon,
  trend,
  trendValue,
  onClick,
}: StatItemProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-100',
        onClick && 'cursor-pointer hover:shadow-sm transition-shadow'
      )}
    >
      {Icon && (
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', colorStyles[color])}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-gray-900">{value}</span>
          {trend && trendValue && (
            <span className={clsx(
              'text-xs font-medium',
              trend === 'up' ? 'text-green-500' : 'text-red-500'
            )}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
