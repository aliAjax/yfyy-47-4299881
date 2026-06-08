import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HolidayConfig, HolidayType } from '@/types';
import { mockHolidays } from '@/data/mockData';
import { generateId, formatDateTime } from '@/utils/date';

interface HolidayState {
  holidays: HolidayConfig[];
  
  getHolidays: () => HolidayConfig[];
  getHolidaysByYear: (year: number) => HolidayConfig[];
  getHolidayByDate: (date: string) => HolidayConfig | undefined;
  getHolidayDatesByType: (type: HolidayType, year?: number) => string[];
  
  addHoliday: (holiday: Omit<HolidayConfig, 'id' | 'createTime' | 'updateTime'>) => { success: boolean; errors: string[] };
  updateHoliday: (id: string, updates: Partial<HolidayConfig>) => { success: boolean; errors: string[] };
  deleteHoliday: (id: string) => void;
  
  batchAddHolidays: (holidays: Omit<HolidayConfig, 'id' | 'createTime' | 'updateTime'>[]) => number;
  
  resetHolidays: () => void;
}

function validateHoliday(holiday: Partial<HolidayConfig>): string[] {
  const errors: string[] = [];
  if (!holiday.date) {
    errors.push('请选择日期');
  }
  if (!holiday.name?.trim()) {
    errors.push('请输入节假日名称');
  }
  if (!holiday.type) {
    errors.push('请选择类型');
  }
  return errors;
}

export const useHolidayStore = create<HolidayState>()(
  persist(
    (set, get) => ({
      holidays: mockHolidays,

      getHolidays: () => {
        return [...get().holidays].sort((a, b) => a.date.localeCompare(b.date));
      },

      getHolidaysByYear: (year) => {
        return get().holidays
          .filter(h => h.year === year)
          .sort((a, b) => a.date.localeCompare(b.date));
      },

      getHolidayByDate: (date) => {
        return get().holidays.find(h => h.date === date);
      },

      getHolidayDatesByType: (type, year) => {
        let list = get().holidays.filter(h => h.type === type);
        if (year !== undefined) {
          list = list.filter(h => h.year === year);
        }
        return list.map(h => h.date);
      },

      addHoliday: (holidayData) => {
        const errors = validateHoliday(holidayData);
        if (errors.length > 0) {
          return { success: false, errors };
        }

        const existing = get().getHolidayByDate(holidayData.date);
        if (existing) {
          return { success: false, errors: ['该日期已存在配置'] };
        }

        const now = formatDateTime(new Date());
        const newHoliday: HolidayConfig = {
          ...holidayData,
          id: generateId(),
          createTime: now,
          updateTime: now,
        };

        set((state) => ({
          holidays: [newHoliday, ...state.holidays],
        }));

        return { success: true, errors: [] };
      },

      updateHoliday: (id, updates) => {
        const state = get();
        const existingHoliday = state.holidays.find(h => h.id === id);
        if (!existingHoliday) {
          return { success: false, errors: ['节假日配置不存在'] };
        }

        const updatedHoliday = { ...existingHoliday, ...updates };
        const errors = validateHoliday(updatedHoliday);
        if (errors.length > 0) {
          return { success: false, errors };
        }

        if (updates.date && updates.date !== existingHoliday.date) {
          const duplicate = state.holidays.find(h => h.date === updates.date && h.id !== id);
          if (duplicate) {
            return { success: false, errors: ['该日期已存在配置'] };
          }
        }

        set((state) => ({
          holidays: state.holidays.map(h =>
            h.id === id ? { ...h, ...updates, updateTime: formatDateTime(new Date()) } : h
          ),
        }));

        return { success: true, errors: [] };
      },

      deleteHoliday: (id) => {
        set((state) => ({
          holidays: state.holidays.filter(h => h.id !== id),
        }));
      },

      batchAddHolidays: (holidaysData) => {
        const now = formatDateTime(new Date());
        const existingDates = new Set(get().holidays.map(h => h.date));
        const newHolidays: HolidayConfig[] = [];

        holidaysData.forEach(holidayData => {
          if (existingDates.has(holidayData.date)) return;
          const errors = validateHoliday(holidayData);
          if (errors.length > 0) return;
          
          newHolidays.push({
            ...holidayData,
            id: generateId(),
            createTime: now,
            updateTime: now,
          });
          existingDates.add(holidayData.date);
        });

        set((state) => ({
          holidays: [...newHolidays, ...state.holidays],
        }));

        return newHolidays.length;
      },

      resetHolidays: () => {
        set({ holidays: mockHolidays });
      },
    }),
    {
      name: 'holiday-storage',
    }
  )
);
