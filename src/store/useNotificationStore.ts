import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Notification, NotificationType, OverdueRiskStage, Ticket } from '@/types';
import { createNotification } from '@/utils/notification';
import { useTicketStore } from './useTicketStore';
import { useHolidayStore } from './useHolidayStore';
import { getWorkdaysRemaining } from '@/utils/workday';

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
    relatedId?: string,
    options?: {
      audience?: 'supervisor' | 'handler_unit' | 'coorg_unit' | 'all';
      targetUnit?: string;
      hasUncompletedCoOrg?: boolean;
    }
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
  getVisibleNotifications: () => Notification[];
  getUnreadCount: () => number;
  getUnreadCountByType: (type: NotificationType) => number;
  getVisibleUnreadCount: () => number;
  getNotificationStats: () => Record<NotificationType, { total: number; unread: number }>;
  
  invalidateStaleOverdueNotifications: () => number;
  refreshOverdueNotifications: () => { invalidated: number; created: number };
  checkOverdueSoon: () => void;
}

const initialFilter: NotificationFilter = {
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
    // ignore
  }
  return { holidayDates: [], workdayDates: [] };
}

function getRiskStage(remaining: number, isOverdue: boolean): OverdueRiskStage | null {
  if (isOverdue || remaining < 0) return 'overdue';
  if (remaining <= 1) return 'within_1_day';
  if (remaining <= 3) return 'within_3_days';
  return null;
}

function buildDedupKey(ticketId: string, riskStage: OverdueRiskStage, scope: string): string {
  return `overdue_soon|${ticketId}|${riskStage}|${scope}`;
}

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

      addNotificationByType: (type, ticketId, content, operator, relatedId, options) => {
        const ticket = useTicketStore.getState().getTicketById(ticketId);
        if (!ticket) return;
        
        const notification = createNotification(
          type,
          ticketId,
          ticket.title,
          content,
          operator,
          relatedId,
          {
            audience: options?.audience,
            targetUnit: options?.targetUnit,
            hasUncompletedCoOrg: options?.hasUncompletedCoOrg,
          }
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
        const visibleIds = new Set(get().getVisibleNotifications().map(n => n.id));
        set((state) => ({
          notifications: state.notifications.map((n) =>
            visibleIds.has(n.id) ? { ...n, isRead: true } : n
          ),
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

      getVisibleNotifications: () => {
        const { notifications } = get();
        const { currentRole, currentUnit } = useTicketStore.getState();
        
        return notifications.filter(n => {
          const audience = n.audience as string | undefined;
          if (!audience || audience === 'all') return true;
          
          if (currentRole === 'supervisor') {
            return audience === 'supervisor' || audience === 'all';
          }
          
          if (currentRole === 'handler' && currentUnit) {
            if (audience === 'handler_unit' && n.targetUnit === currentUnit) return true;
            if (audience === 'coorg_unit' && n.targetUnit === currentUnit) return true;
            return false;
          }
          
          return true;
        });
      },

      getVisibleUnreadCount: () => {
        return get().getVisibleNotifications().filter(n => !n.isRead).length;
      },

      getFilteredNotifications: () => {
        const { filter } = get();
        let filtered = [...get().getVisibleNotifications()];

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
        return get().getVisibleNotifications().filter((n) => n.type === type && !n.isRead).length;
      },

      getNotificationStats: () => {
        const visibleNotifications = get().getVisibleNotifications();
        const stats = {} as Record<NotificationType, { total: number; unread: number }>;
        
        const types: NotificationType[] = ['urge', 'return', 'overdue_soon', 'coorg_request', 'result_submit'];
        types.forEach((type) => {
          const typeNotifications = visibleNotifications.filter((n) => n.type === type);
          stats[type] = {
            total: typeNotifications.length,
            unread: typeNotifications.filter((n) => !n.isRead).length,
          };
        });
        
        return stats;
      },

      invalidateStaleOverdueNotifications: () => {
        const { notifications } = get();
        const { tickets } = useTicketStore.getState();
        const { holidayDates, workdayDates } = getHolidayDatesSafe();
        const now = new Date();

        let invalidatedCount = 0;
        const validNotifications: Notification[] = [];

        notifications.forEach(n => {
          if (n.type !== 'overdue_soon') {
            validNotifications.push(n);
            return;
          }

          const ticket = tickets.find(t => t.id === n.ticketId);
          if (!ticket || ticket.status === 'completed' || ticket.status === 'archived') {
            invalidatedCount++;
            return;
          }

          const deadline = n.audience === 'coorg_unit' && n.targetUnit
            ? ticket.coOrganizers?.find(co => co.unit === n.targetUnit)?.deadline
            : ticket.deadline;

          if (!deadline) {
            invalidatedCount++;
            return;
          }

          const remaining = getWorkdaysRemaining(deadline, now, holidayDates, workdayDates);
          const isOverdue = (ticket.status === 'overdue' && n.audience !== 'coorg_unit') || remaining < 0;
          const currentRiskStage = getRiskStage(remaining, isOverdue);

          if (!currentRiskStage || n.riskStage !== currentRiskStage) {
            invalidatedCount++;
            return;
          }

          validNotifications.push(n);
        });

        if (invalidatedCount > 0) {
          set({ notifications: validNotifications });
        }

        return invalidatedCount;
      },

      refreshOverdueNotifications: () => {
        const invalidated = get().invalidateStaleOverdueNotifications();
        const prevCount = get().notifications.length;
        get().checkOverdueSoon();
        const newCount = get().notifications.length;
        const created = Math.max(0, newCount - prevCount + invalidated);
        return { invalidated, created };
      },

      checkOverdueSoon: () => {
        const { tickets } = useTicketStore.getState();
        const { notifications } = get();
        const { holidayDates, workdayDates } = getHolidayDatesSafe();

        const newNotifications: Notification[] = [];
        const existingDedupKeys = new Set(
          notifications
            .filter(n => n.type === 'overdue_soon' && n.relatedId)
            .map(n => n.relatedId)
        );

        const now = new Date();

        tickets.forEach((ticket: Ticket) => {
          if (ticket.status === 'completed' || ticket.status === 'archived') return;

          const remaining = getWorkdaysRemaining(ticket.deadline, now, holidayDates, workdayDates);
          const isOverdue = ticket.status === 'overdue' || remaining < 0;
          const riskStage = getRiskStage(remaining, isOverdue);
          
          if (!riskStage) return;

          const supervisorContent = isOverdue
            ? `工单已超期${Math.abs(remaining) > 0 ? Math.abs(remaining) + '个工作日' : ''}，承办单位：${ticket.handlerUnit}，请督办！`
            : remaining === 0
              ? `工单今天到期，承办单位：${ticket.handlerUnit}，请注意督办！`
              : `工单即将超期，仅剩${remaining}个工作日，承办单位：${ticket.handlerUnit}，请及时跟进！`;

          const handlerContent = isOverdue
            ? `工单已超期${Math.abs(remaining) > 0 ? Math.abs(remaining) + '个工作日' : ''}，请立即处理！`
            : remaining === 0
              ? `工单今天到期，请抓紧办理！`
              : `工单即将超期，仅剩${remaining}个工作日，请尽快办理！`;

          const supervisorKey = buildDedupKey(ticket.id, riskStage, 'supervisor');
          if (!existingDedupKeys.has(supervisorKey)) {
            newNotifications.push(createNotification(
              'overdue_soon',
              ticket.id,
              ticket.title,
              supervisorContent,
              '系统',
              supervisorKey,
              {
                audience: 'supervisor',
                riskStage,
                remainingWorkdays: remaining,
              }
            ));
            existingDedupKeys.add(supervisorKey);
          }

          const handlerKey = buildDedupKey(ticket.id, riskStage, `handler|${ticket.handlerUnit}`);
          if (!existingDedupKeys.has(handlerKey)) {
            newNotifications.push(createNotification(
              'overdue_soon',
              ticket.id,
              ticket.title,
              handlerContent,
              '系统',
              handlerKey,
              {
                audience: 'handler_unit',
                targetUnit: ticket.handlerUnit,
                riskStage,
                remainingWorkdays: remaining,
              }
            ));
            existingDedupKeys.add(handlerKey);
          }

          if (ticket.coOrganizers && ticket.coOrganizers.length > 0) {
            ticket.coOrganizers.forEach(co => {
              if (co.status === 'completed') return;
              
              const coRemaining = getWorkdaysRemaining(co.deadline, now, holidayDates, workdayDates);
              const coIsOverdue = coRemaining < 0;
              const coRiskStage = getRiskStage(coRemaining, coIsOverdue);
              
              if (!coRiskStage) return;

              const coSupervisorContent = coIsOverdue
                ? `协办任务已超期${Math.abs(coRemaining) > 0 ? Math.abs(coRemaining) + '个工作日' : ''}，协办单位：${co.unit}，请督办！`
                : coRemaining === 0
                  ? `协办任务今天到期，协办单位：${co.unit}，请注意督办！`
                  : `协办任务即将超期，仅剩${coRemaining}个工作日，协办单位：${co.unit}，请及时跟进！`;

              const coContent = coIsOverdue
                ? `协办任务已超期${Math.abs(coRemaining) > 0 ? Math.abs(coRemaining) + '个工作日' : ''}，请立即处理！`
                : coRemaining === 0
                  ? `协办任务今天到期，请抓紧办理！`
                  : `协办任务即将超期，仅剩${coRemaining}个工作日，请尽快办理！`;

              const coSupervisorKey = buildDedupKey(ticket.id, coRiskStage, `coorg_supervisor|${co.unit}`);
              if (!existingDedupKeys.has(coSupervisorKey)) {
                newNotifications.push(createNotification(
                  'overdue_soon',
                  ticket.id,
                  ticket.title,
                  coSupervisorContent,
                  '系统',
                  coSupervisorKey,
                  {
                    audience: 'supervisor',
                    targetUnit: co.unit,
                    riskStage: coRiskStage,
                    remainingWorkdays: coRemaining,
                  }
                ));
                existingDedupKeys.add(coSupervisorKey);
              }

              const coKey = buildDedupKey(ticket.id, coRiskStage, `coorg|${co.unit}`);
              if (!existingDedupKeys.has(coKey)) {
                newNotifications.push(createNotification(
                  'overdue_soon',
                  ticket.id,
                  ticket.title,
                  coContent,
                  '系统',
                  coKey,
                  {
                    audience: 'coorg_unit',
                    targetUnit: co.unit,
                    riskStage: coRiskStage,
                    remainingWorkdays: coRemaining,
                  }
                ));
                existingDedupKeys.add(coKey);
              }
            });
          }
        });

        if (newNotifications.length > 0) {
          set((state) => ({
            notifications: [...newNotifications, ...state.notifications],
          }));
        }
      },
    }),
    {
      name: 'notification-storage',
    }
  )
);
