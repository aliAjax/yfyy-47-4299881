import {
  HandlerUnit,
  NotificationRecipientRole,
  NotificationType,
  SupervisionNotification,
  Ticket,
} from '@/types';
import { formatDateTime, generateId } from '@/utils/date';

interface NotificationInput {
  type: NotificationType;
  ticket: Ticket;
  title: string;
  content: string;
  operator: string;
  recipientRole: NotificationRecipientRole;
  recipientUnit?: HandlerUnit;
  createTime?: string;
}

export function createNotification(input: NotificationInput): SupervisionNotification {
  return {
    id: generateId(),
    type: input.type,
    title: input.title,
    content: input.content,
    ticketId: input.ticket.id,
    ticketTitle: input.ticket.title,
    handlerUnit: input.ticket.handlerUnit,
    recipientRole: input.recipientRole,
    recipientUnit: input.recipientUnit,
    operator: input.operator,
    createTime: input.createTime || formatDateTime(new Date()),
    isRead: false,
  };
}

export function canReadNotification(
  notification: SupervisionNotification,
  role: 'handler' | 'supervisor',
  unit?: string
) {
  if (notification.recipientRole === 'all') return true;
  if (notification.recipientRole === 'supervisor') return role === 'supervisor';
  return role === 'handler' && Boolean(unit) && notification.recipientUnit === unit;
}
