import { TicketStatus, STATUS_LABELS } from '@/types';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

const statusStyles: Record<TicketStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  returned: 'bg-orange-100 text-orange-800 border-orange-200',
  archived: 'bg-purple-100 text-purple-800 border-purple-200',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium',
        statusStyles[status],
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}
    >
      <span className={clsx(
        'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
        status === 'pending' && 'bg-yellow-500',
        status === 'processing' && 'bg-blue-500 animate-pulse',
        status === 'completed' && 'bg-green-500',
        status === 'overdue' && 'bg-red-500',
        status === 'returned' && 'bg-orange-500',
        status === 'archived' && 'bg-purple-500',
      )} />
      {STATUS_LABELS[status]}
    </span>
  );
}
