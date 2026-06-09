import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bookmark, Save, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useFilterViews } from '@/hooks/useFilterViews';
import { useTicketStore } from '@/store/useTicketStore';
import { FilterOptions } from '@/types';

function hasActiveFilters(filterOptions: FilterOptions) {
  return Object.values(filterOptions).some((value) => value !== '');
}

function isSameFilterOptions(a: FilterOptions, b: FilterOptions) {
  return (
    a.status === b.status &&
    a.area === b.area &&
    a.handlerUnit === b.handlerUnit &&
    a.category === b.category &&
    a.deadlineRange === b.deadlineRange &&
    (a.assignDate || '') === (b.assignDate || '')
  );
}

export function FilterViewSelector() {
  const { views, saveView, deleteView } = useFilterViews();
  const { filterOptions, setFilterOptions } = useTicketStore();
  const [activeViewId, setActiveViewId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [viewName, setViewName] = useState('');

  const activeView = useMemo(
    () => views.find((view) => view.id === activeViewId),
    [activeViewId, views]
  );
  const canSave = hasActiveFilters(filterOptions);

  useEffect(() => {
    if (!activeView) return;
    if (!isSameFilterOptions(activeView.filterOptions, filterOptions)) {
      setActiveViewId('');
    }
  }, [activeView, filterOptions]);

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    const name = viewName.trim();
    if (!name || !canSave) return;

    const saved = saveView(name, filterOptions);
    setActiveViewId(saved.id);
    setViewName('');
    setIsSaving(false);
  };

  const handleApply = (id: string) => {
    const view = views.find((item) => item.id === id);
    if (!view) return;
    setFilterOptions(view.filterOptions);
    setActiveViewId(id);
  };

  const handleDelete = (id: string) => {
    deleteView(id);
    if (activeViewId === id) {
      setActiveViewId('');
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Bookmark className="h-5 w-5 flex-shrink-0 text-primary-500" />
          <span className="text-sm font-medium text-gray-700">常用筛选视图</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSaving ? (
            <form onSubmit={handleSave} className="flex items-center gap-2">
              <input
                value={viewName}
                onChange={(event) => setViewName(event.target.value)}
                autoFocus
                maxLength={20}
                placeholder="视图名称"
                className="h-8 w-40 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="submit"
                disabled={!viewName.trim() || !canSave}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary-600 px-3 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSaving(false);
                  setViewName('');
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
                aria-label="取消保存视图"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsSaving(true)}
              disabled={!canSave}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Save className="h-3.5 w-3.5" />
              <span>保存当前筛选</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {views.length === 0 ? (
          <span className="text-sm text-gray-400">暂无已保存视图</span>
        ) : (
          views.map((view) => {
            const isActive = view.id === activeViewId;
            return (
              <div
                key={view.id}
                className={clsx(
                  'group inline-flex max-w-full items-center rounded-lg border transition-colors',
                  isActive
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleApply(view.id)}
                  className="min-w-0 truncate px-3 py-1.5 text-sm font-medium"
                  title={view.name}
                >
                  {view.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(view.id)}
                  className={clsx(
                    'inline-flex h-8 w-8 items-center justify-center rounded-r-lg transition-colors',
                    isActive ? 'text-primary-600 hover:bg-primary-100' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                  )}
                  aria-label={`删除${view.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
