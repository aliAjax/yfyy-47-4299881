import { describe, expect, it } from 'vitest';
import type { ArchiveReview, DispatchInfo, Ticket } from '@/types';
import {
  filterArchivedTickets,
  filterTicketsByAllOptions,
  filterTicketsByRoleAndUnit,
  filterTicketsByRule,
  getHandlerTodoStats,
  getHandlerTodoTickets,
  getSupervisorTodoStats,
  getSupervisorTodoTickets,
  getTicketStats,
  getVisibleTicketStatus,
  groupTicketsByRiskLevel,
  hasActiveCollaborations,
  isTicketRelatedToUnit,
  sortArchivedTicketsByArchiveTimeDesc,
  sortByCreateTimeDesc,
  sortTicketsByAssignTimeDesc,
} from './ticketLogic';

const archive = (overrides: Partial<ArchiveReview> = {}): ArchiveReview => ({
  id: overrides.id ?? 'archive-1',
  ticketId: overrides.ticketId ?? 'ticket-1',
  satisfaction: overrides.satisfaction ?? 'satisfied',
  completionQuality: overrides.completionQuality ?? 'qualified',
  issueTags: overrides.issueTags ?? [],
  remark: overrides.remark ?? '',
  archivedBy: overrides.archivedBy ?? '督办员',
  archiveTime: overrides.archiveTime ?? '2026-06-08 09:00',
});

const dispatchInfo = (ruleId: string): DispatchInfo => ({
  matchedRules: [{
    ruleId,
    ruleName: `规则${ruleId}`,
    matchedFields: ['category'],
    matchedKeywords: ['测试'],
    score: 80,
  }],
  recommendedUnit: '城市管理委员会',
  recommendedDeadlineDays: 3,
  appliedRecommendation: true,
  hasConflict: false,
  dispatchMethod: 'auto',
  dispatchOperator: '调度员',
  dispatchTime: '2026-06-01 09:00',
});

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: overrides.id ?? 'ticket-1',
  title: overrides.title ?? '测试工单',
  category: overrides.category ?? '城市管理',
  area: overrides.area ?? '东城区',
  content: overrides.content ?? '测试内容',
  assignTime: overrides.assignTime ?? '2026-06-01 09:00',
  deadline: overrides.deadline ?? '2026-06-05',
  handlerUnit: overrides.handlerUnit ?? '城市管理委员会',
  status: overrides.status ?? 'processing',
  creator: overrides.creator ?? '热线坐席员',
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

describe('ticket logic utilities', () => {
  const context = { now: new Date('2026-06-03T09:00:00'), holidayDates: [], workdayDates: [] };

  it('checks ticket-unit relationship across main handler and collaborators', () => {
    const source = ticket({
      handlerUnit: '城市管理委员会',
      collaborationRecords: [{
        id: 'co-1',
        ticketId: 'ticket-1',
        unit: '交通委员会',
        description: '协办',
        progress: '',
        status: 'pending',
        requestedBy: '经办人',
        requestedAt: '2026-06-01 09:00',
      }],
    });

    expect(isTicketRelatedToUnit(source, '城市管理委员会')).toBe(true);
    expect(isTicketRelatedToUnit(source, '交通委员会')).toBe(true);
    expect(isTicketRelatedToUnit(source, '教育委员会')).toBe(false);
    expect(isTicketRelatedToUnit(source, '')).toBe(false);
  });

  it('derives visible status from active collaborations while preserving closed states', () => {
    const collaborating = ticket({
      status: 'processing',
      collaborationRecords: [{
        id: 'co-1',
        ticketId: 'ticket-1',
        unit: '交通委员会',
        description: '协办',
        progress: '',
        status: 'processing',
        requestedBy: '经办人',
        requestedAt: '2026-06-01 09:00',
      }],
    });

    expect(hasActiveCollaborations(collaborating)).toBe(true);
    expect(getVisibleTicketStatus(collaborating)).toBe('collaborating');
    expect(getVisibleTicketStatus(ticket({ status: 'returned', collaborationRecords: collaborating.collaborationRecords }))).toBe('returned');
    expect(getVisibleTicketStatus(ticket({ status: 'archived', collaborationRecords: collaborating.collaborationRecords }))).toBe('archived');
  });

  it('filters tickets by handler role visibility and all list filter options', () => {
    const tickets = [
      ticket({ id: 'main', handlerUnit: '城市管理委员会', area: '东城区', category: '城市管理', assignTime: '2026-06-01 09:00' }),
      ticket({
        id: 'co',
        handlerUnit: '交通委员会',
        area: '东城区',
        category: '城市管理',
        assignTime: '2026-06-01 10:00',
        collaborationRecords: [{
          id: 'co-1',
          ticketId: 'co',
          unit: '城市管理委员会',
          description: '协办',
          progress: '',
          status: 'pending',
          requestedBy: '经办人',
          requestedAt: '2026-06-01 09:00',
        }],
      }),
      ticket({ id: 'other', handlerUnit: '教育委员会', area: '西城区', category: '教育文化' }),
    ];

    const visible = filterTicketsByRoleAndUnit(tickets, 'handler', '城市管理委员会');
    expect(visible.map(item => item.id)).toEqual(['main', 'co']);

    const filtered = filterTicketsByAllOptions(visible, {
      status: 'processing',
      area: '东城区',
      handlerUnit: '城市管理委员会',
      category: '城市管理',
      deadlineRange: '3days',
      assignDate: '2026-06-01',
    }, context);

    expect(filtered.map(item => item.id)).toEqual(['main']);
  });

  it('filters archived tickets by visibility, category, satisfaction, time range and sorts by archive time', () => {
    const archived = [
      ticket({
        id: 'older',
        status: 'archived',
        category: '城市管理',
        archiveInfo: archive({ ticketId: 'older', satisfaction: 'satisfied', archiveTime: '2026-06-05 09:00' }),
      }),
      ticket({
        id: 'newer',
        status: 'archived',
        handlerUnit: '交通委员会',
        category: '城市管理',
        archiveInfo: archive({ ticketId: 'newer', satisfaction: 'satisfied', archiveTime: '2026-06-08 09:00' }),
        collaborationRecords: [{
          id: 'co-1',
          ticketId: 'newer',
          unit: '城市管理委员会',
          description: '协办',
          progress: '',
          status: 'completed',
          requestedBy: '经办人',
          requestedAt: '2026-06-01 09:00',
        }],
      }),
      ticket({
        id: 'unsatisfied',
        status: 'archived',
        category: '城市管理',
        archiveInfo: archive({ ticketId: 'unsatisfied', satisfaction: 'unsatisfied', archiveTime: '2026-06-08 10:00' }),
      }),
    ];

    const filtered = filterArchivedTickets(archived, {
      handlerUnit: '城市管理委员会',
      category: '城市管理',
      satisfaction: 'satisfied',
      archiveTimeRange: '7days',
    }, new Date('2026-06-09T09:00:00'));

    expect(sortArchivedTicketsByArchiveTimeDesc(filtered).map(item => item.id)).toEqual(['newer', 'older']);
  });

  it('groups risk tickets and calculates handler todo stats', () => {
    const tickets = [
      ticket({ id: 'high', deadline: '2026-06-03', status: 'processing' }),
      ticket({ id: 'medium', deadline: '2026-06-08', status: 'processing' }),
      ticket({ id: 'low', deadline: '2026-06-15', status: 'processing' }),
      ticket({ id: 'closed', deadline: '2026-05-01', status: 'archived' }),
    ];

    const active = tickets.filter(item => item.status !== 'completed' && item.status !== 'archived');
    const grouped = groupTicketsByRiskLevel(active, context);

    expect(grouped.high.map(item => item.id)).toEqual(['high']);
    expect(grouped.medium.map(item => item.id)).toEqual(['medium']);
    expect(grouped.low.map(item => item.id)).toEqual(['low']);

    expect(getHandlerTodoStats(tickets, context)).toEqual({
      pending: 0,
      processing: 3,
      returned: 0,
      upcomingDeadline: 2,
    });
  });

  it('returns todo ticket lists with existing ordering semantics', () => {
    const returnedEarly = ticket({
      id: 'returned-early',
      status: 'returned',
      returnRecords: [{ id: 'r1', ticketId: 'returned-early', reason: '退回', operator: '督办员', createTime: '2026-06-01 09:00' }],
    });
    const returnedLate = ticket({
      id: 'returned-late',
      status: 'returned',
      returnRecords: [{ id: 'r2', ticketId: 'returned-late', reason: '退回', operator: '督办员', createTime: '2026-06-02 09:00' }],
    });
    const pendingNew = ticket({ id: 'pending-new', status: 'pending', assignTime: '2026-06-02 09:00' });
    const pendingOld = ticket({ id: 'pending-old', status: 'pending', assignTime: '2026-06-01 09:00' });
    const processingSoon = ticket({ id: 'processing-soon', status: 'processing', deadline: '2026-06-03' });

    expect(getHandlerTodoTickets([pendingOld, pendingNew], 'pending').map(item => item.id)).toEqual(['pending-new', 'pending-old']);
    expect(getHandlerTodoTickets([processingSoon, pendingOld], 'upcoming', context).map(item => item.id)).toEqual(['processing-soon', 'pending-old']);
    expect(getSupervisorTodoTickets([returnedEarly, returnedLate], 'returned').map(item => item.id)).toEqual(['returned-late', 'returned-early']);
  });

  it('calculates supervisor todo stats and pending urge tickets', () => {
    const tickets = [
      ticket({ id: 'high', deadline: '2026-06-03', status: 'processing', urgeRecords: [] }),
      ticket({
        id: 'urged',
        deadline: '2026-06-05',
        status: 'processing',
        urgeRecords: [{ id: 'u1', ticketId: 'urged', reason: '催办', operator: '督办员', createTime: '2026-06-02 09:00' }],
      }),
      ticket({ id: 'returned', status: 'returned', deadline: '2026-06-10' }),
      ticket({ id: 'closed', status: 'completed', deadline: '2026-06-03' }),
    ];

    expect(getSupervisorTodoStats(tickets, context)).toEqual({
      highRisk: 1,
      pendingUrge: 1,
      returned: 1,
    });
    expect(getSupervisorTodoTickets(tickets, 'pendingUrge', context).map(item => item.id)).toEqual(['high']);
  });

  it('filters tickets by dispatch rule and keeps record sorting helpers pure', () => {
    const first = ticket({ id: 'first', assignTime: '2026-06-01 09:00', dispatchInfo: dispatchInfo('rule-a') });
    const second = ticket({ id: 'second', assignTime: '2026-06-02 09:00', dispatchInfo: dispatchInfo('rule-a') });
    const other = ticket({ id: 'other', dispatchInfo: dispatchInfo('rule-b') });

    expect(filterTicketsByRule([first, second, other], 'rule-a').map(item => item.id)).toEqual(['first', 'second']);
    expect(sortTicketsByAssignTimeDesc([first, second]).map(item => item.id)).toEqual(['second', 'first']);
    expect(sortByCreateTimeDesc([
      { id: 'old', ticketId: 'ticket-1', reason: '旧', operator: '督办员', createTime: '2026-06-01 09:00' },
      { id: 'new', ticketId: 'ticket-1', reason: '新', operator: '督办员', createTime: '2026-06-02 09:00' },
    ]).map(item => item.id)).toEqual(['new', 'old']);
  });

  it('keeps aggregate ticket stats aligned with visible collaboration status', () => {
    const stats = getTicketStats([
      ticket({ id: 'pending', status: 'pending' }),
      ticket({
        id: 'collaborating',
        status: 'processing',
        collaborationRecords: [{
          id: 'co-1',
          ticketId: 'collaborating',
          unit: '交通委员会',
          description: '协办',
          progress: '',
          status: 'pending',
          requestedBy: '经办人',
          requestedAt: '2026-06-01 09:00',
        }],
      }),
      ticket({ id: 'completed', status: 'completed' }),
      ticket({ id: 'overdue', status: 'processing', deadline: '2026-06-01' }),
    ], context);

    expect(stats).toEqual({
      pending: 1,
      processing: 2,
      completed: 1,
      overdue: 1,
    });
  });
});
