import { useMemo } from 'react';
import { useHolidayStore } from '@/store/useHolidayStore';
import {
  isWorkday as isWorkdayFn,
  addWorkdays as addWorkdaysFn,
  getWorkdaysBetween as getWorkdaysBetweenFn,
  getWorkdaysRemaining as getWorkdaysRemainingFn,
  getDeadlineLabelWorkdays as getDeadlineLabelWorkdaysFn,
  getRiskLevelWorkdays as getRiskLevelWorkdaysFn,
  calculateDeadlineWorkdays as calculateDeadlineWorkdaysFn,
} from '@/utils/workday';

export function useWorkday() {
  const { holidays, getHolidayDatesByType } = useHolidayStore();

  const holidayDates = useMemo(() => {
    return getHolidayDatesByType('holiday');
  }, [holidays, getHolidayDatesByType]);

  const workdayDates = useMemo(() => {
    return getHolidayDatesByType('workday');
  }, [holidays, getHolidayDatesByType]);

  const isWorkday = (date: Date | string) => {
    return isWorkdayFn(date, holidayDates, workdayDates);
  };

  const addWorkdays = (startDate: Date | string, days: number) => {
    return addWorkdaysFn(startDate, days, holidayDates, workdayDates);
  };

  const getWorkdaysBetween = (startDate: Date | string, endDate: Date | string) => {
    return getWorkdaysBetweenFn(startDate, endDate, holidayDates, workdayDates);
  };

  const getWorkdaysRemaining = (deadline: string, now?: Date) => {
    return getWorkdaysRemainingFn(deadline, now, holidayDates, workdayDates);
  };

  const getDeadlineLabel = (deadline: string, status: string) => {
    return getDeadlineLabelWorkdaysFn(deadline, status, holidayDates, workdayDates);
  };

  const getRiskLevel = (deadline: string, status: string) => {
    return getRiskLevelWorkdaysFn(deadline, status, holidayDates, workdayDates);
  };

  const calculateDeadline = (assignDate: Date | string, deadlineDays: number) => {
    return calculateDeadlineWorkdaysFn(assignDate, deadlineDays, holidayDates, workdayDates);
  };

  return {
    holidayDates,
    workdayDates,
    isWorkday,
    addWorkdays,
    getWorkdaysBetween,
    getWorkdaysRemaining,
    getDeadlineLabel,
    getRiskLevel,
    calculateDeadline,
  };
}
