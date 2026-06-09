import type {
  ArchiveFilterOptions,
  CollaborationRecord,
  FilterOptions,
  Ticket,
  TicketStatus,
  UrgeRecord,
  ReturnRecord,
} from '@/types';
import { getWorkdaysRemaining } from './workday';

export interface WorkdayContext {
  now?: Date;
  holidayDates?: string[];
  workdayDates?: string[];
}

export interface TicketStats {
  pending: number;
  processing: number;
  completed: number;
  overdue: number;
}

export interface RiskGroupedTickets {
  high: Ticket[];
  medium: Ticket[];
  low: Ticket[];
}

export interface HandlerTodoStats {
  pending: number;
  processing: number;
  returned: number;
  upcomingDeadline: number;
}

export interface SupervisorTodoStats {
  highRisk: number;
  pendingUrge: number;
  returned: number;
}

const DEFAULT_NOW = () => new Date();

export function getCollaborationRecords(ticket: Ticket): CollaborationRecord[] {
  return ticket.collaborationRecords || [];
}

export function hasActiveCollaborations(ticket: Ticket): boolean {
  return getCollaborationRecords(ticket).some(record => record.status !== 'completed');
}

export function isTicketRelatedToUnit(ticket: Ticket, unit: string): boolean {
  if (!unit) return false;
  return ticket.handlerUnit === unit || getCollaborationRecords(ticket).some(record => record.unit === unit);
}

export function getVisibleTicketStatus(ticket: Ticket): TicketStatus {
  if (ticket.status === 'completed' || ticket.status === 'archived' || ticket.status === 'returned') {
    return ticket.status;
  }
  return hasActiveCollaborations(ticket) ? 'collaborating' : ticket.status;
}

export function filterTicketsByRoleAndUnit(
  tickets: Ticket[],
  currentRole: 'handler' | 'supervisor',
  currentUnit: string
): Ticket[] {
  if (currentRole !== 'handler' || !currentUnit) return tickets;
  return tickets.filter(ticket => isTicketRelatedToUnit(ticket, currentUnit));
}

export function isTicketClosedForDeadline(ticket: Ticket): boolean {
  return ticket.status === 'completed' || ticket.status === 'archived';
}

export function getRemainingWorkdays(ticket: Ticket, context: WorkdayContext = {}): number {
  return getWorkdaysRemaining(
    ticket.deadline,
    context.now || DEFAULT_NOW(),
    context.holidayDates || [],
    context.workdayDates || []
  );
}

export function isTicketOverdue(ticket: Ticket, context: WorkdayContext = {}): boolean {
  if (ticket.status === 'overdue') return true;
  if (isTicketClosedForDeadline(ticket)) return false;
  return getRemainingWorkdays(ticket, context) < 0;
}

export function matchesDeadlineRange(
  ticket: Ticket,
  range: FilterOptions['deadlineRange'],
  context: WorkdayContext = {}
): boolean {
  if (!range) return true;
  const remaining = getRemainingWorkdays(ticket, context);
  switch (range) {
    case 'overdue':
      return remaining < 0;
    case 'today':
      return remaining === 0;
    case '3days':
      return remaining >= 0 && remaining <= 3;
    case '7days':
      return remaining >= 0 && remaining <= 7;
    case '15days':
      return remaining >= 0 && remaining <= 15;
    default:
      return true;
  }
}

export function filterTicketsByAllOptions(
  tickets: Ticket[],
  filterOptions: FilterOptions,
  context: WorkdayContext = {}
): Ticket[] {
  return tickets.filter(ticket => {
    if (filterOptions.status && getVisibleTicketStatus(ticket) !== filterOptions.status) return false;
    if (filterOptions.area && ticket.area !== filterOptions.area) return false;
    if (filterOptions.handlerUnit && !isTicketRelatedToUnit(ticket, filterOptions.handlerUnit)) return false;
    if (filterOptions.category && ticket.category !== filterOptions.category) return false;
    if (filterOptions.assignDate && ticket.assignTime.split(' ')[0] !== filterOptions.assignDate) return false;
    if (!matchesDeadlineRange(ticket, filterOptions.deadlineRange, context)) return false;
    return true;
  });
}

export function getTicketStats(tickets: Ticket[], context: WorkdayContext = {}): TicketStats {
  return {
    pending: tickets.filter(ticket => getVisibleTicketStatus(ticket) === 'pending').length,
    processing: tickets.filter(ticket => {
      const visibleStatus = getVisibleTicketStatus(ticket);
      return visibleStatus === 'processing' || visibleStatus === 'collaborating';
    }).length,
    completed: tickets.filter(ticket => ticket.status === 'completed').length,
    overdue: tickets.filter(ticket => isTicketOverdue(ticket, context)).length,
  };
}

export function isWithinArchiveRange(
  archiveTime: string,
  range: ArchiveFilterOptions['archiveTimeRange'],
  now: Date = DEFAULT_NOW()
): boolean {
  if (!range) return true;

  const archivedAt = new Date(archiveTime).getTime();
  if (Number.isNaN(archivedAt)) return false;

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

export function filterArchivedTickets(
  tickets: Ticket[],
  archiveFilterOptions: ArchiveFilterOptions,
  now: Date = DEFAULT_NOW()
): Ticket[] {
  return tickets.filter(ticket => {
    if (ticket.status !== 'archived' || !ticket.archiveInfo) return false;
    if (archiveFilterOptions.handlerUnit && !isTicketRelatedToUnit(ticket, archiveFilterOptions.handlerUnit)) {
      return false;
    }
    if (archiveFilterOptions.category && ticket.category !== archiveFilterOptions.category) return false;
    if (archiveFilterOptions.satisfaction && ticket.archiveInfo.satisfaction !== archiveFilterOptions.satisfaction) {
      return false;
    }
    return isWithinArchiveRange(ticket.archiveInfo.archiveTime, archiveFilterOptions.archiveTimeRange, now);
  });
}

export function getTicketRiskLevel(ticket: Ticket, context: WorkdayContext = {}): keyof RiskGroupedTickets {
  const remaining = getRemainingWorkdays(ticket, context);
  if (remaining < 0 || ticket.status === 'overdue') return 'high';
  if (remaining <= 1) return 'high';
  if (remaining <= 3) return 'medium';
  return 'low';
}

export function groupTicketsByRiskLevel(tickets: Ticket[], context: WorkdayContext = {}): RiskGroupedTickets {
  return tickets.reduce<RiskGroupedTickets>(
    (groups, ticket) => {
      groups[getTicketRiskLevel(ticket, context)].push(ticket);
      return groups;
    },
    { high: [], medium: [], low: [] }
  );
}

export function isUpcomingDeadlineTicket(ticket: Ticket, context: WorkdayContext = {}, days = 3): boolean {
  if (isTicketClosedForDeadline(ticket)) return false;
  const remaining = getRemainingWorkdays(ticket, context);
  return remaining >= 0 && remaining <= days;
}

export function isPendingUrgeTicket(ticket: Ticket, context: WorkdayContext = {}): boolean {
  return isUpcomingDeadlineTicket(ticket, context, 3) && ticket.urgeRecords.length === 0;
}

export function getHandlerTodoStats(tickets: Ticket[], context: WorkdayContext = {}): HandlerTodoStats {
  return {
    pending: tickets.filter(ticket => getVisibleTicketStatus(ticket) === 'pending').length,
    processing: tickets.filter(ticket => {
      const visibleStatus = getVisibleTicketStatus(ticket);
      return visibleStatus === 'processing' || visibleStatus === 'collaborating';
    }).length,
    returned: tickets.filter(ticket => ticket.status === 'returned').length,
    upcomingDeadline: tickets.filter(ticket => isUpcomingDeadlineTicket(ticket, context)).length,
  };
}

export function getHandlerTodoTickets(
  tickets: Ticket[],
  type: 'pending' | 'processing' | 'returned' | 'upcoming',
  context: WorkdayContext = {}
): Ticket[] {
  switch (type) {
    case 'pending':
      return sortTicketsByAssignTimeDesc(tickets.filter(ticket => ticket.status === 'pending'));
    case 'processing':
      return sortTicketsByDeadlineAsc(tickets.filter(ticket => {
        const visibleStatus = getVisibleTicketStatus(ticket);
        return visibleStatus === 'processing' || visibleStatus === 'collaborating';
      }));
    case 'returned':
      return sortTicketsByAssignTimeDesc(tickets.filter(ticket => ticket.status === 'returned'));
    case 'upcoming':
      return sortTicketsByDeadlineAsc(tickets.filter(ticket => isUpcomingDeadlineTicket(ticket, context)));
    default:
      return [];
  }
}

export function getSupervisorTodoStats(tickets: Ticket[], context: WorkdayContext = {}): SupervisorTodoStats {
  return {
    highRisk: tickets.filter(ticket => {
      if (isTicketClosedForDeadline(ticket)) return false;
      return getTicketRiskLevel(ticket, context) === 'high';
    }).length,
    pendingUrge: tickets.filter(ticket => isPendingUrgeTicket(ticket, context)).length,
    returned: tickets.filter(ticket => ticket.status === 'returned').length,
  };
}

export function getSupervisorTodoTickets(
  tickets: Ticket[],
  type: 'highRisk' | 'pendingUrge' | 'returned',
  context: WorkdayContext = {}
): Ticket[] {
  switch (type) {
    case 'highRisk':
      return sortTicketsByDeadlineAsc(tickets.filter(ticket => {
        if (isTicketClosedForDeadline(ticket)) return false;
        return getTicketRiskLevel(ticket, context) === 'high';
      }));
    case 'pendingUrge':
      return sortTicketsByDeadlineAsc(tickets.filter(ticket => isPendingUrgeTicket(ticket, context)));
    case 'returned':
      return sortTicketsByReturnTimeDesc(tickets.filter(ticket => ticket.status === 'returned'));
    default:
      return [];
  }
}

export function filterTicketsByRule(tickets: Ticket[], ruleId: string): Ticket[] {
  return tickets.filter(ticket => ticket.dispatchInfo?.matchedRules?.some(match => match.ruleId === ruleId));
}

export function sortTicketsByAssignTimeDesc(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => new Date(b.assignTime).getTime() - new Date(a.assignTime).getTime());
}

export function sortTicketsByDeadlineAsc(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}

export function sortArchivedTicketsByArchiveTimeDesc(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort(
    (a, b) => new Date(b.archiveInfo?.archiveTime || 0).getTime() - new Date(a.archiveInfo?.archiveTime || 0).getTime()
  );
}

export function sortTicketsByReturnTimeDesc(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const aReturnTime = a.returnRecords.length > 0
      ? new Date(a.returnRecords[a.returnRecords.length - 1].createTime).getTime()
      : 0;
    const bReturnTime = b.returnRecords.length > 0
      ? new Date(b.returnRecords[b.returnRecords.length - 1].createTime).getTime()
      : 0;
    return bReturnTime - aReturnTime;
  });
}

export function sortByCreateTimeDesc<T extends UrgeRecord | ReturnRecord>(records: T[]): T[] {
  return [...records].sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
}
