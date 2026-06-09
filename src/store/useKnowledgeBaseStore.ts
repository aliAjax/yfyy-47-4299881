import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HandlerUnit, KnowledgeBaseEntry, TicketCategory } from '@/types';
import { mockKnowledgeBaseEntries } from '@/data/mockData';
import { generateId, formatDateTime } from '@/utils/date';
import { matchKnowledgeEntries, validateKnowledgeEntry } from '@/utils/knowledgeBase';

type KnowledgeBaseEntryPayload = Omit<KnowledgeBaseEntry, 'id' | 'createTime' | 'updateTime' | 'useCount' | 'lastUsedTime'>;

interface KnowledgeBaseState {
  entries: KnowledgeBaseEntry[];

  getEntries: () => KnowledgeBaseEntry[];
  getEnabledEntries: () => KnowledgeBaseEntry[];
  getEntryById: (id: string) => KnowledgeBaseEntry | undefined;
  searchEntries: (params: {
    title?: string;
    content?: string;
    result?: string;
    category?: TicketCategory | '';
    handlerUnit?: HandlerUnit | '';
  }) => ReturnType<typeof matchKnowledgeEntries>;

  addEntry: (entry: KnowledgeBaseEntryPayload) => { success: boolean; errors: string[] };
  updateEntry: (id: string, updates: Partial<KnowledgeBaseEntry>) => { success: boolean; errors: string[] };
  incrementUseCount: (id: string) => void;
  deleteEntry: (id: string) => void;
  toggleEntry: (id: string) => void;
  resetEntries: () => void;
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>()(
  persist(
    (set, get) => ({
      entries: mockKnowledgeBaseEntries,

      getEntries: () => [...get().entries].sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()),

      getEnabledEntries: () => get().entries.filter(entry => entry.enabled),

      getEntryById: (id) => get().entries.find(entry => entry.id === id),

      searchEntries: (params) => matchKnowledgeEntries(get().entries, params),

      addEntry: (entryData) => {
        const errors = validateKnowledgeEntry(entryData);
        if (errors.length > 0) {
          return { success: false, errors };
        }

        const now = formatDateTime(new Date());
        const newEntry: KnowledgeBaseEntry = {
          ...entryData,
          id: generateId(),
          useCount: 0,
          createTime: now,
          updateTime: now,
        };

        set((state) => ({
          entries: [newEntry, ...state.entries],
        }));

        return { success: true, errors: [] };
      },

      updateEntry: (id, updates) => {
        const existingEntry = get().entries.find(entry => entry.id === id);
        if (!existingEntry) {
          return { success: false, errors: ['知识条目不存在'] };
        }

        const updatedEntry = { ...existingEntry, ...updates };
        const errors = validateKnowledgeEntry(updatedEntry);
        if (errors.length > 0) {
          return { success: false, errors };
        }

        set((state) => ({
          entries: state.entries.map(entry =>
            entry.id === id ? { ...entry, ...updates, updateTime: formatDateTime(new Date()) } : entry
          ),
        }));

        return { success: true, errors: [] };
      },

      incrementUseCount: (id) => {
        const now = formatDateTime(new Date());
        set((state) => ({
          entries: state.entries.map(entry =>
            entry.id === id
              ? {
                  ...entry,
                  useCount: (entry.useCount ?? 0) + 1,
                  lastUsedTime: now,
                }
              : entry
          ),
        }));
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter(entry => entry.id !== id),
        }));
      },

      toggleEntry: (id) => {
        set((state) => ({
          entries: state.entries.map(entry =>
            entry.id === id ? { ...entry, enabled: !entry.enabled, updateTime: formatDateTime(new Date()) } : entry
          ),
        }));
      },

      resetEntries: () => {
        set({ entries: mockKnowledgeBaseEntries });
      },
    }),
    {
      name: 'knowledge-base-storage',
    }
  )
);
