import { Ticket, AREAS, CATEGORIES, HANDLER_UNITS, Area, TicketCategory, HandlerUnit } from '@/types';
import { getWorkdaysRemaining } from './workday';
import { useHolidayStore } from '@/store/useHolidayStore';

export interface TrendPoint {
  date: string;
  count: number;
}

export interface AreaDistribution {
  area: Area;
  count: number;
  ratio: number;
}

export interface UnitOverdueRank {
  unit: HandlerUnit;
  overdueCount: number;
  totalCount: number;
  overdueRate: number;
}

export interface CategoryRatio {
  category: TicketCategory;
  count: number;
  ratio: number;
}

export interface RiskTicket {
  id: string;
  title: string;
  area: Area;
  handlerUnit: HandlerUnit;
  deadline: string;
  remainingDays: number;
  riskLevel: 'high' | 'medium' | 'low';
}

export interface DynamicRecord {
  id: string;
  ticketId: string;
  ticketTitle: string;
  type: 'urge' | 'return';
  content: string;
  operator: string;
  time: string;
}

export interface TotalStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  overdue: number;
  returned: number;
  completionRate: number;
  overdueRate: number;
  todayNew: number;
  weekNew: number;
  onTimeRate: number;
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

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getTotalStats(tickets: Ticket[]): TotalStats {
  const { holidayDates, workdayDates } = getHolidayDatesSafe();
  const today = formatDateKey(new Date());
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = formatDateKey(weekAgo);

  const total = tickets.length;
  const pending = tickets.filter(t => t.status === 'pending').length;
  const processing = tickets.filter(t => t.status === 'processing').length;
  const completed = tickets.filter(t => t.status === 'completed').length;
  const overdue = tickets.filter(t => {
    if (t.status === 'overdue') return true;
    if (t.status === 'completed') return false;
    const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
    return remaining < 0;
  }).length;
  const returned = tickets.filter(t => t.status === 'returned').length;

  const todayNew = tickets.filter(t => t.assignTime.split(' ')[0] === today).length;
  
  const weekNew = tickets.filter(t => {
    const assignDate = t.assignTime.split(' ')[0];
    return assignDate >= weekAgoStr && assignDate <= today;
  }).length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;
  
  const completedOnTime = tickets.filter(t => {
    if (t.status !== 'completed') return false;
    const completeLog = t.progressLogs.find(l => l.type === 'complete');
    if (!completeLog) return false;
    const completeTime = new Date(completeLog.createTime);
    const deadlineTime = new Date(t.deadline);
    return completeTime <= deadlineTime;
  }).length;
  
  const onTimeRate = completed > 0 ? Math.round((completedOnTime / completed) * 100) : 0;

  return {
    total,
    pending,
    processing,
    completed,
    overdue,
    returned,
    completionRate,
    overdueRate,
    todayNew,
    weekNew,
    onTimeRate,
  };
}

export function getTrendData(tickets: Ticket[], days: number = 7): TrendPoint[] {
  const result: TrendPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = formatDateKey(date);
    
    const count = tickets.filter(t => {
      const assignDate = t.assignTime.split(' ')[0];
      return assignDate === dateStr;
    }).length;

    result.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      count,
    });
  }

  return result;
}

export function getStatusTrendData(tickets: Ticket[], days: number = 7) {
  const result: { date: string; pending: number; processing: number; completed: number }[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = formatDateKey(date);
    
    const dayTickets = tickets.filter(t => {
      const assignDate = t.assignTime.split(' ')[0];
      return assignDate <= dateStr;
    });

    const pending = dayTickets.filter(t => {
      if (t.status === 'completed') {
        const completeLog = t.progressLogs.find(l => l.type === 'complete');
        return completeLog && completeLog.createTime.split(' ')[0] > dateStr;
      }
      return t.assignTime.split(' ')[0] <= dateStr;
    }).length;

    result.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      pending,
      processing: 0,
      completed: dayTickets.filter(t => t.status === 'completed').length,
    });
  }

  return result;
}

export function getAreaDistribution(tickets: Ticket[]): AreaDistribution[] {
  const total = tickets.length;
  return AREAS.map(area => ({
    area,
    count: tickets.filter(t => t.area === area).length,
    ratio: total > 0 ? Math.round((tickets.filter(t => t.area === area).length / total) * 100) : 0,
  })).sort((a, b) => b.count - a.count);
}

export function getUnitOverdueRank(tickets: Ticket[]): UnitOverdueRank[] {
  const { holidayDates, workdayDates } = getHolidayDatesSafe();
  
  return HANDLER_UNITS.map(unit => {
    const unitTickets = tickets.filter(t => t.handlerUnit === unit);
    const overdueCount = unitTickets.filter(t => {
      if (t.status === 'overdue') return true;
      if (t.status === 'completed' || t.status === 'returned') return false;
      const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
      return remaining < 0;
    }).length;
    
    const totalCount = unitTickets.length;
    const overdueRate = totalCount > 0 ? Math.round((overdueCount / totalCount) * 100) : 0;

    return {
      unit,
      overdueCount,
      totalCount,
      overdueRate,
    };
  })
    .filter(item => item.totalCount > 0)
    .sort((a, b) => b.overdueCount - a.overdueCount || b.overdueRate - a.overdueRate);
}

export function getCategoryRatio(tickets: Ticket[]): CategoryRatio[] {
  const total = tickets.length;
  
  return CATEGORIES.map(category => {
    const count = tickets.filter(t => t.category === category).length;
    return {
      category,
      count,
      ratio: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  }).sort((a, b) => b.count - a.count);
}

export function getHighRiskTickets(tickets: Ticket[], limit: number = 10): RiskTicket[] {
  const { holidayDates, workdayDates } = getHolidayDatesSafe();
  
  const activeTickets = tickets.filter(t => t.status !== 'completed');
  
  const riskTickets: RiskTicket[] = activeTickets.map(t => {
    const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
    
    let riskLevel: 'high' | 'medium' | 'low';
    if (remaining < 0 || t.status === 'overdue') {
      riskLevel = 'high';
    } else if (remaining <= 2) {
      riskLevel = 'high';
    } else if (remaining <= 5) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      id: t.id,
      title: t.title,
      area: t.area,
      handlerUnit: t.handlerUnit,
      deadline: t.deadline,
      remainingDays: remaining,
      riskLevel,
    };
  });

  return riskTickets
    .filter(t => t.riskLevel === 'high')
    .sort((a, b) => a.remainingDays - b.remainingDays)
    .slice(0, limit);
}

export function getMediumRiskTickets(tickets: Ticket[], limit: number = 10): RiskTicket[] {
  const { holidayDates, workdayDates } = getHolidayDatesSafe();
  
  const activeTickets = tickets.filter(t => t.status !== 'completed');
  
  const riskTickets: RiskTicket[] = activeTickets.map(t => {
    const remaining = getWorkdaysRemaining(t.deadline, new Date(), holidayDates, workdayDates);
    
    let riskLevel: 'high' | 'medium' | 'low';
    if (remaining < 0 || t.status === 'overdue') {
      riskLevel = 'high';
    } else if (remaining <= 2) {
      riskLevel = 'high';
    } else if (remaining <= 5) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      id: t.id,
      title: t.title,
      area: t.area,
      handlerUnit: t.handlerUnit,
      deadline: t.deadline,
      remainingDays: remaining,
      riskLevel,
    };
  });

  return riskTickets
    .filter(t => t.riskLevel === 'medium')
    .sort((a, b) => a.remainingDays - b.remainingDays)
    .slice(0, limit);
}

export function getRecentDynamics(tickets: Ticket[], limit: number = 20): DynamicRecord[] {
  const records: DynamicRecord[] = [];

  tickets.forEach(ticket => {
    ticket.urgeRecords.forEach(urge => {
      records.push({
        id: urge.id,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        type: 'urge',
        content: urge.reason,
        operator: urge.operator,
        time: urge.createTime,
      });
    });

    ticket.returnRecords.forEach(ret => {
      records.push({
        id: ret.id,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        type: 'return',
        content: ret.reason,
        operator: ret.operator,
        time: ret.createTime,
      });
    });
  });

  return records
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit);
}

export function getUrgeCount(tickets: Ticket[]): number {
  return tickets.reduce((sum, t) => sum + t.urgeRecords.length, 0);
}

export function getReturnCount(tickets: Ticket[]): number {
  return tickets.reduce((sum, t) => sum + t.returnRecords.length, 0);
}
