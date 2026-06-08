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
import { getWorkdaysRemaining } from '@/utils/workday';
import { useHolidayStore } from './useHolidayStore';

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
};

const initialArchiveFilterOptions: ArchiveFilterOptions = {
  handlerUnit: '',
  category: '',
  satisfaction: '',
  archiveTimeRange: '',
};

function isWithinArchiveRange(archiveTime: string, range: ArchiveFilterOptions['archiveTimeRange']) {
  if (!range) return true;

  const archivedAt = new Date(archiveTime).getTime();
  if (Number.isNaN(archivedAt)) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  switch (range) {
    case 'today':
      return archivedAt >= startOfToday;
    case '7days':
      return archivedAt >= now.getTime() - 7 * dayMs;
    case '30days':
      return archivedAt >= now.getTime() - 30 * dayMs;
    case '90days':
      return archivedAt >= now.getTime() - 90 * dayMs;
    default:
      return true;
  }
}

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

function getCollaborationRecords(ticket: Ticket): CollaborationRecord[] {
  return ticket.collaborationRecords || [];
}

function isCollaboratingTicket(ticket: Ticket) {
  return getCollaborationRecords(ticket).some(record => record.status !== 'completed');
}

function isUnitRelated(ticket: Ticket, unit: string) {
  return ticket.handlerUnit === unit || getCollaborationRecords(ticket).some(record => record.unit === unit);
}

function getVisibleStatus(ticket: Ticket): TicketStatus {
  if (ticket.status === 'completed' || ticket.status === 'archived' || ticket.status === 'returned') {
    return ticket.status;
  }
  return isCollaboratingTicket(ticket) ? 'collaborating' : ticket.status;
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

      getTicketById: (id) => {
        return get().tickets.find(t => t.id === id);
      },

      getFilteredTickets: () => {
        const { tickets, filterOptions, currentRole, currentUnit } = get();
        let filtered = [...tickets];

        if (currentRole === 'handler' && currentUnit) {
          filtered = filtered.filter(t => isUnitRelated(t, currentUnit));
        }

        if (filterOptions.status) {
          filtered = filtered.filter(t => getVisibleStatus(t) === filterOptions.status);
        }
        if (filterOptions.area) {
          filtered = filtered.filter(t => t.area === filterOptions.area);
        }
        if (filterOptions.handlerUnit) {
          filtered = filtered.filter(t => isUnitRelated(t, filterOptions.handlerUnit));
        }
        if (filterOptions.category) {
          filtered = filtered.filter(t => t.category === filterOptions.category);
        }
        if (filterOptions.deadlineRange) {
          const { holidayDates, workdayDates } = getHolidayDatesSafe();

          filtered = filtered.filter(t => {
            const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
            switch (filterOptions.deadlineRange) {
              case 'overdue': return remaining < 0;
              case 'today': return remaining === 0;
              case '3days': return remaining >= 0 && remaining <= 3;
              case '7days': return remaining >= 0 && remaining <= 7;
              case '15days': return remaining >= 0 && remaining <= 15;
              default: return true;
            }
          });
        }

        return filtered.sort((a, b) => new Date(b.assignTime).getTime() - new Date(a.assignTime).getTime());
      },

      getTicketStats: () => {
        const { tickets, currentRole, currentUnit } = get();
        let list = tickets;
        if (currentRole === 'handler' && currentUnit) {
          list = list.filter(t => isUnitRelated(t, currentUnit));
        }

        const { holidayDates, workdayDates } = getHolidayDatesSafe();

        return {
          pending: list.filter(t => getVisibleStatus(t) === 'pending').length,
          processing: list.filter(t => getVisibleStatus(t) === 'processing' || getVisibleStatus(t) === 'collaborating').length,
          completed: list.filter(t => t.status === 'completed').length,
          overdue: list.filter(t => {
            if (t.status === 'overdue') return true;
            if (t.status === 'completed' || t.status === 'archived') return false;
            const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
            return remaining < 0;
          }).length,
        };
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

        set((state) => ({
          tickets: state.tickets.map(t => {
            if (t.id !== ticketId) return t;
            const targetRecord = getCollaborationRecords(t).find(record => record.id === recordId);
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
      },

      submitResult: (ticketId, result, attachments) => {
        const now = formatDateTime(new Date());
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
        let archived = tickets.filter(t => t.status === 'archived' && t.archiveInfo);

        if (currentRole === 'handler' && currentUnit) {
          archived = archived.filter(t => isUnitRelated(t, currentUnit));
        }
        if (archiveFilterOptions.handlerUnit) {
          archived = archived.filter(t => isUnitRelated(t, archiveFilterOptions.handlerUnit));
        }
        if (archiveFilterOptions.category) {
          archived = archived.filter(t => t.category === archiveFilterOptions.category);
        }
        if (archiveFilterOptions.satisfaction) {
          archived = archived.filter(t => t.archiveInfo?.satisfaction === archiveFilterOptions.satisfaction);
        }
        if (archiveFilterOptions.archiveTimeRange) {
          archived = archived.filter(t =>
            t.archiveInfo && isWithinArchiveRange(t.archiveInfo.archiveTime, archiveFilterOptions.archiveTimeRange)
          );
        }

        return archived.sort((a, b) =>
          new Date(b.archiveInfo?.archiveTime || 0).getTime() - new Date(a.archiveInfo?.archiveTime || 0).getTime()
        );
      },

      urgeTicket: (ticketId, reason, operator) => {
        const now = formatDateTime(new Date());
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
      },

      returnTicket: (ticketId, reason, operator) => {
        const now = formatDateTime(new Date());
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
      },

      getRiskTickets: () => {
        const { tickets, currentRole, currentUnit } = get();
        let list = tickets.filter(t => t.status !== 'completed' && t.status !== 'archived');
        if (currentRole === 'handler' && currentUnit) {
          list = list.filter(t => isUnitRelated(t, currentUnit));
        }

        const { holidayDates, workdayDates } = getHolidayDatesSafe();

        const high: Ticket[] = [];
        const medium: Ticket[] = [];
        const low: Ticket[] = [];

        list.forEach(t => {
          const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);

          if (remaining < 0 || t.status === 'overdue') {
            high.push(t);
          } else if (remaining <= 1) {
            high.push(t);
          } else if (remaining <= 3) {
            medium.push(t);
          } else {
            low.push(t);
          }
        });

        return { high, medium, low };
      },

      getUrgeRecords: () => {
        const { tickets } = get();
        return tickets.flatMap(t => t.urgeRecords).sort(
          (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
        );
      },

      getReturnRecords: () => {
        const { tickets } = get();
        return tickets.flatMap(t => t.returnRecords).sort(
          (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
        );
      },

      getHandlerTodoStats: () => {
        const { tickets, currentUnit } = get();
        const list = tickets.filter(t => isUnitRelated(t, currentUnit));

        const { holidayDates, workdayDates } = getHolidayDatesSafe();

        const upcomingDeadline = list.filter(t => {
          if (t.status === 'completed' || t.status === 'archived') return false;
          const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
          return remaining >= 0 && remaining <= 3;
        }).length;

        return {
          pending: list.filter(t => getVisibleStatus(t) === 'pending').length,
          processing: list.filter(t => getVisibleStatus(t) === 'processing' || getVisibleStatus(t) === 'collaborating').length,
          returned: list.filter(t => t.status === 'returned').length,
          upcomingDeadline,
        };
      },

      getHandlerTodoTickets: (type) => {
        const { tickets, currentUnit } = get();
        const list = tickets.filter(t => isUnitRelated(t, currentUnit));

        const { holidayDates, workdayDates } = getHolidayDatesSafe();

        switch (type) {
          case 'pending':
            return list.filter(t => t.status === 'pending')
              .sort((a, b) => new Date(b.assignTime).getTime() - new Date(a.assignTime).getTime());
          case 'processing':
            return list.filter(t => getVisibleStatus(t) === 'processing' || getVisibleStatus(t) === 'collaborating')
              .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
          case 'returned':
            return list.filter(t => t.status === 'returned')
              .sort((a, b) => new Date(b.assignTime).getTime() - new Date(a.assignTime).getTime());
          case 'upcoming':
            return list.filter(t => {
              if (t.status === 'completed' || t.status === 'archived') return false;
              const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
              return remaining >= 0 && remaining <= 3;
            }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
          default:
            return [];
        }
      },

      getSupervisorTodoStats: () => {
        const { tickets } = get();

        const { holidayDates, workdayDates } = getHolidayDatesSafe();

        const highRisk = tickets.filter(t => {
          if (t.status === 'completed' || t.status === 'archived') return false;
          const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
          return remaining < 0 || t.status === 'overdue' || remaining <= 1;
        }).length;

        const pendingUrge = tickets.filter(t => {
          if (t.status === 'completed' || t.status === 'archived') return false;
          const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
          return remaining <= 3 && remaining >= 0 && t.urgeRecords.length === 0;
        }).length;

        const returned = tickets.filter(t => t.status === 'returned').length;

        return { highRisk, pendingUrge, returned };
      },

      getSupervisorTodoTickets: (type) => {
        const { tickets } = get();

        const { holidayDates, workdayDates } = getHolidayDatesSafe();

        switch (type) {
          case 'highRisk':
            return tickets.filter(t => {
              if (t.status === 'completed' || t.status === 'archived') return false;
              const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
              return remaining < 0 || t.status === 'overdue' || remaining <= 1;
            }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
          case 'pendingUrge':
            return tickets.filter(t => {
              if (t.status === 'completed' || t.status === 'archived') return false;
              const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
              return remaining <= 3 && remaining >= 0 && t.urgeRecords.length === 0;
            }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
          case 'returned':
            return tickets.filter(t => t.status === 'returned')
              .sort((a, b) => {
                const aReturnTime = a.returnRecords.length > 0
                  ? new Date(a.returnRecords[a.returnRecords.length - 1].createTime).getTime()
                  : 0;
                const bReturnTime = b.returnRecords.length > 0
                  ? new Date(b.returnRecords[b.returnRecords.length - 1].createTime).getTime()
                  : 0;
                return bReturnTime - aReturnTime;
              });
          default:
            return [];
        }
      },

      getTicketCountByRule: (ruleId) => {
        const { tickets } = get();
        return tickets.filter(t =>
          t.dispatchInfo?.matchedRules?.some(m => m.ruleId === ruleId)
        ).length;
      },

      getTicketsByRule: (ruleId) => {
        const { tickets } = get();
        return tickets
          .filter(t => t.dispatchInfo?.matchedRules?.some(m => m.ruleId === ruleId))
          .sort((a, b) => new Date(b.assignTime).getTime() - new Date(a.assignTime).getTime());
      },
    }),
    {
      name: 'ticket-storage',
    }
  )
);
