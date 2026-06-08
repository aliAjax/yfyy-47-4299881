import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Notification, NotificationType } from '@/types';
import { createNotification } from '@/utils/notification';
import { useTicketStore } from './useTicketStore';

interface NotificationFilter {
  type: NotificationType | '';
  readStatus: 'all' | 'unread' | 'read';
}

interface NotificationState {
  notifications: Notification[];
  filter: NotificationFilter;
  
  addNotification: (notification: Notification) => void;
  addNotificationByType: (
    type: NotificationType,
    ticketId: string,
    content: string,
    operator?: string,
    relatedId?: string
  ) => void;
  
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  markAllByTypeAsRead: (type: NotificationType) => void;
  
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  clearReadNotifications: () => void;
  
  setFilter: (filter: Partial<NotificationFilter>) => void;
  resetFilter: () => void;
  
  getFilteredNotifications: () => Notification[];
  getUnreadCount: () => number;
  getUnreadCountByType: (type: NotificationType) => number;
  getNotificationStats: () => Record<NotificationType, { total: number; unread: number }>;
  
  checkOverdueSoon: () => void;
}

const initialFilter: NotificationFilter = {
  type: '',
  readStatus: 'all',
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      filter: initialFilter,

      addNotification: (notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
        }));
      },

      addNotificationByType: (type, ticketId, content, operator, relatedId) => {
        const ticket = useTicketStore.getState().getTicketById(ticketId);
        if (!ticket) return;
        
        const notification = createNotification(
          type,
          ticketId,
          ticket.title,
          content,
          operator,
          relatedId
        );
        
        set((state) => ({
          notifications: [notification, ...state.notifications],
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        }));
      },

      markAllByTypeAsRead: (type) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.type === type ? { ...n, isRead: true } : n
          ),
        }));
      },

      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearAllNotifications: () => {
        set({ notifications: [] });
      },

      clearReadNotifications: () => {
        set((state) => ({
          notifications: state.notifications.filter((n) => !n.isRead),
        }));
      },

      setFilter: (filter) => {
        set((state) => ({
          filter: { ...state.filter, ...filter },
        }));
      },

      resetFilter: () => {
        set({ filter: initialFilter });
      },

      getFilteredNotifications: () => {
        const { notifications, filter } = get();
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
      },

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.isRead).length;
      },

      getUnreadCountByType: (type) => {
        return get().notifications.filter((n) => n.type === type && !n.isRead).length;
      },

      getNotificationStats: () => {
        const { notifications } = get();
        const stats = {} as Record<NotificationType, { total: number; unread: number }>;
        
        const types: NotificationType[] = ['urge', 'return', 'overdue_soon', 'coorg_request', 'result_submit'];
        types.forEach((type) => {
          const typeNotifications = notifications.filter((n) => n.type === type);
          stats[type] = {
            total: typeNotifications.length,
            unread: typeNotifications.filter((n) => !n.isRead).length,
          };
        });
        
        return stats;
      },

      checkOverdueSoon: () => {
        const { getRiskTickets } = useTicketStore.getState();
        const { notifications } = get();
        const { high, medium } = getRiskTickets();
        const atRiskTickets = [...high, ...medium].filter(t => t.status !== 'completed');
        
        const today = new Date().toDateString();
        
        atRiskTickets.forEach((ticket) => {
          const existingNotification = notifications.find(
            (n) => n.type === 'overdue_soon' && n.relatedId === `${ticket.id}-${today}`
          );
          
          if (!existingNotification) {
            const content = ticket.status === 'overdue' 
              ? '工单已超期，请尽快处理！' 
              : '工单即将超期，请抓紧办理！';
            
            const notification = createNotification(
              'overdue_soon',
              ticket.id,
              ticket.title,
              content,
              '系统',
              `${ticket.id}-${today}`
            );
            
            set((state) => ({
              notifications: [notification, ...state.notifications],
            }));
          }
        });
      },
    }),
    {
      name: 'notification-storage',
    }
  )
);
