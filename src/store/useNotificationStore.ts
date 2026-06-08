import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  NotificationReadStatus,
  NotificationType,
  SupervisionNotification,
  Ticket,
} from '@/types';
import { createNotification, canReadNotification } from '@/utils/notification';
import { getWorkdaysRemaining } from '@/utils/workday';
import { useHolidayStore } from '@/store/useHolidayStore';

interface NotificationFilters {
  type: NotificationType | '';
  readStatus: NotificationReadStatus;
}

interface NotificationState {
  notifications: SupervisionNotification[];
  deadlineNotifiedTicketIds: string[];
  filters: NotificationFilters;

  addNotification: (notification: SupervisionNotification) => void;
  addNotifications: (notifications: SupervisionNotification[]) => void;
  setFilters: (filters: Partial<NotificationFilters>) => void;
  resetFilters: () => void;
  markAsRead: (notificationId: string) => void;
  markTicketNotificationsAsRead: (ticketId: string, role: 'handler' | 'supervisor', unit?: string) => void;
  markAllAsRead: (role: 'handler' | 'supervisor', unit?: string) => void;
  getVisibleNotifications: (role: 'handler' | 'supervisor', unit?: string) => SupervisionNotification[];
  getUnreadCount: (role: 'handler' | 'supervisor', unit?: string) => number;
  syncDeadlineNotifications: (tickets: Ticket[]) => void;
}

const initialFilters: NotificationFilters = {
  type: '',
  readStatus: 'all',
};

function getHolidayDatesSafe(): { holidayDates: string[]; workdayDates: string[] } {
  try {
    const state = useHolidayStore?.getState?.();
    if (state && typeof state.getHolidayDatesByType === 'function') {
      return {
        holidayDates: state.getHolidayDatesByType('holiday') || [],
        workdayDates: state.getHolidayDatesByType('workday') || [],
      };
    }
  } catch {
    // ignore optional holiday store availability during persistence hydration
  }
  return { holidayDates: [], workdayDates: [] };
}

function sortByCreateTime(notifications: SupervisionNotification[]) {
  return [...notifications].sort(
    (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
  );
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      deadlineNotifiedTicketIds: [],
      filters: initialFilters,

      addNotification: (notification) => {
        set((state) => ({
          notifications: sortByCreateTime([notification, ...state.notifications]),
        }));
      },

      addNotifications: (notifications) => {
        if (notifications.length === 0) return;
        set((state) => ({
          notifications: sortByCreateTime([...notifications, ...state.notifications]),
        }));
      },

      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
      })),

      resetFilters: () => set({ filters: initialFilters }),

      markAsRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map(notification =>
            notification.id === notificationId ? { ...notification, isRead: true } : notification
          ),
        }));
      },

      markTicketNotificationsAsRead: (ticketId, role, unit) => {
        set((state) => ({
          notifications: state.notifications.map(notification =>
            notification.ticketId === ticketId && canReadNotification(notification, role, unit)
              ? { ...notification, isRead: true }
              : notification
          ),
        }));
      },

      markAllAsRead: (role, unit) => {
        set((state) => ({
          notifications: state.notifications.map(notification =>
            canReadNotification(notification, role, unit)
              ? { ...notification, isRead: true }
              : notification
          ),
        }));
      },

      getVisibleNotifications: (role, unit) => {
        const { filters, notifications } = get();
        return sortByCreateTime(notifications)
          .filter(notification => canReadNotification(notification, role, unit))
          .filter(notification => !filters.type || notification.type === filters.type)
          .filter(notification => {
            if (filters.readStatus === 'unread') return !notification.isRead;
            if (filters.readStatus === 'read') return notification.isRead;
            return true;
          });
      },

      getUnreadCount: (role, unit) => {
        return get().notifications.filter(notification =>
          !notification.isRead && canReadNotification(notification, role, unit)
        ).length;
      },

      syncDeadlineNotifications: (tickets) => {
        const { holidayDates, workdayDates } = getHolidayDatesSafe();
        const { deadlineNotifiedTicketIds } = get();
        const notified = new Set(deadlineNotifiedTicketIds);
        const activeTicketIds = new Set(
          tickets
            .filter(ticket => ticket.status !== 'completed' && ticket.status !== 'archived')
            .map(ticket => ticket.id)
        );

        const newNotifications = tickets.flatMap(ticket => {
          if (ticket.status === 'completed' || ticket.status === 'archived') return [];
          if (notified.has(ticket.id)) return [];

          const remaining = getWorkdaysRemaining(ticket.deadline, new Date(), holidayDates, workdayDates);
          if (remaining < 0 || remaining > 3) return [];

          return [
            createNotification({
              type: 'deadline',
              ticket,
              title: '工单即将超期',
              content: `${ticket.id} 剩余${remaining}个工作日到期，请及时跟进办理。`,
              operator: '系统',
              recipientRole: 'handler',
              recipientUnit: ticket.handlerUnit,
            }),
            createNotification({
              type: 'deadline',
              ticket,
              title: '工单即将超期',
              content: `${ticket.id} 剩余${remaining}个工作日到期，请关注承办进度。`,
              operator: '系统',
              recipientRole: 'supervisor',
            }),
          ];
        });

        if (newNotifications.length === 0) {
          set({
            deadlineNotifiedTicketIds: deadlineNotifiedTicketIds.filter(ticketId => activeTicketIds.has(ticketId)),
          });
          return;
        }

        const newTicketIds = Array.from(new Set(newNotifications.map(notification => notification.ticketId)));
        set((state) => ({
          notifications: sortByCreateTime([...newNotifications, ...state.notifications]),
          deadlineNotifiedTicketIds: Array.from(new Set([
            ...state.deadlineNotifiedTicketIds.filter(ticketId => activeTicketIds.has(ticketId)),
            ...newTicketIds,
          ])),
        }));
      },
    }),
    {
      name: 'notification-storage',
    }
  )
);
