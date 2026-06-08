import { formatDate } from './date';

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
