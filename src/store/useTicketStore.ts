import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Ticket, TicketStatus, ProgressLog, FilterOptions, UrgeRecord, ReturnRecord, Attachment } from '@/types';
import { mockTickets } from '@/data/mockData';
import { generateId, formatDateTime } from '@/utils/date';

interface TicketState {
  tickets: Ticket[];
  currentRole: 'handler' | 'supervisor';
  currentUnit: string;
  filterOptions: FilterOptions;
  
  setCurrentRole: (role: 'handler' | 'supervisor') => void;
  setCurrentUnit: (unit: string) => void;
  setFilterOptions: (options: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  
  getTicketById: (id: string) => Ticket | undefined;
  getFilteredTickets: () => Ticket[];
  getTicketStats: () => {
    pending: number;
    processing: number;
    completed: number;
    overdue: number;
  };
  
  addTicket: (ticket: Omit<Ticket, 'id' | 'progressLogs' | 'attachments' | 'urgeRecords' | 'returnRecords' | 'creator' | 'status'>) => void;
  batchAddTickets: (tickets: Omit<Ticket, 'id' | 'progressLogs' | 'attachments' | 'urgeRecords' | 'returnRecords' | 'creator' | 'status'>[]) => number;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  addProgressLog: (ticketId: string, content: string, type: ProgressLog['type'], operator: string) => void;
  submitResult: (ticketId: string, result: string, attachments?: Attachment[]) => void;
  
  urgeTicket: (ticketId: string, reason: string, operator: string) => void;
  returnTicket: (ticketId: string, reason: string, operator: string) => void;
  
  getRiskTickets: () => { high: Ticket[]; medium: Ticket[]; low: Ticket[] };
  getUrgeRecords: () => UrgeRecord[];
  getReturnRecords: () => ReturnRecord[];
}

const initialFilterOptions: FilterOptions = {
  status: '',
  area: '',
  handlerUnit: '',
  category: '',
  deadlineRange: '',
};

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: mockTickets,
      currentRole: 'supervisor',
      currentUnit: '',
      filterOptions: initialFilterOptions,

      setCurrentRole: (role) => set({ currentRole: role }),
      setCurrentUnit: (unit) => set({ currentUnit: unit }),
      
      setFilterOptions: (options) => set((state) => ({
        filterOptions: { ...state.filterOptions, ...options },
      })),
      
      resetFilters: () => set({ filterOptions: initialFilterOptions }),

      getTicketById: (id) => {
        return get().tickets.find(t => t.id === id);
      },

      getFilteredTickets: () => {
        const { tickets, filterOptions, currentRole, currentUnit } = get();
        let filtered = [...tickets];

        if (currentRole === 'handler' && currentUnit) {
          filtered = filtered.filter(t => t.handlerUnit === currentUnit);
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
          const now = new Date();
          filtered = filtered.filter(t => {
            const deadline = new Date(t.deadline);
            const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            switch (filterOptions.deadlineRange) {
              case 'overdue': return diffDays < 0;
              case 'today': return diffDays === 0;
              case '3days': return diffDays >= 0 && diffDays <= 3;
              case '7days': return diffDays >= 0 && diffDays <= 7;
              case '15days': return diffDays >= 0 && diffDays <= 15;
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
          list = list.filter(t => t.handlerUnit === currentUnit);
        }
        return {
          pending: list.filter(t => t.status === 'pending').length,
          processing: list.filter(t => t.status === 'processing').length,
          completed: list.filter(t => t.status === 'completed').length,
          overdue: list.filter(t => t.status === 'overdue' || (t.status !== 'completed' && new Date(t.deadline) < new Date())).length,
        };
      },

      addTicket: (ticketData) => {
        const newTicket: Ticket = {
          ...ticketData,
          id: 'GD' + Date.now().toString().slice(-8),
          status: 'pending',
          creator: '热线坐席员',
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
              content: `工单已分派至${ticketData.handlerUnit}`,
              operator: '工单调度员',
              createTime: formatDateTime(new Date()),
              type: 'assign',
            },
          ],
          attachments: [],
          urgeRecords: [],
          returnRecords: [],
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
        let list = tickets.filter(t => t.status !== 'completed');
        if (currentRole === 'handler' && currentUnit) {
          list = list.filter(t => t.handlerUnit === currentUnit);
        }
        
        const now = new Date();
        const high: Ticket[] = [];
        const medium: Ticket[] = [];
        const low: Ticket[] = [];

        list.forEach(t => {
          const deadline = new Date(t.deadline);
          const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0 || t.status === 'overdue') {
            high.push(t);
          } else if (diffDays <= 1) {
            high.push(t);
          } else if (diffDays <= 3) {
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
    }),
    {
      name: 'ticket-storage',
    }
  )
);
