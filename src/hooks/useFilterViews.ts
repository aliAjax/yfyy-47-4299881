import { useState, useEffect } from 'react';
import { FilterView, FilterOptions } from '@/types';
import { generateId, formatDateTime } from '@/utils/date';

const STORAGE_KEY = 'filter-views';

export function useFilterViews() {
  const [views, setViews] = useState<FilterView[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  }, [views]);

  const saveView = (name: string, filterOptions: FilterOptions) => {
    const newView: FilterView = {
      id: generateId(),
      name,
      filterOptions: { ...filterOptions },
      createTime: formatDateTime(new Date()),
    };
    setViews(prev => [...prev, newView]);
    return newView;
  };

  const deleteView = (id: string) => {
    setViews(prev => prev.filter(v => v.id !== id));
  };

  const renameView = (id: string, name: string) => {
    setViews(prev => prev.map(v => v.id === id ? { ...v, name } : v));
  };

  const updateView = (id: string, filterOptions: FilterOptions) => {
    setViews(prev => prev.map(v => v.id === id ? { ...v, filterOptions: { ...filterOptions } } : v));
  };

  const getViewById = (id: string) => {
    return views.find(v => v.id === id);
  };

  return {
    views,
    saveView,
    deleteView,
    renameView,
    updateView,
    getViewById,
  };
}
