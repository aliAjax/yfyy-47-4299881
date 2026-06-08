import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  RotateCcw,
  Users,
  CheckCircle,
  Check,
  Trash2,
  Filter,
  Inbox,
  X,
  ChevronRight
} from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { NOTIFICATION_TYPE_LABELS, NotificationType } from '@/types';
import { clsx } from 'clsx';

const typeIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  urge: Bell,
  return: RotateCcw,
  overdue_soon: AlertTriangle,
  coorg_request: Users,
  result_submit: CheckCircle,
};

const typeColors: Record<NotificationType, { bg: string; text: string; icon: string; dot: string; border: string }> = {
  urge: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600', dot: 'bg-red-500', border: 'border-red-200' },
  return: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600', dot: 'bg-orange-500', border: 'border-orange-200' },
  overdue_soon: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600', dot: 'bg-amber-500', border: 'border-amber-200' },
  coorg_request: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-600', dot: 'bg-indigo-500', border: 'border-indigo-200' },
  result_submit: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600', dot: 'bg-green-500', border: 'border-green-200' },
};

const allTypes: NotificationType[] = ['urge', 'return', 'overdue_soon', 'coorg_request', 'result_submit'];

export default function NotificationCenter() {
  const navigate = useNavigate();
  const notifications = useNotificationStore((state) => state.notifications);
  const filter = useNotificationStore((state) => state.filter);
  const setFilter = useNotificationStore((state) => state.setFilter);
  const resetFilter = useNotificationStore((state) => state.resetFilter);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearReadNotifications = useNotificationStore((state) => state.clearReadNotifications);
  const deleteNotification = useNotificationStore((state) => state.deleteNotification);

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    if (filter.type) {
      filtered = filtered.filter((n) => n.type === filter.type);
    }

    if (filter.readStatus === 'unread') {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (filter.readStatus === 'read') {
      filtered = filtered.filter((n) => n.isRead);
    }

    return filtered.sort(
      (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    );
  }, [notifications, filter]);

  const stats = useMemo(() => {
    const statMap = {} as Record<NotificationType, { total: number; unread: number }>;
    const types: NotificationType[] = ['urge', 'return', 'overdue_soon', 'coorg_request', 'result_submit'];
    types.forEach((type) => {
      const typeNotifications = notifications.filter((n) => n.type === type);
      statMap[type] = {
        total: typeNotifications.length,
        unread: typeNotifications.filter((n) => !n.isRead).length,
      };
    });
    return statMap;
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const handleNotificationClick = (notificationId: string, ticketId: string) => {
    markAsRead(notificationId);
    navigate(`/tickets/${ticketId}`);
  };

  const handleTypeFilter = (type: NotificationType | '') => {
    setFilter({ type });
  };

  const handleReadStatusFilter = (status: 'all' | 'unread' | 'read') => {
    setFilter({ readStatus: status });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">督办通知中心</h1>
          <p className="mt-1 text-sm text-gray-500">
            共 {notifications.length} 条通知，其中 <span className="font-medium text-primary-600">{unreadCount} 条未读</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className={clsx(
              'inline-flex items-center space-x-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              unreadCount > 0
                ? 'border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100'
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            )}
          >
            <Check className="h-4 w-4" />
            <span>全部已读</span>
          </button>
          <button
            onClick={clearReadNotifications}
            disabled={notifications.filter(n => n.isRead).length === 0}
            className={clsx(
              'inline-flex items-center space-x-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              notifications.filter(n => n.isRead).length > 0
                ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            )}
          >
            <Trash2 className="h-4 w-4" />
            <span>清除已读</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {allTypes.map((type) => {
          const Icon = typeIcons[type];
          const colors = typeColors[type];
          const stat = stats[type];
          const isActive = filter.type === type;
          
          return (
            <button
              key={type}
              onClick={() => handleTypeFilter(isActive ? '' : type)}
              className={clsx(
                'rounded-xl border p-4 text-left transition-all',
                isActive
                  ? `${colors.border} ${colors.bg} ring-2 ring-offset-1 ring-${type === 'urge' ? 'red' : type === 'return' ? 'orange' : type === 'overdue_soon' ? 'amber' : type === 'coorg_request' ? 'indigo' : 'green'}-400`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              )}
            >
              <div className="flex items-start justify-between">
                <div className={clsx('flex h-10 w-10 items-center justify-center rounded-lg', colors.bg)}>
                  <Icon className={clsx('h-5 w-5', colors.icon)} />
                </div>
                {stat.unread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium bg-red-500 text-white">
                    {stat.unread}
                  </span>
                )}
              </div>
              <p className={clsx('mt-3 text-sm font-medium', isActive ? colors.text : 'text-gray-700')}>
                {NOTIFICATION_TYPE_LABELS[type]}
              </p>
              <p className={clsx('mt-1 text-2xl font-bold', isActive ? colors.text : 'text-gray-900')}>
                {stat.total}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">筛选：</span>
          <div className="flex items-center space-x-1">
            {(['all', 'unread', 'read'] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleReadStatusFilter(status)}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  filter.readStatus === status
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {status === 'all' ? '全部' : status === 'unread' ? '未读' : '已读'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {filter.type && (
            <button
              onClick={resetFilter}
              className="inline-flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
              <span>清除筛选</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="py-20 text-center">
            <Inbox className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500">暂无通知</p>
            <p className="mt-1 text-xs text-gray-400">
              {filter.type || filter.readStatus !== 'all' ? '尝试调整筛选条件' : '新的通知将会显示在这里'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => {
              const Icon = typeIcons[notification.type];
              const colors = typeColors[notification.type];
              
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.ticketId)}
                  className={clsx(
                    'relative flex items-start space-x-4 p-4 cursor-pointer transition-colors',
                    notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-primary-50/30 hover:bg-primary-50/50'
                  )}
                >
                  {!notification.isRead && (
                    <span className={clsx('absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full', colors.dot)} />
                  )}
                  
                  <div className={clsx(
                    'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg',
                    colors.bg
                  )}>
                    <Icon className={clsx('h-5 w-5', colors.icon)} />
                  </div>
                  
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={clsx('text-sm font-semibold', notification.isRead ? 'text-gray-700' : 'text-gray-900')}>
                          {notification.title}
                        </span>
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          colors.bg,
                          colors.text
                        )}>
                          {NOTIFICATION_TYPE_LABELS[notification.type]}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {notification.createTime}
                      </span>
                    </div>
                    <p className={clsx(
                      'mt-1 text-sm font-medium truncate',
                      notification.isRead ? 'text-gray-600' : 'text-gray-800'
                    )}>
                      {notification.ticketTitle}
                    </p>
                    <p className={clsx(
                      'mt-1 text-sm line-clamp-2',
                      notification.isRead ? 'text-gray-500' : 'text-gray-600'
                    )}>
                      {notification.content}
                    </p>
                    {notification.operator && (
                      <p className="mt-2 text-xs text-gray-400">
                        操作人：{notification.operator}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
