import { formatDate } from './date';
import type { HolidayConfig, RiskLevel, Ticket } from '@/types';

const DEFAULT_HOLIDAYS: string[] = [];
const DEFAULT_WORKDAYS: string[] = [];

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function isWeekend(date: Date): boolean {
  if (!isValidDate(date)) return false;
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isWorkday(
  date: Date | string,
  holidayDates: string[] = DEFAULT_HOLIDAYS,
  workdayDates: string[] = DEFAULT_WORKDAYS
): boolean {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  if (!isValidDate(d)) return true;
  
  const dateStr = formatDate(d);
  
  if (workdayDates && workdayDates.includes(dateStr)) {
    return true;
  }
  
  if (holidayDates && holidayDates.includes(dateStr)) {
    return false;
  }
  
  return !isWeekend(d);
}

export function addWorkdays(
  startDate: Date | string,
  days: number,
  holidayDates: string[] = DEFAULT_HOLIDAYS,
  workdayDates: string[] = DEFAULT_WORKDAYS
): Date {
  const d = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  if (!isValidDate(d)) return new Date();
  
  d.setHours(0, 0, 0, 0);
  
  const safeDays = isNaN(days) ? 0 : days;
  let remaining = Math.abs(safeDays);
  const direction = safeDays >= 0 ? 1 : -1;
  
  let guard = 0;
  while (remaining > 0 && guard < 10000) {
    d.setDate(d.getDate() + direction);
    if (isWorkday(d, holidayDates, workdayDates)) {
      remaining--;
    }
    guard++;
  }
  
  return d;
}

export function getWorkdaysBetween(
  startDate: Date | string,
  endDate: Date | string,
  holidayDates: string[] = DEFAULT_HOLIDAYS,
  workdayDates: string[] = DEFAULT_WORKDAYS
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);
  
  if (!isValidDate(start) || !isValidDate(end)) return 0;
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  if (start.getTime() === end.getTime()) {
    return 0;
  }
  
  const isNegative = start > end;
  const [earlier, later] = isNegative ? [end, start] : [start, end];
  
  let count = 0;
  const current = new Date(earlier);
  
  let guard = 0;
  while (current < later && guard < 10000) {
    current.setDate(current.getDate() + 1);
    if (isWorkday(current, holidayDates, workdayDates)) {
      count++;
    }
    guard++;
  }
  
  return isNegative ? -count : count;
}

export function getWorkdaysRemaining(
  deadline: string,
  now: Date = new Date(),
  holidayDates: string[] = DEFAULT_HOLIDAYS,
  workdayDates: string[] = DEFAULT_WORKDAYS
): number {
  return getWorkdaysBetween(now, deadline, holidayDates, workdayDates);
}

export function getDeadlineLabelWorkdays(
  deadline: string,
  status: string,
  holidayDates: string[] = DEFAULT_HOLIDAYS,
  workdayDates: string[] = DEFAULT_WORKDAYS
): string {
  if (status === 'completed') return '已办结';
  
  const days = getWorkdaysRemaining(deadline, new Date(), holidayDates, workdayDates);
  
  if (days < 0) return `超期${Math.abs(days)}个工作日`;
  if (days === 0) return '今天到期';
  if (days === 1) return '剩余1个工作日';
  return `剩余${days}个工作日`;
}

export function getRiskLevelWorkdays(
  deadline: string,
  status: string,
  holidayDates: string[] = DEFAULT_HOLIDAYS,
  workdayDates: string[] = DEFAULT_WORKDAYS
): 'high' | 'medium' | 'low' {
  if (status === 'completed') return 'low';
  
  const daysRemaining = getWorkdaysRemaining(deadline, new Date(), holidayDates, workdayDates);
  
  if (daysRemaining < 0 || status === 'overdue') return 'high';
  if (daysRemaining <= 1) return 'high';
  if (daysRemaining <= 3) return 'medium';
  return 'low';
}

export function calculateDeadlineWorkdays(
  assignDate: Date | string,
  deadlineDays: number,
  holidayDates: string[] = DEFAULT_HOLIDAYS,
  workdayDates: string[] = DEFAULT_WORKDAYS
): string {
  const deadline = addWorkdays(assignDate, deadlineDays, holidayDates, workdayDates);
  return formatDate(deadline);
}

export interface HolidayImpactItem {
  ticketId: string;
  title: string;
  handlerUnit: string;
  status: string;
  deadline: string;
  beforeRemaining: number;
  afterRemaining: number;
  beforeRiskLevel: RiskLevel;
  afterRiskLevel: RiskLevel;
  beforeOverdue: boolean;
  afterOverdue: boolean;
  remainingChanged: boolean;
  riskChanged: boolean;
  overdueChanged: boolean;
}

export interface HolidayImpactPreview {
  items: HolidayImpactItem[];
  changedCount: number;
  remainingChangedCount: number;
  riskChangedCount: number;
  overdueChangedCount: number;
  newOverdueCount: number;
  riskRaisedCount: number;
  requiresConfirmation: boolean;
}

function getHolidayDatesByType(holidays: HolidayConfig[], type: HolidayConfig['type']) {
  return holidays.filter(holiday => holiday.type === type).map(holiday => holiday.date);
}

function getRiskLevelFromRemaining(remaining: number, status: string): RiskLevel {
  if (remaining < 0 || status === 'overdue') return 'high';
  if (remaining <= 1) return 'high';
  if (remaining <= 3) return 'medium';
  return 'low';
}

function getRiskRank(riskLevel: RiskLevel) {
  if (riskLevel === 'high') return 3;
  if (riskLevel === 'medium') return 2;
  return 1;
}

export function calculateHolidayImpactPreview(
  tickets: Ticket[],
  currentHolidays: HolidayConfig[],
  nextHolidays: HolidayConfig[],
  now: Date = new Date()
): HolidayImpactPreview {
  const currentHolidayDates = getHolidayDatesByType(currentHolidays, 'holiday');
  const currentWorkdayDates = getHolidayDatesByType(currentHolidays, 'workday');
  const nextHolidayDates = getHolidayDatesByType(nextHolidays, 'holiday');
  const nextWorkdayDates = getHolidayDatesByType(nextHolidays, 'workday');

  const items = tickets
    .filter(ticket => ticket.status !== 'completed' && ticket.status !== 'archived')
    .map(ticket => {
      const beforeRemaining = getWorkdaysRemaining(ticket.deadline, now, currentHolidayDates, currentWorkdayDates);
      const afterRemaining = getWorkdaysRemaining(ticket.deadline, now, nextHolidayDates, nextWorkdayDates);
      const beforeRiskLevel = getRiskLevelFromRemaining(beforeRemaining, ticket.status);
      const afterRiskLevel = getRiskLevelFromRemaining(afterRemaining, ticket.status);
      const beforeOverdue = beforeRemaining < 0 || ticket.status === 'overdue';
      const afterOverdue = afterRemaining < 0 || ticket.status === 'overdue';

      return {
        ticketId: ticket.id,
        title: ticket.title,
        handlerUnit: ticket.handlerUnit,
        status: ticket.status,
        deadline: ticket.deadline,
        beforeRemaining,
        afterRemaining,
        beforeRiskLevel,
        afterRiskLevel,
        beforeOverdue,
        afterOverdue,
        remainingChanged: beforeRemaining !== afterRemaining,
        riskChanged: beforeRiskLevel !== afterRiskLevel,
        overdueChanged: beforeOverdue !== afterOverdue,
      };
    })
    .filter(item => item.remainingChanged || item.riskChanged || item.overdueChanged)
    .sort((a, b) => {
      const riskDelta = getRiskRank(b.afterRiskLevel) - getRiskRank(a.afterRiskLevel);
      if (riskDelta !== 0) return riskDelta;
      return a.afterRemaining - b.afterRemaining;
    });

  const riskRaisedCount = items.filter(
    item => getRiskRank(item.afterRiskLevel) > getRiskRank(item.beforeRiskLevel)
  ).length;
  const newOverdueCount = items.filter(item => !item.beforeOverdue && item.afterOverdue).length;

  return {
    items,
    changedCount: items.length,
    remainingChangedCount: items.filter(item => item.remainingChanged).length,
    riskChangedCount: items.filter(item => item.riskChanged).length,
    overdueChangedCount: items.filter(item => item.overdueChanged).length,
    newOverdueCount,
    riskRaisedCount,
    requiresConfirmation: newOverdueCount > 0 || riskRaisedCount > 0,
  };
}
