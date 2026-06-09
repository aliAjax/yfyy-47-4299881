import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Ticket,
  TicketStatus,
  ProgressLog,
  FilterOptions,
  UrgeRecord,
  ReturnRecord,
  Attachment,
  HandlerUnit,
  DispatchInfo,
  ArchiveFilterOptions,
  ArchiveReview,
  CollaborationRecord,
  SATISFACTION_LABELS,
  COMPLETION_QUALITY_LABELS,
} from '@/types';
import { mockTickets } from '@/data/mockData';
import { generateId, formatDateTime } from '@/utils/date';
import { useHolidayStore } from './useHolidayStore';
import { useNotificationStore } from './useNotificationStore';
import { createNotification } from '@/utils/notification';
import {
  filterArchivedTickets,
  filterTicketsByAllOptions,
  filterTicketsByRoleAndUnit,
  filterTicketsByRule,
  getCollaborationRecords,
  getHandlerTodoStats,
  getHandlerTodoTickets,
  getSupervisorTodoStats,
  getSupervisorTodoTickets,
  getTicketStats,
  groupTicketsByRiskLevel,
  sortArchivedTicketsByArchiveTimeDesc,
  sortByCreateTimeDesc,
  sortTicketsByAssignTimeDesc,
} from '@/utils/ticketLogic';

interface TicketState {
  tickets: Ticket[];
  currentRole: 'handler' | 'supervisor';
  currentUnit: string;
  filterOptions: FilterOptions;
  archiveFilterOptions: ArchiveFilterOptions;

  setCurrentRole: (role: 'handler' | 'supervisor') => void;
  setCurrentUnit: (unit: string) => void;
  setFilterOptions: (options: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  setArchiveFilterOptions: (options: Partial<ArchiveFilterOptions>) => void;
  resetArchiveFilters: () => void;
  refreshDeadlineCalculations: () => void;

  getTicketById: (id: string) => Ticket | undefined;
  getFilteredTickets: () => Ticket[];
  getTicketStats: () => {
    pending: number;
    processing: number;
    completed: number;
    overdue: number;
  };

  addTicket: (ticket: Omit<Ticket, 'id' | 'progressLogs' | 'attachments' | 'urgeRecords' | 'returnRecords' | 'creator' | 'status' | 'dispatchInfo'> & { dispatchInfo?: DispatchInfo }) => void;
  batchAddTickets: (tickets: Omit<Ticket, 'id' | 'progressLogs' | 'attachments' | 'urgeRecords' | 'returnRecords' | 'creator' | 'status'>[]) => number;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  addProgressLog: (ticketId: string, content: string, type: ProgressLog['type'], operator: string) => void;
  requestCollaboration: (ticketId: string, units: HandlerUnit[], description: string, operator: string) => void;
  updateCollaborationProgress: (ticketId: string, recordId: string, progress: string, operator: string) => void;
  completeCollaboration: (ticketId: string, recordId: string, progress: string, operator: string) => void;
  submitResult: (ticketId: string, result: string, attachments?: Attachment[]) => void;
  archiveTicket: (ticketId: string, review: Omit<ArchiveReview, 'id' | 'ticketId' | 'archivedBy' | 'archiveTime'>, operator: string) => void;
  getArchivedTickets: () => Ticket[];

  urgeTicket: (ticketId: string, reason: string, operator: string) => void;
  returnTicket: (ticketId: string, reason: string, operator: string) => void;

  getRiskTickets: () => { high: Ticket[]; medium: Ticket[]; low: Ticket[] };
  getUrgeRecords: () => UrgeRecord[];
  getReturnRecords: () => ReturnRecord[];

  getHandlerTodoStats: () => {
    pending: number;
    processing: number;
    returned: number;
    upcomingDeadline: number;
  };
  getHandlerTodoTickets: (type: 'pending' | 'processing' | 'returned' | 'upcoming') => Ticket[];

  getSupervisorTodoStats: () => {
    highRisk: number;
    pendingUrge: number;
    returned: number;
  };
  getSupervisorTodoTickets: (type: 'highRisk' | 'pendingUrge' | 'returned') => Ticket[];

  getTicketCountByRule: (ruleId: string) => number;
  getTicketsByRule: (ruleId: string) => Ticket[];
}

const initialFilterOptions: FilterOptions = {
  status: '',
  area: '',
  handlerUnit: '',
  category: '',
  deadlineRange: '',
  assignDate: '',
};

const initialArchiveFilterOptions: ArchiveFilterOptions = {
  handlerUnit: '',
  category: '',
  satisfaction: '',
  archiveTimeRange: '',
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

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: mockTickets,
      currentRole: 'supervisor',
      currentUnit: '',
      filterOptions: initialFilterOptions,
      archiveFilterOptions: initialArchiveFilterOptions,

      setCurrentRole: (role) => set({ currentRole: role }),
      setCurrentUnit: (unit) => set({ currentUnit: unit }),

      setFilterOptions: (options) => set((state) => ({
        filterOptions: { ...state.filterOptions, ...options },
      })),

      resetFilters: () => set({ filterOptions: initialFilterOptions }),

      setArchiveFilterOptions: (options) => set((state) => ({
        archiveFilterOptions: { ...state.archiveFilterOptions, ...options },
      })),

      resetArchiveFilters: () => set({ archiveFilterOptions: initialArchiveFilterOptions }),

      refreshDeadlineCalculations: () => {
        set((state) => ({
          tickets: [...state.tickets],
        }));
      },

      getTicketById: (id) => {
        return get().tickets.find(t => t.id === id);
      },

      getFilteredTickets: () => {
        const { tickets, filterOptions, currentRole, currentUnit } = get();
        const { holidayDates, workdayDates } = getHolidayDatesSafe();
        const visibleTickets = filterTicketsByRoleAndUnit(tickets, currentRole, currentUnit);
        const filtered = filterTicketsByAllOptions(visibleTickets, filterOptions, { holidayDates, workdayDates });
        return sortTicketsByAssignTimeDesc(filtered);
      },

      getTicketStats: () => {
        const { tickets, currentRole, currentUnit } = get();
        const { holidayDates, workdayDates } = getHolidayDatesSafe();
        const visibleTickets = filterTicketsByRoleAndUnit(tickets, currentRole, currentUnit);
        return getTicketStats(visibleTickets, { holidayDates, workdayDates });
      },

      addTicket: (ticketData) => {
        const newTicket: Ticket = {
          ...ticketData,
          id: 'GD' + Date.now().toString().slice(-8),
          status: 'pending',
          creator: '热线坐席员',
          dispatchInfo: ticketData.dispatchInfo,
          progressLogs: [
            {
              id: generateId(),
              ticketId: '',
              content: '工单已创建',
              operator: '热线坐席员',
              createTime: formatDateTime(new Date()),
              type: 'create',
            },
            {
              id: generateId(),
              ticketId: '',
              content: `工单已分派至${ticketData.handlerUnit}${ticketData.dispatchInfo?.dispatchMethod === 'recommended' ? '（智能推荐）' : ''}`,
              operator: '工单调度员',
              createTime: formatDateTime(new Date()),
              type: 'assign',
            },
          ],
          attachments: [],
          urgeRecords: [],
          returnRecords: [],
          collaborationRecords: [],
        };
        newTicket.progressLogs.forEach(log => log.ticketId = newTicket.id);

        set((state) => ({
          tickets: [newTicket, ...state.tickets],
        }));
      },

      batchAddTickets: (ticketsData) => {
        const now = new Date();
        const newTickets: Ticket[] = ticketsData.map((ticketData, index) => {
          const timestamp = Date.now() + index;
          const ticket: Ticket = {
            ...ticketData,
            id: 'GD' + timestamp.toString().slice(-8),
            status: 'pending',
            creator: '批量导入',
            progressLogs: [
              {
                id: generateId() + index,
                ticketId: '',
                content: '工单已创建（批量导入）',
                operator: '批量导入',
                createTime: formatDateTime(now),
                type: 'create',
              },
              {
                id: generateId() + index + 'a',
                ticketId: '',
                content: `工单已分派至${ticketData.handlerUnit}`,
                operator: '工单调度员',
                createTime: formatDateTime(now),
                type: 'assign',
              },
            ],
            attachments: [],
            urgeRecords: [],
            returnRecords: [],
            collaborationRecords: [],
          };
          ticket.progressLogs.forEach(log => log.ticketId = ticket.id);
          return ticket;
        });

        set((state) => ({
          tickets: [...newTickets, ...state.tickets],
        }));

        return newTickets.length;
      },

      updateTicketStatus: (ticketId, status) => {
        set((state) => ({
          tickets: state.tickets.map(t =>
            t.id === ticketId ? { ...t, status } : t
          ),
        }));
      },

      addProgressLog: (ticketId, content, type, operator) => {
        const newLog: ProgressLog = {
          id: generateId(),
          ticketId,
          content,
          operator,
          createTime: formatDateTime(new Date()),
          type,
        };
        set((state) => ({
          tickets: state.tickets.map(t =>
            t.id === ticketId
              ? { ...t, progressLogs: [...t.progressLogs, newLog] }
              : t
          ),
        }));
      },

      requestCollaboration: (ticketId, units, description, operator) => {
        const now = formatDateTime(new Date());
        const uniqueUnits = Array.from(new Set(units)).filter(Boolean);
        if (uniqueUnits.length === 0 || !description.trim()) return;
        const createdUnits: HandlerUnit[] = [];

        set((state) => ({
          tickets: state.tickets.map(t => {
            if (t.id !== ticketId) return t;

            const existingUnits = new Set(getCollaborationRecords(t).map(record => record.unit));
            const newRecords: CollaborationRecord[] = uniqueUnits
              .filter(unit => unit !== t.handlerUnit && !existingUnits.has(unit))
              .map(unit => ({
                id: generateId(),
                ticketId,
                unit,
                description,
                progress: '',
                status: 'pending',
                requestedBy: operator,
                requestedAt: now,
              }));

            if (newRecords.length === 0) return t;
            createdUnits.push(...newRecords.map(record => record.unit));

            const collaborationLog: ProgressLog = {
              id: generateId(),
              ticketId,
              content: `【发起协办】${newRecords.map(record => record.unit).join('、')}：${description}`,
              operator,
              createTime: now,
              type: 'collaboration',
            };

            return {
              ...t,
              status: t.status === 'pending' || t.status === 'processing' ? 'collaborating' : t.status,
              collaborationRecords: [...getCollaborationRecords(t), ...newRecords],
              progressLogs: [...t.progressLogs, collaborationLog],
            };
          }),
        }));

        const ticket = get().tickets.find(t => t.id === ticketId);
        if (ticket && createdUnits.length > 0) {
          useNotificationStore.getState().addNotifications(
            createdUnits.map(unit => createNotification({
              type: 'collaboration_request',
              ticket,
              title: '收到协办请求',
              content: `${ticket.handlerUnit}发起协办：${description}`,
              operator,
              recipientRole: 'handler',
              recipientUnit: unit,
              createTime: now,
            }))
          );
        }
      },

      updateCollaborationProgress: (ticketId, recordId, progress, operator) => {
        if (!progress.trim()) return;
        const now = formatDateTime(new Date());
        const progressLog: ProgressLog = {
          id: generateId(),
          ticketId,
          content: `【协办进度】${progress}`,
          operator,
          createTime: now,
          type: 'collaboration',
        };

        set((state) => ({
          tickets: state.tickets.map(t =>
            t.id === ticketId
              ? {
                  ...t,
                  status: t.status === 'pending' || t.status === 'processing' ? 'collaborating' : t.status,
                  collaborationRecords: getCollaborationRecords(t).map(record =>
                    record.id === recordId
                      ? {
                          ...record,
                          progress,
                          status: 'processing',
                          updatedAt: now,
                        }
                      : record
                  ),
                  progressLogs: [...t.progressLogs, progressLog],
                }
              : t
          ),
        }));
      },

      completeCollaboration: (ticketId, recordId, progress, operator) => {
        if (!progress.trim()) return;
        const now = formatDateTime(new Date());
        let completedRecordUnit: HandlerUnit | undefined;
        let notificationTicket: Ticket | undefined;

        set((state) => ({
          tickets: state.tickets.map(t => {
            if (t.id !== ticketId) return t;
            const targetRecord = getCollaborationRecords(t).find(record => record.id === recordId);
            completedRecordUnit = targetRecord?.unit;
            notificationTicket = t;
            const completeLog: ProgressLog = {
              id: generateId(),
              ticketId,
              content: `【协办完成】${targetRecord?.unit || '协办单位'}：${progress}`,
              operator,
              createTime: now,
              type: 'collaboration',
            };
            return {
              ...t,
              collaborationRecords: getCollaborationRecords(t).map(record =>
                record.id === recordId
                  ? {
                      ...record,
                      progress,
                      status: 'completed',
                      updatedAt: now,
                      completedAt: now,
                    }
                  : record
              ),
              progressLogs: [...t.progressLogs, completeLog],
            };
          }),
        }));

        if (notificationTicket) {
          useNotificationStore.getState().addNotifications([
            createNotification({
              type: 'collaboration_complete',
              ticket: notificationTicket,
              title: '协办单位已完成',
              content: `${completedRecordUnit || '协办单位'}提交协办完成说明：${progress}`,
              operator,
              recipientRole: 'handler',
              recipientUnit: notificationTicket.handlerUnit,
              createTime: now,
            }),
            createNotification({
              type: 'collaboration_complete',
              ticket: notificationTicket,
              title: '协办单位已完成',
              content: `${completedRecordUnit || '协办单位'}已完成${notificationTicket.id}协办事项。`,
              operator,
              recipientRole: 'supervisor',
              createTime: now,
            }),
          ]);
        }
      },

      submitResult: (ticketId, result, attachments) => {
        const now = formatDateTime(new Date());
        const ticket = get().tickets.find(t => t.id === ticketId);
        const completeLog: ProgressLog = {
          id: generateId(),
          ticketId,
          content: '已提交办理结果',
          operator: '承办单位经办人',
          createTime: now,
          type: 'complete',
        };
        set((state) => ({
          tickets: state.tickets.map(t =>
            t.id === ticketId
              ? {
                  ...t,
                  status: 'completed',
                  result,
                  progressLogs: [...t.progressLogs, completeLog],
                  attachments: attachments ? [...t.attachments, ...attachments] : t.attachments,
                }
              : t
          ),
        }));

        if (ticket) {
          useNotificationStore.getState().addNotification(createNotification({
            type: 'result_submit',
            ticket,
            title: '办理结果已提交',
            content: `${ticket.handlerUnit}已提交${ticket.id}办理结果。`,
            operator: '承办单位经办人',
            recipientRole: 'supervisor',
            createTime: now,
          }));
        }
      },

      archiveTicket: (ticketId, review, operator) => {
        const now = formatDateTime(new Date());
        const archiveInfo: ArchiveReview = {
          ...review,
          id: generateId(),
          ticketId,
          archivedBy: operator,
          archiveTime: now,
        };
        const archiveLog: ProgressLog = {
          id: generateId(),
          ticketId,
          content: `【归档复盘】满意度：${SATISFACTION_LABELS[review.satisfaction]}，办结质量：${COMPLETION_QUALITY_LABELS[review.completionQuality]}`,
          operator,
          createTime: now,
          type: 'archive',
        };

        set((state) => ({
          tickets: state.tickets.map(t =>
            t.id === ticketId && t.status === 'completed'
              ? {
                  ...t,
                  status: 'archived',
                  archiveInfo,
                  progressLogs: [...t.progressLogs, archiveLog],
                }
              : t
          ),
        }));
      },

      getArchivedTickets: () => {
        const { tickets, archiveFilterOptions, currentRole, currentUnit } = get();
        const visibleTickets = filterTicketsByRoleAndUnit(tickets, currentRole, currentUnit);
        const archived = filterArchivedTickets(visibleTickets, archiveFilterOptions);
        return sortArchivedTicketsByArchiveTimeDesc(archived);
      },

      urgeTicket: (ticketId, reason, operator) => {
        const now = formatDateTime(new Date());
        const ticket = get().tickets.find(t => t.id === ticketId);
        const urgeRecord: UrgeRecord = {
          id: generateId(),
          ticketId,
          reason,
          operator,
          createTime: now,
        };
        const urgeLog: ProgressLog = {
          id: generateId(),
          ticketId,
          content: `【催办】${reason}`,
          operator,
          createTime: now,
          type: 'urge',
        };
        set((state) => ({
          tickets: state.tickets.map(t =>
            t.id === ticketId
              ? {
                  ...t,
                  urgeRecords: [...t.urgeRecords, urgeRecord],
                  progressLogs: [...t.progressLogs, urgeLog],
                }
              : t
          ),
        }));

        if (ticket) {
          useNotificationStore.getState().addNotification(createNotification({
            type: 'urge',
            ticket,
            title: '收到催办提醒',
            content: `督办员催办${ticket.id}：${reason}`,
            operator,
            recipientRole: 'handler',
            recipientUnit: ticket.handlerUnit,
            createTime: now,
          }));
        }
      },

      returnTicket: (ticketId, reason, operator) => {
        const now = formatDateTime(new Date());
        const ticket = get().tickets.find(t => t.id === ticketId);
        const returnRecord: ReturnRecord = {
          id: generateId(),
          ticketId,
          reason,
          operator,
          createTime: now,
        };
        const returnLog: ProgressLog = {
          id: generateId(),
          ticketId,
          content: `【退回重办】${reason}`,
          operator,
          createTime: now,
          type: 'return',
        };
        set((state) => ({
          tickets: state.tickets.map(t =>
            t.id === ticketId
              ? {
                  ...t,
                  status: 'returned',
                  returnRecords: [...t.returnRecords, returnRecord],
                  progressLogs: [...t.progressLogs, returnLog],
                }
              : t
          ),
        }));

        if (ticket) {
          useNotificationStore.getState().addNotification(createNotification({
            type: 'return',
            ticket,
            title: '工单被退回重办',
            content: `督办员退回${ticket.id}：${reason}`,
            operator,
            recipientRole: 'handler',
            recipientUnit: ticket.handlerUnit,
            createTime: now,
          }));
        }
      },

      getRiskTickets: () => {
        const { tickets, currentRole, currentUnit } = get();
        const { holidayDates, workdayDates } = getHolidayDatesSafe();
        const visibleTickets = filterTicketsByRoleAndUnit(tickets, currentRole, currentUnit)
          .filter(t => t.status !== 'completed' && t.status !== 'archived');
        return groupTicketsByRiskLevel(visibleTickets, { holidayDates, workdayDates });
      },

      getUrgeRecords: () => {
        const { tickets } = get();
        return sortByCreateTimeDesc(tickets.flatMap(t => t.urgeRecords));
      },

      getReturnRecords: () => {
        const { tickets } = get();
        return sortByCreateTimeDesc(tickets.flatMap(t => t.returnRecords));
      },

      getHandlerTodoStats: () => {
        const { tickets, currentUnit } = get();
        const { holidayDates, workdayDates } = getHolidayDatesSafe();
        const list = filterTicketsByRoleAndUnit(tickets, 'handler', currentUnit);
        return getHandlerTodoStats(list, { holidayDates, workdayDates });
      },

      getHandlerTodoTickets: (type) => {
        const { tickets, currentUnit } = get();
        const { holidayDates, workdayDates } = getHolidayDatesSafe();
        const list = filterTicketsByRoleAndUnit(tickets, 'handler', currentUnit);
        return getHandlerTodoTickets(list, type, { holidayDates, workdayDates });
      },

      getSupervisorTodoStats: () => {
        const { tickets } = get();
        const { holidayDates, workdayDates } = getHolidayDatesSafe();
        return getSupervisorTodoStats(tickets, { holidayDates, workdayDates });
      },

      getSupervisorTodoTickets: (type) => {
        const { tickets } = get();
        const { holidayDates, workdayDates } = getHolidayDatesSafe();
        return getSupervisorTodoTickets(tickets, type, { holidayDates, workdayDates });
      },

      getTicketCountByRule: (ruleId) => {
        const { tickets } = get();
        return filterTicketsByRule(tickets, ruleId).length;
      },

      getTicketsByRule: (ruleId) => {
        const { tickets } = get();
        return sortTicketsByAssignTimeDesc(filterTicketsByRule(tickets, ruleId));
      },
    }),
    {
      name: 'ticket-storage',
    }
  )
);
