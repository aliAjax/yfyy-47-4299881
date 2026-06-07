import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: 'blue' | 'yellow' | 'green' | 'red';
  onClick?: () => void;
}

const colorStyles = {
  blue: 'from-blue-500 to-blue-600',
  yellow: 'from-yellow-500 to-yellow-600',
  green: 'from-green-500 to-green-600',
  red: 'from-red-500 to-red-600',
};

const iconBgStyles = {
  blue: 'bg-blue-100 text-blue-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
};

export function StatsCard({ title, value, icon: Icon, color, onClick }: StatsCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative overflow-hidden rounded-xl bg-white p-5 shadow-sm transition-all duration-300',
        'hover:shadow-md hover:-translate-y-0.5 cursor-pointer border border-gray-100'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={clsx(
          'flex h-12 w-12 items-center justify-center rounded-xl',
          iconBgStyles[color]
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className={clsx(
        'absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r',
        colorStyles[color]
      )} />
    </div>
  );
}
