import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Ticket, TicketStatus, ProgressLog, FilterOptions, UrgeRecord, ReturnRecord, Attachment, DispatchInfo, ArchiveInfo, ArchiveFilterOptions, SatisfactionLevel, QualityLevel, ProblemTag, CoOrganizer, CoOrgProgressLog, HandlerUnit, CO_ORG_STATUS_LABELS } from '@/types';
import { mockTickets } from '@/data/mockData';
import { generateId, formatDateTime } from '@/utils/date';
import { getWorkdaysRemaining } from '@/utils/workday';
import { useHolidayStore } from './useHolidayStore';
import { useNotificationStore } from './useNotificationStore';

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
  
  addTicket: (ticket: Omit<Ticket, 'id' | 'progressLogs' | 'attachments' | 'urgeRecords' | 'returnRecords' | 'creator' | 'status' | 'dispatchInfo' | 'archiveInfo' | 'coOrganizers'> & { dispatchInfo?: DispatchInfo }) => void;
  batchAddTickets: (tickets: Omit<Ticket, 'id' | 'progressLogs' | 'attachments' | 'urgeRecords' | 'returnRecords' | 'creator' | 'status' | 'archiveInfo' | 'coOrganizers'>[]) => number;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  addProgressLog: (ticketId: string, content: string, type: ProgressLog['type'], operator: string) => void;
  submitResult: (ticketId: string, result: string, attachments?: Attachment[], ignoreUncompletedCoOrg?: boolean) => void;
  
  urgeTicket: (ticketId: string, reason: string, operator: string) => void;
  returnTicket: (ticketId: string, reason: string, operator: string) => void;
  
  archiveTicket: (ticketId: string, data: {
    satisfaction: SatisfactionLevel;
    quality: QualityLevel;
    problemTags: ProblemTag[];
    reviewNote: string;
  }, operator: string) => void;
  
  getArchivedTickets: () => Ticket[];
  getArchiveStats: () => {
    total: number;
    verySatisfied: number;
    satisfied: number;
    neutral: number;
    dissatisfied: number;
    veryDissatisfied: number;
  };

  getArchiveGroupStats: () => {
    byHandlerUnit: Record<string, number>;
    byCategory: Record<string, number>;
    bySatisfaction: Record<string, number>;
    byQuality: Record<string, number>;
    byCoOrganizer: Record<string, number>;
  };
  
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

  addCoOrganizer: (ticketId: string, data: {
    unit: HandlerUnit;
    requirement: string;
    deadline: string;
  }, operator: string) => void;
  updateCoOrgProgress: (ticketId: string, coOrganizerId: string, content: string, operator: string) => void;
  completeCoOrganizer: (ticketId: string, coOrganizerId: string, result: string, operator: string) => void;
  getCoOrgTickets: (unit: string) => Ticket[];
  getCoOrgStats: (unit: string) => {
    pending: number;
    processing: number;
    completed: number;
  };
  isCoOrganizing: (ticket: Ticket) => boolean;
  getCoOrganizerByUnit: (ticket: Ticket, unit: string) => CoOrganizer | undefined;
  getTicketRole: (ticket: Ticket, unit: string) => 'main' | 'coorganizer' | 'none';
}

const initialFilterOptions: FilterOptions = {
  status: '',
  area: '',
  handlerUnit: '',
  category: '',
  deadlineRange: '',
  hasCoOrganizer: 'all',
  assignDate: '',
};

const initialArchiveFilterOptions: ArchiveFilterOptions = {
  handlerUnit: '',
  category: '',
  satisfaction: '',
  archiveTimeRange: '',
  hasCoOrganizer: 'all',
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

      getTicketById: (id) => {
        return get().tickets.find(t => t.id === id);
      },

      getFilteredTickets: () => {
        const { tickets, filterOptions, currentRole, currentUnit } = get();
        let filtered = [...tickets];

        if (currentRole === 'handler' && currentUnit) {
          filtered = filtered.filter(t => 
            t.handlerUnit === currentUnit || 
            t.coOrganizers?.some(co => co.unit === currentUnit)
          );
        }

        if (filterOptions.status) {
          filtered = filtered.filter(t => t.status === filterOptions.status);
        }
        if (filterOptions.area) {
          filtered = filtered.filter(t => t.area === filterOptions.area);
        }
        if (filterOptions.handlerUnit) {
          filtered = filtered.filter(t => t.handlerUnit === filterOptions.handlerUnit);
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

        if (filterOptions.hasCoOrganizer !== 'all') {
          const hasCoOrg = (t: Ticket) => t.coOrganizers && t.coOrganizers.length > 0;
          if (filterOptions.hasCoOrganizer === 'yes') {
            filtered = filtered.filter(t => hasCoOrg(t));
          } else if (filterOptions.hasCoOrganizer === 'no') {
            filtered = filtered.filter(t => !hasCoOrg(t));
          }
        }

        if (filterOptions.assignDate) {
          filtered = filtered.filter(t => t.assignTime.split(' ')[0] === filterOptions.assignDate);
        }

        return filtered.sort((a, b) => new Date(b.assignTime).getTime() - new Date(a.assignTime).getTime());
      },

      getTicketStats: () => {
        const { tickets, currentRole, currentUnit } = get();
        let list = tickets;
        if (currentRole === 'handler' && currentUnit) {
          list = list.filter(t => 
            t.handlerUnit === currentUnit || 
            t.coOrganizers?.some(co => co.unit === currentUnit)
          );
        }
        
        const { holidayDates, workdayDates } = getHolidayDatesSafe();
        
        return {
          pending: list.filter(t => t.status === 'pending').length,
          processing: list.filter(t => t.status === 'processing').length,
          completed: list.filter(t => t.status === 'completed').length,
          overdue: list.filter(t => {
            if (t.status === 'overdue') return true;
            if (t.status === 'completed') return false;
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
          coOrganizers: [],
        };
        newTicket.progressLogs.forEach(log => log.ticketId = newTicket.id);
        
        set((state) => ({
          tickets: [newTicket, ...state.tickets],
        }));
        
        setTimeout(() => useNotificationStore.getState().checkOverdueSoon(), 0);
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
            coOrganizers: [],
          };
          ticket.progressLogs.forEach(log => log.ticketId = ticket.id);
          return ticket;
        });

        set((state) => ({
          tickets: [...newTickets, ...state.tickets],
        }));

        setTimeout(() => useNotificationStore.getState().checkOverdueSoon(), 0);
        return newTickets.length;
      },

      updateTicketStatus: (ticketId, status) => {
        set((state) => ({
          tickets: state.tickets.map(t => 
            t.id === ticketId ? { ...t, status } : t
          ),
        }));
        
        setTimeout(() => useNotificationStore.getState().checkOverdueSoon(), 0);
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

      submitResult: (ticketId, result, attachments, ignoreUncompletedCoOrg) => {
        const now = formatDateTime(new Date());
        const ticket = get().tickets.find(t => t.id === ticketId);
        const uncompletedCoOrgs = ticket?.coOrganizers?.filter(co => co.status !== 'completed') || [];
        const hasUncompletedCoOrg = uncompletedCoOrgs.length > 0;
        
        const completeLog: ProgressLog = {
          id: generateId(),
          ticketId,
          content: hasUncompletedCoOrg && ignoreUncompletedCoOrg 
            ? `已提交办理结果（忽略未完成协办：${uncompletedCoOrgs.map(co => co.unit).join('、')}）`
            : '已提交办理结果',
          operator: '承办单位经办人',
          createTime: now,
          type: hasUncompletedCoOrg && ignoreUncompletedCoOrg ? 'complete_ignore_coorg' : 'complete',
        };
        
        const additionalLogs: ProgressLog[] = [];
        if (hasUncompletedCoOrg && ignoreUncompletedCoOrg) {
          additionalLogs.push({
            id: generateId(),
            ticketId,
            content: `【忽略协办说明】以下协办单位尚未完成协办工作：${uncompletedCoOrgs.map(co => `${co.unit}（${CO_ORG_STATUS_LABELS[co.status]}）`).join('；')}，主办单位已选择忽略并提交最终办理结果`,
            operator: '承办单位经办人',
            createTime: now,
            type: 'complete_ignore_coorg',
          });
        }
        
        set((state) => ({
          tickets: state.tickets.map(t => 
            t.id === ticketId 
              ? { 
                  ...t, 
                  status: 'completed', 
                  result, 
                  progressLogs: [...t.progressLogs, completeLog, ...additionalLogs],
                  attachments: attachments ? [...t.attachments, ...attachments] : t.attachments,
                } 
              : t
          ),
        }));
        
        const updatedTicket = get().tickets.find(t => t.id === ticketId);
        if (updatedTicket) {
          let notificationContent = '承办单位已提交办理结果，请督办员审核归档';
          if (hasUncompletedCoOrg && ignoreUncompletedCoOrg) {
            notificationContent = `承办单位已提交办理结果（仍有 ${uncompletedCoOrgs.length} 个协办单位未完成：${uncompletedCoOrgs.map(co => co.unit).join('、')}），请督办员审核归档`;
          }
          useNotificationStore.getState().addNotificationByType(
            'result_submit',
            ticketId,
            notificationContent,
            '承办单位经办人',
            undefined,
            {
              audience: 'supervisor',
              hasUncompletedCoOrg: hasUncompletedCoOrg && ignoreUncompletedCoOrg ? true : undefined,
            }
          );
        }
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
        
        const ticket = get().tickets.find(t => t.id === ticketId);
        if (ticket) {
          useNotificationStore.getState().addNotificationByType(
            'urge',
            ticketId,
            `督办员发起催办：${reason}`,
            operator,
            urgeRecord.id
          );
        }
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
        
        const ticket = get().tickets.find(t => t.id === ticketId);
        if (ticket) {
          useNotificationStore.getState().addNotificationByType(
            'return',
            ticketId,
            `工单已被退回重办：${reason}`,
            operator,
            returnRecord.id
          );
        }
      },

      archiveTicket: (ticketId, data, operator) => {
        const now = formatDateTime(new Date());
        const archiveInfo: ArchiveInfo = {
          id: generateId(),
          ticketId,
          satisfaction: data.satisfaction,
          quality: data.quality,
          problemTags: data.problemTags,
          reviewNote: data.reviewNote,
          operator,
          archiveTime: now,
        };
        const archiveLog: ProgressLog = {
          id: generateId(),
          ticketId,
          content: `【归档复盘】工单已归档，满意度：${data.satisfaction}，办结质量：${data.quality}`,
          operator,
          createTime: now,
          type: 'archive',
        };
        set((state) => ({
          tickets: state.tickets.map(t => 
            t.id === ticketId 
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
        let filtered = tickets.filter(t => t.status === 'archived' && t.archiveInfo);

        if (currentRole === 'handler' && currentUnit) {
          filtered = filtered.filter(t => 
            t.handlerUnit === currentUnit || 
            t.coOrganizers?.some(co => co.unit === currentUnit)
          );
        }

        if (archiveFilterOptions.handlerUnit) {
          filtered = filtered.filter(t => t.handlerUnit === archiveFilterOptions.handlerUnit);
        }
        if (archiveFilterOptions.category) {
          filtered = filtered.filter(t => t.category === archiveFilterOptions.category);
        }
        if (archiveFilterOptions.satisfaction) {
          filtered = filtered.filter(t => t.archiveInfo?.satisfaction === archiveFilterOptions.satisfaction);
        }
        if (archiveFilterOptions.archiveTimeRange) {
          const now = new Date();
          filtered = filtered.filter(t => {
            if (!t.archiveInfo) return false;
            const archiveDate = new Date(t.archiveInfo.archiveTime);
            const daysDiff = Math.floor((now.getTime() - archiveDate.getTime()) / (1000 * 60 * 60 * 24));
            switch (archiveFilterOptions.archiveTimeRange) {
              case '7days': return daysDiff <= 7;
              case '30days': return daysDiff <= 30;
              case '90days': return daysDiff <= 90;
              case 'thisYear': return archiveDate.getFullYear() === now.getFullYear();
              default: return true;
            }
          });
        }

        if (archiveFilterOptions.hasCoOrganizer !== 'all') {
          const hasCoOrg = (t: Ticket) => t.coOrganizers && t.coOrganizers.length > 0;
          if (archiveFilterOptions.hasCoOrganizer === 'yes') {
            filtered = filtered.filter(t => hasCoOrg(t));
          } else if (archiveFilterOptions.hasCoOrganizer === 'no') {
            filtered = filtered.filter(t => !hasCoOrg(t));
          }
        }

        return filtered.sort((a, b) => {
          const aTime = a.archiveInfo?.archiveTime || '';
          const bTime = b.archiveInfo?.archiveTime || '';
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
      },

      getArchiveStats: () => {
        const list = get().getArchivedTickets();
        return {
          total: list.length,
          verySatisfied: list.filter(t => t.archiveInfo?.satisfaction === 'very_satisfied').length,
          satisfied: list.filter(t => t.archiveInfo?.satisfaction === 'satisfied').length,
          neutral: list.filter(t => t.archiveInfo?.satisfaction === 'neutral').length,
          dissatisfied: list.filter(t => t.archiveInfo?.satisfaction === 'dissatisfied').length,
          veryDissatisfied: list.filter(t => t.archiveInfo?.satisfaction === 'very_dissatisfied').length,
        };
      },

      getArchiveGroupStats: () => {
        const list = get().getArchivedTickets();
        const byHandlerUnit: Record<string, number> = {};
        const byCategory: Record<string, number> = {};
        const bySatisfaction: Record<string, number> = {};
        const byQuality: Record<string, number> = {};
        const byCoOrganizer: Record<string, number> = { yes: 0, no: 0 };

        list.forEach(t => {
          byHandlerUnit[t.handlerUnit] = (byHandlerUnit[t.handlerUnit] || 0) + 1;
          byCategory[t.category] = (byCategory[t.category] || 0) + 1;
          const sat = t.archiveInfo?.satisfaction || 'neutral';
          bySatisfaction[sat] = (bySatisfaction[sat] || 0) + 1;
          const quality = t.archiveInfo?.quality || 'average';
          byQuality[quality] = (byQuality[quality] || 0) + 1;
          if (t.coOrganizers && t.coOrganizers.length > 0) {
            byCoOrganizer.yes += 1;
          } else {
            byCoOrganizer.no += 1;
          }
        });

        return { byHandlerUnit, byCategory, bySatisfaction, byQuality, byCoOrganizer };
      },

      getRiskTickets: () => {
        const { tickets, currentRole, currentUnit } = get();
        let list = tickets.filter(t => t.status !== 'completed');
        if (currentRole === 'handler' && currentUnit) {
          list = list.filter(t => 
            t.handlerUnit === currentUnit || 
            t.coOrganizers?.some(co => co.unit === currentUnit)
          );
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
        const list = tickets.filter(t => 
          t.handlerUnit === currentUnit || 
          t.coOrganizers?.some(co => co.unit === currentUnit)
        );
        
        const { holidayDates, workdayDates } = getHolidayDatesSafe();
        
        const upcomingDeadline = list.filter(t => {
          if (t.status === 'completed') return false;
          const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
          return remaining >= 0 && remaining <= 3;
        }).length;

        return {
          pending: list.filter(t => t.status === 'pending').length,
          processing: list.filter(t => t.status === 'processing').length,
          returned: list.filter(t => t.status === 'returned').length,
          upcomingDeadline,
        };
      },

      getHandlerTodoTickets: (type) => {
        const { tickets, currentUnit } = get();
        const list = tickets.filter(t => 
          t.handlerUnit === currentUnit || 
          t.coOrganizers?.some(co => co.unit === currentUnit)
        );
        
        const { holidayDates, workdayDates } = getHolidayDatesSafe();

        switch (type) {
          case 'pending':
            return list.filter(t => t.status === 'pending')
              .sort((a, b) => new Date(b.assignTime).getTime() - new Date(a.assignTime).getTime());
          case 'processing':
            return list.filter(t => t.status === 'processing')
              .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
          case 'returned':
            return list.filter(t => t.status === 'returned')
              .sort((a, b) => new Date(b.assignTime).getTime() - new Date(a.assignTime).getTime());
          case 'upcoming':
            return list.filter(t => {
              if (t.status === 'completed') return false;
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
          if (t.status === 'completed') return false;
          const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
          return remaining < 0 || t.status === 'overdue' || remaining <= 1;
        }).length;

        const pendingUrge = tickets.filter(t => {
          if (t.status === 'completed') return false;
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
              if (t.status === 'completed') return false;
              const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
              return remaining < 0 || t.status === 'overdue' || remaining <= 1;
            }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
          case 'pendingUrge':
            return tickets.filter(t => {
              if (t.status === 'completed') return false;
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

      addCoOrganizer: (ticketId, data, operator) => {
        const ticket = get().tickets.find(t => t.id === ticketId);
        if (!ticket) return;
        
        if (ticket.handlerUnit === data.unit) {
          console.warn('不能选择主承办单位作为协办单位');
          return;
        }
        
        if (ticket.coOrganizers?.some(co => co.unit === data.unit)) {
          console.warn('该单位已存在于协办列表中');
          return;
        }
        
        const now = formatDateTime(new Date());
        const coOrganizer: CoOrganizer = {
          id: generateId(),
          ticketId,
          unit: data.unit,
          status: 'pending',
          requirement: data.requirement,
          deadline: data.deadline,
          progressLogs: [],
          assignTime: now,
        };
        const coorgLog: ProgressLog = {
          id: generateId(),
          ticketId,
          content: `【发起协办】已将工单协办至${data.unit}，协办要求：${data.requirement}`,
          operator,
          createTime: now,
          type: 'coorg_assign',
        };
        set((state) => ({
          tickets: state.tickets.map(t => 
            t.id === ticketId 
              ? { 
                  ...t, 
                  coOrganizers: [...(t.coOrganizers || []), coOrganizer],
                  progressLogs: [...t.progressLogs, coorgLog],
                } 
              : t
          ),
        }));
        
        const updatedTicket = get().tickets.find(t => t.id === ticketId);
        if (updatedTicket) {
          useNotificationStore.getState().addNotificationByType(
            'coorg_request',
            ticketId,
            `收到协办请求：${data.requirement}，协办期限：${data.deadline}`,
            operator,
            coOrganizer.id
          );
        }
      },

      updateCoOrgProgress: (ticketId, coOrganizerId, content, operator) => {
        const now = formatDateTime(new Date());
        const progressLog: CoOrgProgressLog = {
          id: generateId(),
          coOrganizerId,
          ticketId,
          content,
          operator,
          createTime: now,
        };
        const mainLog: ProgressLog = {
          id: generateId(),
          ticketId,
          content: `【协办进度】${operator}：${content}`,
          operator,
          createTime: now,
          type: 'coorg_progress',
        };
        set((state) => ({
          tickets: state.tickets.map(t => {
            if (t.id !== ticketId) return t;
            return {
              ...t,
              coOrganizers: (t.coOrganizers || []).map(co => {
                if (co.id !== coOrganizerId) return co;
                return {
                  ...co,
                  status: 'processing',
                  progressLogs: [...co.progressLogs, progressLog],
                };
              }),
              progressLogs: [...t.progressLogs, mainLog],
            };
          }),
        }));
      },

      completeCoOrganizer: (ticketId, coOrganizerId, result, operator) => {
        const now = formatDateTime(new Date());
        const completeLog: CoOrgProgressLog = {
          id: generateId(),
          coOrganizerId,
          ticketId,
          content: result,
          operator,
          createTime: now,
        };
        const mainLog: ProgressLog = {
          id: generateId(),
          ticketId,
          content: `【协办完成】${operator} 已完成协办工作`,
          operator,
          createTime: now,
          type: 'coorg_complete',
        };
        set((state) => ({
          tickets: state.tickets.map(t => {
            if (t.id !== ticketId) return t;
            return {
              ...t,
              coOrganizers: (t.coOrganizers || []).map(co => {
                if (co.id !== coOrganizerId) return co;
                return {
                  ...co,
                  status: 'completed',
                  result,
                  completeTime: now,
                  progressLogs: [...co.progressLogs, completeLog],
                };
              }),
              progressLogs: [...t.progressLogs, mainLog],
            };
          }),
        }));
        
        const ticket = get().tickets.find(t => t.id === ticketId);
        const coOrganizer = ticket?.coOrganizers?.find(co => co.id === coOrganizerId);
        if (ticket && coOrganizer) {
          useNotificationStore.getState().addNotificationByType(
            'result_submit',
            ticketId,
            `协办单位${coOrganizer.unit}已完成协办工作：${result.slice(0, 50)}${result.length > 50 ? '...' : ''}`,
            operator,
            coOrganizerId
          );
        }
      },

      getCoOrgTickets: (unit) => {
        const { tickets } = get();
        return tickets
          .filter(t => t.coOrganizers?.some(co => co.unit === unit))
          .sort((a, b) => new Date(b.assignTime).getTime() - new Date(a.assignTime).getTime());
      },

      getCoOrgStats: (unit) => {
        const { tickets } = get();
        const coOrgTickets = tickets.filter(t => 
          t.coOrganizers?.some(co => co.unit === unit)
        );
        let pending = 0;
        let processing = 0;
        let completed = 0;
        coOrgTickets.forEach(t => {
          t.coOrganizers?.forEach(co => {
            if (co.unit === unit) {
              if (co.status === 'pending') pending++;
              else if (co.status === 'processing') processing++;
              else if (co.status === 'completed') completed++;
            }
          });
        });
        return { pending, processing, completed };
      },

      isCoOrganizing: (ticket) => {
        if (!ticket.coOrganizers || ticket.coOrganizers.length === 0) return false;
        return ticket.coOrganizers.some(co => co.status !== 'completed');
      },

      getCoOrganizerByUnit: (ticket, unit) => {
        return ticket.coOrganizers?.find(co => co.unit === unit);
      },

      getTicketRole: (ticket, unit) => {
        if (ticket.handlerUnit === unit) return 'main';
        if (ticket.coOrganizers?.some(co => co.unit === unit)) return 'coorganizer';
        return 'none';
      },
    }),
    {
      name: 'ticket-storage',
    }
  )
);
