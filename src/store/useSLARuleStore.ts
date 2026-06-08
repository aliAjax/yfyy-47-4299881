import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SLARule, TicketCategory, HandlerUnit } from '@/types';
import { mockSLARules } from '@/data/mockData';
import { generateId, formatDateTime } from '@/utils/date';

interface SLARuleState {
  rules: SLARule[];
  
  getRules: () => SLARule[];
  getEnabledRules: () => SLARule[];
  getRuleById: (id: string) => SLARule | undefined;
  getRulesByUnit: (unit: HandlerUnit) => SLARule[];
  getRulesByCategory: (category: TicketCategory) => SLARule[];
  
  addRule: (rule: Omit<SLARule, 'id' | 'createTime' | 'updateTime'>) => { success: boolean; errors: string[] };
  updateRule: (id: string, updates: Partial<SLARule>) => { success: boolean; errors: string[] };
  deleteRule: (id: string) => void;
  
  toggleRule: (id: string) => void;
  updatePriority: (id: string, priority: number) => void;
  
  resetRules: () => void;
}

function validateSLARule(rule: Partial<SLARule>): string[] {
  const errors: string[] = [];
  if (!rule.name?.trim()) {
    errors.push('请输入规则名称');
  }
  if (rule.deadlineDays === undefined || rule.deadlineDays === null || rule.deadlineDays <= 0) {
    errors.push('办理期限必须大于0');
  }
  if (rule.priority === undefined || rule.priority === null || rule.priority < 0) {
    errors.push('优先级不能为负数');
  }
  return errors;
}

export const useSLARuleStore = create<SLARuleState>()(
  persist(
    (set, get) => ({
      rules: mockSLARules,

      getRules: () => {
        return [...get().rules].sort((a, b) => b.priority - a.priority);
      },

      getEnabledRules: () => {
        return get().rules.filter(r => r.enabled).sort((a, b) => b.priority - a.priority);
      },

      getRuleById: (id) => {
        return get().rules.find(r => r.id === id);
      },

      getRulesByUnit: (unit) => {
        return get().rules.filter(r => r.handlerUnit === unit);
      },

      getRulesByCategory: (category) => {
        return get().rules.filter(r => r.category === category);
      },

      addRule: (ruleData) => {
        const errors = validateSLARule(ruleData);
        if (errors.length > 0) {
          return { success: false, errors };
        }

        const now = formatDateTime(new Date());
        const newRule: SLARule = {
          ...ruleData,
          id: generateId(),
          createTime: now,
          updateTime: now,
        };

        set((state) => ({
          rules: [newRule, ...state.rules],
        }));

        return { success: true, errors: [] };
      },

      updateRule: (id, updates) => {
        const state = get();
        const existingRule = state.rules.find(r => r.id === id);
        if (!existingRule) {
          return { success: false, errors: ['规则不存在'] };
        }

        const updatedRule = { ...existingRule, ...updates };
        const errors = validateSLARule(updatedRule);
        if (errors.length > 0) {
          return { success: false, errors };
        }

        set((state) => ({
          rules: state.rules.map(r =>
            r.id === id ? { ...r, ...updates, updateTime: formatDateTime(new Date()) } : r
          ),
        }));

        return { success: true, errors: [] };
      },

      deleteRule: (id) => {
        set((state) => ({
          rules: state.rules.filter(r => r.id !== id),
        }));
      },

      toggleRule: (id) => {
        set((state) => ({
          rules: state.rules.map(r =>
            r.id === id ? { ...r, enabled: !r.enabled, updateTime: formatDateTime(new Date()) } : r
          ),
        }));
      },

      updatePriority: (id, priority) => {
        set((state) => ({
          rules: state.rules.map(r =>
            r.id === id ? { ...r, priority, updateTime: formatDateTime(new Date()) } : r
          ),
        }));
      },

      resetRules: () => {
        set({ rules: mockSLARules });
      },
    }),
    {
      name: 'sla-rule-storage',
    }
  )
);
