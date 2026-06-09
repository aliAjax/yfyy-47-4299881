import { describe, expect, it } from 'vitest';
import type { HolidayConfig, Ticket } from '@/types';
import {
  addWorkdays,
  calculateHolidayImpactPreview,
  getWorkdaysBetween,
  getWorkdaysRemaining,
  isWorkday,
} from './workday';
import { formatDate } from './date';

const holiday = (date: string, type: HolidayConfig['type'], name = date): HolidayConfig => ({
  id: `${type}-${date}`,
  date,
  name,
  type,
  year: Number(date.slice(0, 4)),
  createTime: `${date} 09:00`,
  updateTime: `${date} 09:00`,
});

const ticket = (overrides: Partial<Ticket>): Ticket => ({
  id: overrides.id ?? 'ticket-1',
  title: overrides.title ?? '测试工单',
  category: overrides.category ?? '城市管理',
  area: overrides.area ?? '东城区',
  content: overrides.content ?? '测试内容',
  assignTime: overrides.assignTime ?? '2026-05-29 09:00',
  deadline: overrides.deadline ?? '2026-06-03',
  handlerUnit: overrides.handlerUnit ?? '城市管理委员会',
  status: overrides.status ?? 'processing',
  creator: overrides.creator ?? '测试员',
  handler: overrides.handler,
  result: overrides.result,
  progressLogs: overrides.progressLogs ?? [],
  attachments: overrides.attachments ?? [],
  urgeRecords: overrides.urgeRecords ?? [],
  returnRecords: overrides.returnRecords ?? [],
  collaborationRecords: overrides.collaborationRecords,
  archiveInfo: overrides.archiveInfo,
  dispatchInfo: overrides.dispatchInfo,
});

describe('workday utilities', () => {
  it('identifies weekends, manual holidays, and adjusted workdays', () => {
    expect(isWorkday('2026-06-08')).toBe(true);
    expect(isWorkday('2026-06-06')).toBe(false);
    expect(isWorkday('2026-06-07')).toBe(false);
    expect(isWorkday('2026-06-08', ['2026-06-08'])).toBe(false);
    expect(isWorkday('2026-06-06', [], ['2026-06-06'])).toBe(true);
    expect(isWorkday('2026-06-06', ['2026-06-06'], ['2026-06-06'])).toBe(true);
  });

  it('adds workdays across weekends, manual holidays, adjusted workdays, and month boundaries', () => {
    const holidays = ['2026-06-01'];
    const workdays = ['2026-06-06'];

    expect(formatDate(addWorkdays('2026-05-29', 1, holidays, workdays))).toBe('2026-06-02');
    expect(formatDate(addWorkdays('2026-05-29', 5, holidays, workdays))).toBe('2026-06-06');
    expect(formatDate(addWorkdays('2026-06-02', -1, holidays, workdays))).toBe('2026-05-29');
  });

  it('counts workdays between dates across month boundaries in both directions', () => {
    const holidays = ['2026-06-01'];
    const workdays = ['2026-06-06'];

    expect(getWorkdaysBetween('2026-05-29', '2026-06-06', holidays, workdays)).toBe(5);
    expect(getWorkdaysBetween('2026-06-06', '2026-05-29', holidays, workdays)).toBe(-5);
    expect(getWorkdaysBetween('2026-05-29', '2026-05-29', holidays, workdays)).toBe(0);
  });

  it('calculates remaining workdays from a fixed current date', () => {
    const holidays = ['2026-06-01'];
    const workdays = ['2026-06-06'];
    const now = new Date('2026-05-29T10:00:00');

    expect(getWorkdaysRemaining('2026-06-03', now, holidays, workdays)).toBe(2);
    expect(getWorkdaysRemaining('2026-05-28', now, holidays, workdays)).toBe(-1);
  });

  it('previews holiday impact and excludes completed or archived tickets', () => {
    const currentHolidays: HolidayConfig[] = [];
    const nextHolidays: HolidayConfig[] = [
      holiday('2026-06-01', 'holiday', '手动节假日'),
      holiday('2026-06-06', 'workday', '调休工作日'),
    ];
    const now = new Date('2026-05-29T09:00:00');
    const tickets = [
      ticket({ id: 'active', title: '办理中工单', status: 'processing', deadline: '2026-06-03' }),
      ticket({ id: 'completed', title: '已办结工单', status: 'completed', deadline: '2026-06-03' }),
      ticket({ id: 'archived', title: '已归档工单', status: 'archived', deadline: '2026-06-03' }),
    ];

    const preview = calculateHolidayImpactPreview(tickets, currentHolidays, nextHolidays, now);

    expect(preview.items).toHaveLength(1);
    expect(preview.items[0]).toMatchObject({
      ticketId: 'active',
      beforeRemaining: 3,
      afterRemaining: 2,
      beforeRiskLevel: 'medium',
      afterRiskLevel: 'medium',
      beforeOverdue: false,
      afterOverdue: false,
      remainingChanged: true,
      riskChanged: false,
      overdueChanged: false,
    });
    expect(preview.items.map(item => item.ticketId)).not.toContain('completed');
    expect(preview.items.map(item => item.ticketId)).not.toContain('archived');
    expect(preview.changedCount).toBe(1);
    expect(preview.remainingChangedCount).toBe(1);
    expect(preview.riskChangedCount).toBe(0);
    expect(preview.overdueChangedCount).toBe(0);
    expect(preview.newOverdueCount).toBe(0);
    expect(preview.riskRaisedCount).toBe(0);
    expect(preview.requiresConfirmation).toBe(false);
  });
});
