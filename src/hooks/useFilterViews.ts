import { useCallback, useEffect, useState } from 'react';
import { FilterOptions, FilterView } from '@/types';

const STORAGE_KEY = 'ticket-filter-views';

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isFilterView(value: unknown): value is FilterView {
  if (!value || typeof value !== 'object') return false;
  const view = value as Partial<FilterView>;
  return Boolean(
    view.id &&
    view.name &&
    view.filterOptions &&
    typeof view.id === 'string' &&
    typeof view.name === 'string'
  );
}

function readViews() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isFilterView) : [];
  } catch {
    return [];
  }
}

export function useFilterViews() {
  const [views, setViews] = useState<FilterView[]>(() => readViews());

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(views));
  }, [views]);

  const saveView = useCallback((name: string, filterOptions: FilterOptions) => {
    const now = new Date().toISOString();
    const view: FilterView = {
      id: createId(),
      name: name.trim(),
      filterOptions,
      createdAt: now,
      updatedAt: now,
    };
    setViews((current) => [view, ...current]);
    return view;
  }, []);

  const deleteView = useCallback((id: string) => {
    setViews((current) => current.filter((view) => view.id !== id));
  }, []);

  return {
    views,
    saveView,
    deleteView,
  };
}
