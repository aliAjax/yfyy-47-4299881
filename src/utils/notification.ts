import { Notification, NotificationType, NOTIFICATION_TYPE_LABELS } from '@/types';
import { generateId, formatDateTime } from './date';

export function createNotification(
  type: NotificationType,
  ticketId: string,
  ticketTitle: string,
  content: string,
  operator?: string,
  relatedId?: string
): Notification {
  return {
    id: generateId(),
    type,
    title: NOTIFICATION_TYPE_LABELS[type],
    content,
    ticketId,
    ticketTitle,
    isRead: false,
    createTime: formatDateTime(new Date()),
    operator,
    relatedId,
  };
}

export function getNotificationIconType(type: NotificationType): string {
  const iconMap: Record<NotificationType, string> = {
    urge: 'bell-ringing',
    return: 'rotate-ccw',
    overdue_soon: 'alert-triangle',
    coorg_request: 'users',
    result_submit: 'check-circle',
  };
  return iconMap[type];
}

export function getNotificationColorClass(type: NotificationType): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const colorMap: Record<NotificationType, { bg: string; text: string; border: string; dot: string }> = {
    urge: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
    return: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
    overdue_soon: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    coorg_request: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    result_submit: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  };
  return colorMap[type];
}
