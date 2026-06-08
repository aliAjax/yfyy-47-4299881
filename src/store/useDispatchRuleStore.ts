import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DispatchRule, HandlerUnit } from '@/types';
import { mockDispatchRules } from '@/data/mockData';
import { generateId, formatDateTime } from '@/utils/date';
import { validateRule } from '@/utils/dispatchRule';

interface DispatchRuleState {
  rules: DispatchRule[];
  
  getRules: () => DispatchRule[];
  getEnabledRules: () => DispatchRule[];
  getRuleById: (id: string) => DispatchRule | undefined;
  getRulesByUnit: (unit: HandlerUnit) => DispatchRule[];
  
  addRule: (rule: Omit<DispatchRule, 'id' | 'createTime' | 'updateTime'>) => { success: boolean; errors: string[] };
  updateRule: (id: string, updates: Partial<DispatchRule>) => { success: boolean; errors: string[] };
  deleteRule: (id: string) => void;
  
  toggleRule: (id: string) => void;
  updatePriority: (id: string, priority: number) => void;
  
  resetRules: () => void;
}

export const useDispatchRuleStore = create<DispatchRuleState>()(
  persist(
    (set, get) => ({
      rules: mockDispatchRules,

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

      addRule: (ruleData) => {
        const errors = validateRule(ruleData);
        if (errors.length > 0) {
          return { success: false, errors };
        }

        const now = formatDateTime(new Date());
        const newRule: DispatchRule = {
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
        const errors = validateRule(updatedRule);
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
        set({ rules: mockDispatchRules });
      },
    }),
    {
      name: 'dispatch-rule-storage',
    }
  )
);
