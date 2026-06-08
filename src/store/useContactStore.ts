import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ContactPerson, HandlerUnit } from '@/types';
import { mockContacts } from '@/data/mockData';
import { generateId } from '@/utils/date';

interface ContactState {
  contacts: ContactPerson[];
  searchKeyword: string;
  selectedUnit: HandlerUnit | '';
  
  setSearchKeyword: (keyword: string) => void;
  setSelectedUnit: (unit: HandlerUnit | '') => void;
  
  getContactsByUnit: (unit: HandlerUnit) => ContactPerson[];
  getOnDutyContact: (unit: HandlerUnit) => ContactPerson | undefined;
  getFilteredContacts: () => ContactPerson[];
  getContactById: (id: string) => ContactPerson | undefined;
  
  addContact: (contact: Omit<ContactPerson, 'id'>) => void;
  updateContact: (id: string, contact: Partial<Omit<ContactPerson, 'id' | 'unit'>>) => void;
  deleteContact: (id: string) => void;
  toggleOnDuty: (id: string) => void;
  setOnDuty: (unit: HandlerUnit, id: string) => void;
  
  getUnitStats: () => Record<HandlerUnit, { total: number; onDuty: number }>;
}

export const useContactStore = create<ContactState>()(
  persist(
    (set, get) => ({
      contacts: mockContacts,
      searchKeyword: '',
      selectedUnit: '',

      setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
      setSelectedUnit: (unit) => set({ selectedUnit: unit }),

      getContactsByUnit: (unit) => {
        return get().contacts.filter(c => c.unit === unit);
      },

      getOnDutyContact: (unit) => {
        return get().contacts.find(c => c.unit === unit && c.isOnDuty);
      },

      getFilteredContacts: () => {
        const { contacts, searchKeyword, selectedUnit } = get();
        let filtered = [...contacts];
        
        if (selectedUnit) {
          filtered = filtered.filter(c => c.unit === selectedUnit);
        }
        
        if (searchKeyword.trim()) {
          const keyword = searchKeyword.toLowerCase();
          filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(keyword) ||
            c.phone.includes(keyword) ||
            c.unit.toLowerCase().includes(keyword) ||
            c.position.toLowerCase().includes(keyword) ||
            (c.remark && c.remark.toLowerCase().includes(keyword))
          );
        }
        
        return filtered.sort((a, b) => {
          if (a.isOnDuty !== b.isOnDuty) return b.isOnDuty ? 1 : -1;
          return a.unit.localeCompare(b.unit);
        });
      },

      getContactById: (id) => {
        return get().contacts.find(c => c.id === id);
      },

      addContact: (contactData) => {
        const newContact: ContactPerson = {
          ...contactData,
          id: generateId(),
        };
        set((state) => ({
          contacts: [...state.contacts, newContact],
        }));
      },

      updateContact: (id, contactData) => {
        set((state) => ({
          contacts: state.contacts.map(c =>
            c.id === id ? { ...c, ...contactData } : c
          ),
        }));
      },

      deleteContact: (id) => {
        set((state) => ({
          contacts: state.contacts.filter(c => c.id !== id),
        }));
      },

      toggleOnDuty: (id) => {
        set((state) => {
          const contact = state.contacts.find(c => c.id === id);
          if (!contact) return state;
          
          return {
            contacts: state.contacts.map(c =>
              c.unit === contact.unit
                ? { ...c, isOnDuty: c.id === id ? !c.isOnDuty : false }
                : c
            ),
          };
        });
      },

      setOnDuty: (unit, id) => {
        set((state) => ({
          contacts: state.contacts.map(c =>
            c.unit === unit
              ? { ...c, isOnDuty: c.id === id }
              : c
          ),
        }));
      },

      getUnitStats: () => {
        const { contacts } = get();
        const stats = {} as Record<HandlerUnit, { total: number; onDuty: number }>;
        
        contacts.forEach(c => {
          if (!stats[c.unit]) {
            stats[c.unit] = { total: 0, onDuty: 0 };
          }
          stats[c.unit].total++;
          if (c.isOnDuty) stats[c.unit].onDuty++;
        });
        
        return stats;
      },
    }),
    {
      name: 'contact-storage',
    }
  )
);
