import { ProgressLog } from '@/types';
import { 
  FilePlus, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw,
  Users,
  Archive
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
  collaboration: Users,
  archive: Archive,
};

const colorMap = {
  create: 'bg-blue-500',
  assign: 'bg-purple-500',
  progress: 'bg-blue-500',
  complete: 'bg-green-500',
  urge: 'bg-red-500',
  return: 'bg-orange-500',
  collaboration: 'bg-cyan-500',
  archive: 'bg-gray-500',
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
                    log.type === 'collaboration' && 'text-cyan-700',
                    log.type === 'complete' && 'text-green-700',
                    log.type === 'archive' && 'text-gray-700',
                    !['urge', 'return', 'collaboration', 'complete', 'archive'].includes(log.type) && 'text-gray-900'
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
