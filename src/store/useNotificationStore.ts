import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CollaborationRecord,
  DeadlineNotificationScope,
  DeadlineRiskStage,
  HandlerUnit,
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
  deadlineNotifiedKeys: string[];
  deadlineNotifiedTicketIds?: string[];
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
  refreshDeadlineNotifications: (tickets: Ticket[]) => void;
}

const initialFilters: NotificationFilters = {
  type: '',
  readStatus: 'all',
};

const LEGACY_DEADLINE_NOTIFICATION_SCOPES: DeadlineNotificationScope[] = [
  'primary_handler',
  'primary_supervisor',
];

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

function getRiskStage(remainingWorkdays: number): DeadlineRiskStage | null {
  if (remainingWorkdays < 0) return 'overdue';
  if (remainingWorkdays <= 1) return 'within_1_day';
  if (remainingWorkdays <= 3) return 'within_3_days';
  return null;
}

function getRiskStageText(stage: DeadlineRiskStage) {
  if (stage === 'overdue') return '已超期';
  if (stage === 'within_1_day') return '高风险';
  return '中风险';
}

function getRemainingText(remainingWorkdays: number) {
  if (remainingWorkdays < 0) return `已超期${Math.abs(remainingWorkdays)}个工作日`;
  if (remainingWorkdays === 0) return '今天到期';
  return `剩余${remainingWorkdays}个工作日`;
}

function getActiveDeadlineKeyPrefix(ticketId: string) {
  return `deadline|${ticketId}|`;
}

function getDeadlineDedupKey(
  ticketId: string,
  riskStage: DeadlineRiskStage,
  scope: DeadlineNotificationScope,
  targetUnit?: HandlerUnit
) {
  const unitKey = scope.startsWith('collaboration') ? targetUnit || 'all' : 'all';
  return [
    'deadline',
    ticketId,
    riskStage,
    scope,
    unitKey,
  ].join('|');
}

function getCollaborationUnits(ticket: Ticket) {
  return Array.from(new Set(
    (ticket.collaborationRecords || [])
      .filter((record): record is CollaborationRecord => record.status !== 'completed')
      .map(record => record.unit)
      .filter(unit => unit !== ticket.handlerUnit)
  ));
}

function buildDeadlineNotification(params: {
  ticket: Ticket;
  remainingWorkdays: number;
  riskStage: DeadlineRiskStage;
  scope: DeadlineNotificationScope;
  recipientRole: 'handler' | 'supervisor';
  targetUnit?: HandlerUnit;
  dedupKey: string;
}) {
  const { ticket, remainingWorkdays, riskStage, scope, recipientRole, targetUnit, dedupKey } = params;
  const remainingText = getRemainingText(remainingWorkdays);
  const riskText = getRiskStageText(riskStage);
  const isCollaboration = scope === 'collaboration_handler' || scope === 'collaboration_supervisor';
  const unitText = targetUnit || ticket.handlerUnit;
  const subject = isCollaboration ? `协办单位${unitText}` : `主办单位${ticket.handlerUnit}`;
  const actionText = recipientRole === 'supervisor' ? '请关注办理进度。' : '请及时跟进办理。';

  return createNotification({
    type: 'deadline',
    ticket,
    title: `${isCollaboration ? '协办' : '工单'}即将超期`,
    content: `${ticket.id} ${riskText}，${remainingText}，${subject}需处理，${actionText}`,
    operator: '系统',
    recipientRole,
    recipientUnit: recipientRole === 'handler' ? unitText : undefined,
    targetUnit: unitText,
    riskStage,
    deadlineScope: scope,
    remainingWorkdays,
    dedupKey,
  });
}

function collectExistingDeadlineKeys(
  notifications: SupervisionNotification[],
  persistedKeys: string[] = [],
  legacyTicketIds: string[] = []
) {
  const keys = new Set<string>(persistedKeys);

  notifications.forEach(notification => {
    if (notification.type !== 'deadline') return;
    if (notification.dedupKey) {
      keys.add(notification.dedupKey);
      return;
    }
    if (notification.riskStage && notification.deadlineScope) {
      keys.add(getDeadlineDedupKey(
        notification.ticketId,
        notification.riskStage,
        notification.deadlineScope,
        notification.targetUnit || notification.recipientUnit
      ));
    }
  });

  legacyTicketIds.forEach(ticketId => {
    LEGACY_DEADLINE_NOTIFICATION_SCOPES.forEach(scope => {
      keys.add(getDeadlineDedupKey(ticketId, 'within_3_days', scope));
    });
  });

  return keys;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      deadlineNotifiedKeys: [],
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
        const { deadlineNotifiedKeys, deadlineNotifiedTicketIds, notifications } = get();
        const notified = collectExistingDeadlineKeys(
          notifications,
          deadlineNotifiedKeys || [],
          deadlineNotifiedTicketIds || []
        );
        const activeTicketIds = new Set(
          tickets
            .filter(ticket => ticket.status !== 'completed' && ticket.status !== 'archived')
            .map(ticket => ticket.id)
        );

        const newNotifications = tickets.flatMap(ticket => {
          if (ticket.status === 'completed' || ticket.status === 'archived') return [];

          const remaining = getWorkdaysRemaining(ticket.deadline, new Date(), holidayDates, workdayDates);
          const riskStage = getRiskStage(remaining);
          if (!riskStage) return [];

          const candidates: Array<{
            scope: DeadlineNotificationScope;
            recipientRole: 'handler' | 'supervisor';
            targetUnit?: HandlerUnit;
          }> = [
            {
              scope: 'primary_handler',
              recipientRole: 'handler',
              targetUnit: ticket.handlerUnit,
            },
            {
              scope: 'primary_supervisor',
              recipientRole: 'supervisor',
              targetUnit: ticket.handlerUnit,
            },
          ];

          getCollaborationUnits(ticket).forEach(unit => {
            candidates.push(
              {
                scope: 'collaboration_handler',
                recipientRole: 'handler',
                targetUnit: unit,
              },
              {
                scope: 'collaboration_supervisor',
                recipientRole: 'supervisor',
                targetUnit: unit,
              }
            );
          });

          return candidates.flatMap(candidate => {
            const dedupKey = getDeadlineDedupKey(
              ticket.id,
              riskStage,
              candidate.scope,
              candidate.targetUnit
            );

            if (notified.has(dedupKey)) return [];
            notified.add(dedupKey);

            return buildDeadlineNotification({
              ticket,
              remainingWorkdays: remaining,
              riskStage,
              scope: candidate.scope,
              recipientRole: candidate.recipientRole,
              targetUnit: candidate.targetUnit,
              dedupKey,
            });
          });
        });

        const activeKeyPrefixes = Array.from(activeTicketIds).map(getActiveDeadlineKeyPrefix);
        const keepActiveDeadlineKey = (key: string) =>
          activeKeyPrefixes.some(prefix => key.startsWith(prefix));

        if (newNotifications.length === 0) {
          set({
            deadlineNotifiedKeys: Array.from(notified).filter(keepActiveDeadlineKey),
          });
          return;
        }

        set((state) => ({
          notifications: sortByCreateTime([...newNotifications, ...state.notifications]),
          deadlineNotifiedKeys: Array.from(notified).filter(keepActiveDeadlineKey),
        }));
      },

      refreshDeadlineNotifications: (tickets) => {
        const activeTicketIds = new Set(
          tickets
            .filter(ticket => ticket.status !== 'completed' && ticket.status !== 'archived')
            .map(ticket => ticket.id)
        );

        set((state) => ({
          notifications: state.notifications.filter(notification =>
            notification.type !== 'deadline' || !activeTicketIds.has(notification.ticketId)
          ),
          deadlineNotifiedKeys: [],
          deadlineNotifiedTicketIds: [],
        }));

        get().syncDeadlineNotifications(tickets);
      },
    }),
    {
      name: 'notification-storage',
    }
  )
);
