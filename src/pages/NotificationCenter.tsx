import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Clock,
  Filter,
  RotateCcw,
  Send,
  Users,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useTicketStore } from '@/store/useTicketStore';
import {
  DeadlineNotificationScope,
  DeadlineRiskStage,
  NOTIFICATION_TYPE_LABELS,
  NotificationReadStatus,
  NotificationType,
} from '@/types';
import { clsx } from 'clsx';

const typeOptions: Array<{ value: NotificationType | ''; label: string }> = [
  { value: '', label: '全部类型' },
  { value: 'urge', label: NOTIFICATION_TYPE_LABELS.urge },
  { value: 'return', label: NOTIFICATION_TYPE_LABELS.return },
  { value: 'deadline', label: NOTIFICATION_TYPE_LABELS.deadline },
  { value: 'collaboration_request', label: NOTIFICATION_TYPE_LABELS.collaboration_request },
  { value: 'collaboration_complete', label: NOTIFICATION_TYPE_LABELS.collaboration_complete },
  { value: 'result_submit', label: NOTIFICATION_TYPE_LABELS.result_submit },
];

const readOptions: Array<{ value: NotificationReadStatus; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'unread', label: '未读' },
  { value: 'read', label: '已读' },
];

const iconMap = {
  urge: Bell,
  return: RotateCcw,
  deadline: Clock,
  collaboration_request: Users,
  collaboration_complete: CheckCircle,
  result_submit: Send,
};

const colorMap = {
  urge: 'bg-orange-100 text-orange-700',
  return: 'bg-red-100 text-red-700',
  deadline: 'bg-amber-100 text-amber-700',
  collaboration_request: 'bg-cyan-100 text-cyan-700',
  collaboration_complete: 'bg-green-100 text-green-700',
  result_submit: 'bg-blue-100 text-blue-700',
};

const riskStageMap: Record<DeadlineRiskStage, { label: string; className: string }> = {
  overdue: { label: '已超期', className: 'bg-red-100 text-red-700' },
  within_1_day: { label: '高风险', className: 'bg-orange-100 text-orange-700' },
  within_3_days: { label: '中风险', className: 'bg-yellow-100 text-yellow-700' },
};

const deadlineScopeLabels: Record<DeadlineNotificationScope, string> = {
  primary_handler: '主办单位',
  primary_supervisor: '主办督办',
  collaboration_handler: '协办单位',
  collaboration_supervisor: '协办督办',
};

function formatRemainingWorkdays(days?: number) {
  if (days === undefined) return '';
  if (days < 0) return `超期${Math.abs(days)}个工作日`;
  if (days === 0) return '今天到期';
  return `剩余${days}个工作日`;
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { currentRole, currentUnit } = useTicketStore();
  const {
    filters,
    setFilters,
    resetFilters,
    getVisibleNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const notifications = getVisibleNotifications(currentRole, currentUnit);
  const unreadCount = getUnreadCount(currentRole, currentUnit);

  const groupedStats = useMemo(() => {
    return typeOptions
      .filter(option => option.value)
      .map(option => ({
        ...option,
        count: notifications.filter(notification => notification.type === option.value).length,
      }));
  }, [notifications]);

  const handleOpenNotification = (notificationId: string, ticketId: string) => {
    markAsRead(notificationId);
    navigate(`/tickets/${ticketId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">通知中心</h2>
          <p className="mt-1 text-sm text-gray-500">
            当前身份可见通知，按类型和已读状态筛选
          </p>
        </div>
        <button
          onClick={() => markAllAsRead(currentRole, currentUnit)}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" />
          全部已读
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">未读通知</p>
          <p className="mt-2 text-2xl font-semibold text-primary-700">{unreadCount}</p>
        </div>
        {groupedStats.map(stat => (
          <div key={stat.value} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="truncate text-xs font-medium text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.count}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="h-4 w-4 text-gray-400" />
            通知筛选
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={filters.type}
              onChange={(event) => setFilters({ type: event.target.value as NotificationType | '' })}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              {typeOptions.map(option => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={filters.readStatus}
              onChange={(event) => setFilters({ readStatus: event.target.value as NotificationReadStatus })}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              {readOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={resetFilters}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              重置
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="py-16 text-center">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">暂无符合条件的通知</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map(notification => {
              const Icon = iconMap[notification.type];
              return (
                <button
                  key={notification.id}
                  onClick={() => handleOpenNotification(notification.id, notification.ticketId)}
                  className={clsx(
                    'flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50',
                    !notification.isRead && 'bg-primary-50/50'
                  )}
                >
                  <div className={clsx(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                    colorMap[notification.type]
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary-600" />
                      )}
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {NOTIFICATION_TYPE_LABELS[notification.type]}
                      </span>
                      {notification.type === 'deadline' && notification.riskStage && (
                        <span className={clsx(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          riskStageMap[notification.riskStage].className
                        )}>
                          {riskStageMap[notification.riskStage].label}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{notification.createTime}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{notification.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{notification.content}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>工单编号：{notification.ticketId}</span>
                      <span>承办单位：{notification.handlerUnit}</span>
                      {notification.type === 'deadline' && notification.deadlineScope && (
                        <span>
                          接收范围：{deadlineScopeLabels[notification.deadlineScope]}
                          {notification.targetUnit ? `：${notification.targetUnit}` : ''}
                        </span>
                      )}
                      {notification.type === 'deadline' && notification.remainingWorkdays !== undefined && (
                        <span>时限状态：{formatRemainingWorkdays(notification.remainingWorkdays)}</span>
                      )}
                      <span>操作人：{notification.operator}</span>
                    </div>
                  </div>
                  <ChevronRight className="mt-3 h-4 w-4 flex-shrink-0 text-gray-400" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
