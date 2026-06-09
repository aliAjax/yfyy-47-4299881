import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { KnowledgeEntry, TicketCategory, HandlerUnit, KnowledgeMatchResult, KnowledgeSearchParams, TemplateApplyOptions } from '@/types';
import { mockKnowledgeEntries } from '@/data/mockData';
import { generateId, formatDateTime } from '@/utils/date';
import { validateKnowledgeEntry, getKnowledgeRecommendations, applyTemplateToContent, incrementKnowledgeUseCount } from '@/utils/knowledge';

interface KnowledgeState {
  entries: KnowledgeEntry[];
  searchKeyword: string;
  selectedCategory: TicketCategory | '';
  selectedUnit: HandlerUnit | '';
  statusFilter: 'all' | 'enabled' | 'disabled';
  sortBy: 'updateTime' | 'useCount' | 'createTime' | 'lastUsedTime';
  selectedIds: string[];
  
  setSearchKeyword: (keyword: string) => void;
  setSelectedCategory: (category: TicketCategory | '') => void;
  setSelectedUnit: (unit: HandlerUnit | '') => void;
  setStatusFilter: (status: 'all' | 'enabled' | 'disabled') => void;
  setSortBy: (sort: 'updateTime' | 'useCount' | 'createTime' | 'lastUsedTime') => void;
  
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  
  getFilteredEntries: () => KnowledgeEntry[];
  getEntryById: (id: string) => KnowledgeEntry | undefined;
  getEnabledEntries: () => KnowledgeEntry[];
  
  searchKnowledge: (params: KnowledgeSearchParams, limit?: number) => KnowledgeMatchResult[];
  
  addEntry: (entry: Omit<KnowledgeEntry, 'id' | 'createTime' | 'updateTime' | 'useCount' | 'lastUsedTime'>) => { success: boolean; errors: string[]; entry?: KnowledgeEntry };
  updateEntry: (id: string, entry: Partial<Omit<KnowledgeEntry, 'id' | 'createTime' | 'updateTime' | 'useCount'>>) => { success: boolean; errors: string[] };
  deleteEntry: (id: string) => void;
  deleteSelected: () => void;
  toggleEntry: (id: string) => void;
  batchToggle: (enabled: boolean) => void;
  
  incrementUseCount: (id: string) => void;
  
  resetEntries: () => void;
  
  applyTemplate: (entryId: string, currentContent: string, options: TemplateApplyOptions) => string;
  
  getStats: () => { 
    total: number; 
    enabled: number; 
    disabled: number; 
    byCategory: Record<string, number>;
    totalUseCount: number;
    topUsed: KnowledgeEntry[];
  };
}

export const useKnowledgeStore = create<KnowledgeState>()(
  persist(
    (set, get) => ({
      entries: mockKnowledgeEntries,
      searchKeyword: '',
      selectedCategory: '',
      selectedUnit: '',
      statusFilter: 'all',
      sortBy: 'updateTime',
      selectedIds: [],

      setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
      setSelectedCategory: (category) => set({ selectedCategory: category, selectedIds: [] }),
      setSelectedUnit: (unit) => set({ selectedUnit: unit, selectedIds: [] }),
      setStatusFilter: (status) => set({ statusFilter: status, selectedIds: [] }),
      setSortBy: (sort) => set({ sortBy: sort }),

      toggleSelect: (id) => set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter(i => i !== id)
          : [...state.selectedIds, id]
      })),

      toggleSelectAll: () => set((state) => {
        const filteredIds = state.getFilteredEntries().map(e => e.id);
        const allSelected = filteredIds.length > 0 && filteredIds.every(id => state.selectedIds.includes(id));
        return {
          selectedIds: allSelected ? [] : filteredIds
        };
      }),

      clearSelection: () => set({ selectedIds: [] }),

      getFilteredEntries: () => {
        const { entries, searchKeyword, selectedCategory, selectedUnit, statusFilter, sortBy } = get();
        let filtered = [...entries];

        if (searchKeyword.trim()) {
          const keyword = searchKeyword.toLowerCase();
          filtered = filtered.filter(e =>
            e.title.toLowerCase().includes(keyword) ||
            e.keywords.some(kw => kw.toLowerCase().includes(keyword)) ||
            (e.synonyms && e.synonyms.some(s => s.toLowerCase().includes(keyword))) ||
            e.replyTemplate.toLowerCase().includes(keyword) ||
            e.keyPoints.toLowerCase().includes(keyword)
          );
        }

        if (selectedCategory) {
          filtered = filtered.filter(e => e.category === selectedCategory);
        }

        if (selectedUnit) {
          filtered = filtered.filter(e => e.recommendedUnit === selectedUnit);
        }

        if (statusFilter !== 'all') {
          filtered = filtered.filter(e => statusFilter === 'enabled' ? e.enabled : !e.enabled);
        }

        filtered.sort((a, b) => {
          switch (sortBy) {
            case 'useCount':
              return b.useCount - a.useCount;
            case 'lastUsedTime': {
              const aTime = a.lastUsedTime || '';
              const bTime = b.lastUsedTime || '';
              if (!aTime && !bTime) return 0;
              if (!aTime) return 1;
              if (!bTime) return -1;
              return bTime.localeCompare(aTime);
            }
            case 'createTime':
              return b.createTime.localeCompare(a.createTime);
            case 'updateTime':
            default:
              return b.updateTime.localeCompare(a.updateTime);
          }
        });

        return filtered;
      },

      getEntryById: (id) => {
        return get().entries.find(e => e.id === id);
      },

      getEnabledEntries: () => {
        return get().entries.filter(e => e.enabled);
      },

      searchKnowledge: (params, limit = 5) => {
        const enabledEntries = get().getEnabledEntries();
        return getKnowledgeRecommendations(enabledEntries, params, limit);
      },

      addEntry: (entryData) => {
        const fullEntry = {
          ...entryData,
          synonyms: entryData.synonyms || [],
          useCount: 0,
        };
        const errors = validateKnowledgeEntry(fullEntry);
        if (errors.length > 0) {
          return { success: false, errors };
        }

        const now = formatDateTime(new Date());
        const newEntry: KnowledgeEntry = {
          ...fullEntry,
          id: generateId(),
          createTime: now,
          updateTime: now,
          lastUsedTime: undefined,
        };

        set((state) => ({
          entries: [newEntry, ...state.entries],
        }));

        return { success: true, errors: [], entry: newEntry };
      },

      updateEntry: (id, entryData) => {
        const existing = get().getEntryById(id);
        if (!existing) {
          return { success: false, errors: ['知识条目不存在'] };
        }

        const merged = {
          ...existing,
          ...entryData,
        };

        const errors = validateKnowledgeEntry(merged);
        if (errors.length > 0) {
          return { success: false, errors };
        }

        const now = formatDateTime(new Date());
        set((state) => ({
          entries: state.entries.map(e =>
            e.id === id
              ? { ...e, ...entryData, updateTime: now }
              : e
          ),
        }));

        return { success: true, errors: [] };
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter(e => e.id !== id),
          selectedIds: state.selectedIds.filter(i => i !== id),
        }));
      },

      deleteSelected: () => {
        const { selectedIds } = get();
        if (selectedIds.length === 0) return;
        set((state) => ({
          entries: state.entries.filter(e => !state.selectedIds.includes(e.id)),
          selectedIds: [],
        }));
      },

      toggleEntry: (id) => {
        const now = formatDateTime(new Date());
        set((state) => ({
          entries: state.entries.map(e =>
            e.id === id
              ? { ...e, enabled: !e.enabled, updateTime: now }
              : e
          ),
        }));
      },

      batchToggle: (enabled) => {
        const { selectedIds } = get();
        if (selectedIds.length === 0) return;
        const now = formatDateTime(new Date());
        set((state) => ({
          entries: state.entries.map(e =>
            state.selectedIds.includes(e.id)
              ? { ...e, enabled, updateTime: now }
              : e
          ),
        }));
      },

      incrementUseCount: (id) => {
        set((state) => {
          const entry = state.entries.find(e => e.id === id);
          if (!entry) return state;
          const updated = incrementKnowledgeUseCount(entry);
          return {
            entries: state.entries.map(e => e.id === id ? updated : e),
          };
        });
      },

      resetEntries: () => {
        set({ entries: mockKnowledgeEntries, selectedIds: [] });
      },

      applyTemplate: (entryId, currentContent, options) => {
        const entry = get().getEntryById(entryId);
        if (!entry) return currentContent;
        
        const result = applyTemplateToContent(currentContent, entry.replyTemplate, options);
        
        get().incrementUseCount(entryId);
        
        return result;
      },

      getStats: () => {
        const { entries } = get();
        const total = entries.length;
        const enabled = entries.filter(e => e.enabled).length;
        const disabled = total - enabled;
        const byCategory: Record<string, number> = {};
        let totalUseCount = 0;

        entries.forEach(e => {
          const cat = e.category || '未分类';
          byCategory[cat] = (byCategory[cat] || 0) + 1;
          totalUseCount += e.useCount;
        });

        const topUsed = [...entries]
          .sort((a, b) => b.useCount - a.useCount)
          .slice(0, 5);

        return { total, enabled, disabled, byCategory, totalUseCount, topUsed };
      },
    }),
    {
      name: 'knowledge-storage',
    }
  )
);
