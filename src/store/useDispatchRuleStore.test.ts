import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DispatchRule } from '@/types';

async function loadStore() {
  vi.resetModules();
  vi.doMock('zustand/middleware', () => ({
    persist: <T>(initializer: T) => initializer,
  }));
  const { useDispatchRuleStore } = await import('./useDispatchRuleStore');
  const { mockDispatchRules } = await import('@/data/mockData');
  return { store: useDispatchRuleStore, mockDispatchRules };
}

function buildRule(overrides: Partial<DispatchRule> = {}): Omit<DispatchRule, 'id' | 'createTime' | 'updateTime'> {
  return {
    name: '路灯维修派单',
    category: '城市管理',
    area: '东城区',
    keywords: ['路灯', '照明'],
    handlerUnit: '城市管理委员会',
    deadlineDays: 5,
    priority: 80,
    enabled: true,
    description: '城市照明相关诉求',
    ...overrides,
  };
}

describe('useDispatchRuleStore', () => {
  beforeEach(() => {
    vi.doUnmock('zustand/middleware');
  });

  it('sorts rules by priority and filters enabled rules', async () => {
    const { store } = await loadStore();

    store.setState({
      rules: [
        { ...buildRule({ priority: 10, enabled: true }), id: 'low', createTime: '2026-06-01 09:00', updateTime: '2026-06-01 09:00' },
        { ...buildRule({ priority: 90, enabled: false }), id: 'disabled-high', createTime: '2026-06-01 09:00', updateTime: '2026-06-01 09:00' },
        { ...buildRule({ priority: 50, enabled: true }), id: 'middle', createTime: '2026-06-01 09:00', updateTime: '2026-06-01 09:00' },
      ],
    });

    expect(store.getState().getRules().map(rule => rule.id)).toEqual(['disabled-high', 'middle', 'low']);
    expect(store.getState().getEnabledRules().map(rule => rule.id)).toEqual(['middle', 'low']);
  });

  it('rejects invalid rules without mutating existing state', async () => {
    const { store } = await loadStore();
    const initialRules = store.getState().rules;

    const result = store.getState().addRule(buildRule({ name: '', category: '', area: '', keywords: [], deadlineDays: 0 }));

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(['规则名称不能为空', '办理期限必须在 1-365 天之间']));
    expect(store.getState().rules).toBe(initialRules);
  });

  it('adds, updates, toggles, and deletes a valid rule', async () => {
    const { store } = await loadStore();
    const result = store.getState().addRule(buildRule());

    expect(result).toEqual({ success: true, errors: [] });
    const created = store.getState().rules[0];
    expect(created).toMatchObject({
      name: '路灯维修派单',
      handlerUnit: '城市管理委员会',
      enabled: true,
    });

    const updateResult = store.getState().updateRule(created.id, {
      priority: 95,
      handlerUnit: '交通委员会',
    });

    expect(updateResult.success).toBe(true);
    expect(store.getState().getRuleById(created.id)).toMatchObject({
      priority: 95,
      handlerUnit: '交通委员会',
    });

    store.getState().toggleRule(created.id);
    expect(store.getState().getRuleById(created.id)?.enabled).toBe(false);

    store.getState().deleteRule(created.id);
    expect(store.getState().getRuleById(created.id)).toBeUndefined();
  });

  it('resets rules to the mock defaults', async () => {
    const { store, mockDispatchRules } = await loadStore();
    store.setState({ rules: [] });

    store.getState().resetRules();

    expect(store.getState().rules).toEqual(mockDispatchRules);
  });
});
