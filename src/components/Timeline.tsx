import { ProgressLog } from '@/types';
import { 
  FilePlus, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw,
  Archive,
  Users,
  MessageSquare,
  CheckSquare
} from 'lucide-react';
import { clsx } from 'clsx';

interface TimelineProps {
  logs: ProgressLog[];
}

const iconMap = {
  create: FilePlus,
  assign: Send,
  progress: RefreshCw,
  complete: CheckCircle2,
  urge: AlertTriangle,
  return: RotateCcw,
  archive: Archive,
  coorg_assign: Users,
  coorg_progress: MessageSquare,
  coorg_complete: CheckSquare,
};

const colorMap = {
  create: 'bg-blue-500',
  assign: 'bg-purple-500',
  progress: 'bg-blue-500',
  complete: 'bg-green-500',
  urge: 'bg-red-500',
  return: 'bg-orange-500',
  archive: 'bg-gray-500',
  coorg_assign: 'bg-indigo-500',
  coorg_progress: 'bg-indigo-400',
  coorg_complete: 'bg-teal-500',
};

export function Timeline({ logs }: TimelineProps) {
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
  );

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
      
      <div className="space-y-6">
        {sortedLogs.map((log, index) => {
          const Icon = iconMap[log.type] || FilePlus;
          const isFirst = index === 0;
          
          return (
            <div key={log.id} className="relative flex items-start">
              {/* Icon */}
              <div className={clsx(
                'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white ring-4 ring-white',
                colorMap[log.type],
                isFirst && 'animate-pulse'
              )}>
                <Icon className="h-4 w-4" />
              </div>
              
              {/* Content */}
              <div className="ml-4 flex-1 pb-1">
                <div className="flex items-center justify-between">
                  <p className={clsx(
                    'text-sm font-medium',
                    log.type === 'urge' && 'text-red-700',
                    log.type === 'return' && 'text-orange-700',
                    log.type === 'complete' && 'text-green-700',
                    log.type === 'archive' && 'text-purple-700',
                    log.type === 'coorg_assign' && 'text-indigo-700',
                    log.type === 'coorg_progress' && 'text-indigo-600',
                    log.type === 'coorg_complete' && 'text-teal-700',
                    !['urge', 'return', 'complete', 'archive', 'coorg_assign', 'coorg_progress', 'coorg_complete'].includes(log.type) && 'text-gray-900'
                  )}>
                    {log.content}
                  </p>
                  <span className="text-xs text-gray-400">{log.createTime}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">操作人：{log.operator}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
