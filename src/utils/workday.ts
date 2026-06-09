import { formatDate } from './date';
import type { Ticket, RiskLevel, ImpactSeverity, HistoricalTicketImpact } from '@/types';

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

export interface TicketImpact {
  ticketId: string;
  ticketTitle: string;
  handlerUnit: string;
  deadline: string;
  oldRemainingWorkdays: number;
  newRemainingWorkdays: number;
  workdaysChange: number;
  oldRiskLevel: RiskLevel;
  newRiskLevel: RiskLevel;
  riskLevelChanged: boolean;
  oldIsOverdue: boolean;
  newIsOverdue: boolean;
  overdueStatusChanged: boolean;
  isCoOrg: boolean;
  coOrgUnit?: string;
  coOrgDeadline?: string;
}

export interface HolidayImpactPreview {
  totalAffected: number;
  workdaysDecreased: number;
  workdaysIncreased: number;
  riskElevated: number;
  riskReduced: number;
  newlyOverdue: number;
  noLongerOverdue: number;
  affectedTickets: TicketImpact[];
  severity: ImpactSeverity;
  historicalAffected: number;
  historicalTickets: HistoricalTicketImpact[];
  requiresStrongConfirmation: boolean;
  strongConfirmationReason?: string;
}

export function calculateImpactSeverity(
  newlyOverdue: number,
  riskElevated: number,
  totalAffected: number,
  totalTickets: number
): ImpactSeverity {
  const affectRatio = totalTickets > 0 ? totalAffected / totalTickets : 0;
  if (newlyOverdue >= 10 || riskElevated >= 20 || affectRatio >= 0.3) return 'critical';
  if (newlyOverdue >= 5 || riskElevated >= 10 || totalAffected >= 30 || affectRatio >= 0.2) return 'high';
  if (newlyOverdue >= 1 || riskElevated >= 3 || totalAffected >= 10 || affectRatio >= 0.1) return 'medium';
  return 'low';
}

export function shouldRequireStrongConfirmation(
  severity: ImpactSeverity,
  newlyOverdue: number,
  riskElevated: number
): { required: boolean; reason?: string } {
  if (severity === 'critical') {
    return {
      required: true,
      reason: `严重影响：${newlyOverdue}个工单将变为超期，${riskElevated}个工单风险等级将升高，需二次确认！`
    };
  }
  if (severity === 'high' && newlyOverdue >= 3) {
    return {
      required: true,
      reason: `高影响：${newlyOverdue}个工单将变为超期，建议仔细确认后再保存。`
    };
  }
  return { required: false };
}

export function calculateHolidayImpactPreview(
  tickets: Ticket[],
  oldHolidayDates: string[],
  oldWorkdayDates: string[],
  newHolidayDates: string[],
  newWorkdayDates: string[],
  now: Date = new Date()
): HolidayImpactPreview {
  const affectedTickets: TicketImpact[] = [];
  const historicalTickets: HistoricalTicketImpact[] = [];

  const openTickets = tickets.filter(t => t.status !== 'completed' && t.status !== 'archived');
  const historicalClosedTickets = tickets.filter(t => t.status === 'completed' || t.status === 'archived');

  openTickets.forEach((ticket) => {
    const oldRemaining = getWorkdaysRemaining(ticket.deadline, now, oldHolidayDates, oldWorkdayDates);
    const newRemaining = getWorkdaysRemaining(ticket.deadline, now, newHolidayDates, newWorkdayDates);
    const oldRisk = getRiskLevelWorkdays(ticket.deadline, ticket.status, oldHolidayDates, oldWorkdayDates);
    const newRisk = getRiskLevelWorkdays(ticket.deadline, ticket.status, newHolidayDates, newWorkdayDates);
    const oldOverdue = oldRemaining < 0 || ticket.status === 'overdue';
    const newOverdue = newRemaining < 0 || ticket.status === 'overdue';

    const workdaysChanged = oldRemaining !== newRemaining;
    const riskChanged = oldRisk !== newRisk;
    const overdueChanged = oldOverdue !== newOverdue;

    if (workdaysChanged || riskChanged || overdueChanged) {
      affectedTickets.push({
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        handlerUnit: ticket.handlerUnit,
        deadline: ticket.deadline,
        oldRemainingWorkdays: oldRemaining,
        newRemainingWorkdays: newRemaining,
        workdaysChange: newRemaining - oldRemaining,
        oldRiskLevel: oldRisk,
        newRiskLevel: newRisk,
        riskLevelChanged: riskChanged,
        oldIsOverdue: oldOverdue,
        newIsOverdue: newOverdue,
        overdueStatusChanged: overdueChanged,
        isCoOrg: false,
      });
    }

    if (ticket.coOrganizers && ticket.coOrganizers.length > 0) {
      ticket.coOrganizers.forEach(co => {
        if (co.status === 'completed') return;

        const coOldRemaining = getWorkdaysRemaining(co.deadline, now, oldHolidayDates, oldWorkdayDates);
        const coNewRemaining = getWorkdaysRemaining(co.deadline, now, newHolidayDates, newWorkdayDates);
        const coOldRisk = getRiskLevelWorkdays(co.deadline, co.status, oldHolidayDates, oldWorkdayDates);
        const coNewRisk = getRiskLevelWorkdays(co.deadline, co.status, newHolidayDates, newWorkdayDates);
        const coOldOverdue = coOldRemaining < 0;
        const coNewOverdue = coNewRemaining < 0;

        const coWorkdaysChanged = coOldRemaining !== coNewRemaining;
        const coRiskChanged = coOldRisk !== coNewRisk;
        const coOverdueChanged = coOldOverdue !== coNewOverdue;

        if (coWorkdaysChanged || coRiskChanged || coOverdueChanged) {
          affectedTickets.push({
            ticketId: ticket.id,
            ticketTitle: ticket.title,
            handlerUnit: ticket.handlerUnit,
            deadline: ticket.deadline,
            oldRemainingWorkdays: coOldRemaining,
            newRemainingWorkdays: coNewRemaining,
            workdaysChange: coNewRemaining - coOldRemaining,
            oldRiskLevel: coOldRisk,
            newRiskLevel: coNewRisk,
            riskLevelChanged: coRiskChanged,
            oldIsOverdue: coOldOverdue,
            newIsOverdue: coNewOverdue,
            overdueStatusChanged: coOverdueChanged,
            isCoOrg: true,
            coOrgUnit: co.unit,
            coOrgDeadline: co.deadline,
          });
        }
      });
    }
  });

  historicalClosedTickets.forEach((ticket) => {
    const oldRemaining = getWorkdaysRemaining(ticket.deadline, now, oldHolidayDates, oldWorkdayDates);
    const newRemaining = getWorkdaysRemaining(ticket.deadline, now, newHolidayDates, newWorkdayDates);
    const oldRisk = getRiskLevelWorkdays(ticket.deadline, 'completed', oldHolidayDates, oldWorkdayDates);
    const newRisk = getRiskLevelWorkdays(ticket.deadline, 'completed', newHolidayDates, newWorkdayDates);
    const oldOverdue = oldRemaining < 0;
    const newOverdue = newRemaining < 0;

    const workdaysChanged = oldRemaining !== newRemaining;
    const riskChanged = oldRisk !== newRisk;
    const overdueChanged = oldOverdue !== newOverdue;

    if (workdaysChanged || riskChanged || overdueChanged) {
      historicalTickets.push({
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        handlerUnit: ticket.handlerUnit,
        deadline: ticket.deadline,
        oldRemainingWorkdays: oldRemaining,
        newRemainingWorkdays: newRemaining,
        workdaysChange: newRemaining - oldRemaining,
        oldRiskLevel: oldRisk,
        newRiskLevel: newRisk,
        riskLevelChanged: riskChanged,
        oldIsOverdue: oldOverdue,
        newIsOverdue: newOverdue,
        overdueStatusChanged: overdueChanged,
        isCoOrg: false,
      });
    }
  });

  const workdaysDecreased = affectedTickets.filter(t => t.workdaysChange < 0).length;
  const workdaysIncreased = affectedTickets.filter(t => t.workdaysChange > 0).length;
  const riskElevated = affectedTickets.filter(t => {
    if (!t.riskLevelChanged) return false;
    const riskOrder: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
    return riskOrder[t.newRiskLevel] > riskOrder[t.oldRiskLevel];
  }).length;
  const riskReduced = affectedTickets.filter(t => {
    if (!t.riskLevelChanged) return false;
    const riskOrder: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
    return riskOrder[t.newRiskLevel] < riskOrder[t.oldRiskLevel];
  }).length;
  const newlyOverdue = affectedTickets.filter(t => !t.oldIsOverdue && t.newIsOverdue).length;
  const noLongerOverdue = affectedTickets.filter(t => t.oldIsOverdue && !t.newIsOverdue).length;
  const historicalAffected = historicalTickets.length;

  const severity = calculateImpactSeverity(newlyOverdue, riskElevated, affectedTickets.length, tickets.length);
  const strongConfirm = shouldRequireStrongConfirmation(severity, newlyOverdue, riskElevated);

  return {
    totalAffected: affectedTickets.length,
    workdaysDecreased,
    workdaysIncreased,
    riskElevated,
    riskReduced,
    newlyOverdue,
    noLongerOverdue,
    affectedTickets: affectedTickets.sort((a, b) => a.newRemainingWorkdays - b.newRemainingWorkdays),
    severity,
    historicalAffected,
    historicalTickets: historicalTickets.sort((a, b) => a.workdaysChange - b.workdaysChange),
    requiresStrongConfirmation: strongConfirm.required,
    strongConfirmationReason: strongConfirm.reason,
  };
}
