import { useState, useRef, useEffect } from 'react';
import { FilterOptions, FilterView } from '@/types';
import { useFilterViews } from '@/hooks/useFilterViews';
import { BookmarkPlus, Trash2, Check, X, MoreHorizontal } from 'lucide-react';
import { clsx } from 'clsx';

interface FilterViewSelectorProps {
  currentFilter: FilterOptions;
  activeViewId: string | null;
  onApplyView: (filterOptions: FilterOptions) => void;
  onActiveViewChange: (viewId: string | null) => void;
}

export function FilterViewSelector({
  currentFilter,
  activeViewId,
  onApplyView,
  onActiveViewChange,
}: FilterViewSelectorProps) {
  const { views, saveView, deleteView } = useFilterViews();
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSaveInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSaveInput]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenuId(null);
      }
    };
    if (showMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenuId]);

  const hasActiveFilters = Object.values(currentFilter).some(v => v !== '' && v !== 'all');

  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    saveView(newViewName.trim(), currentFilter);
    setNewViewName('');
    setShowSaveInput(false);
  };

  const handleCancelSave = () => {
    setNewViewName('');
    setShowSaveInput(false);
  };

  const handleViewClick = (view: FilterView) => {
    if (activeViewId === view.id) {
      onActiveViewChange(null);
    } else {
      onApplyView(view.filterOptions);
      onActiveViewChange(view.id);
    }
    setShowMenuId(null);
  };

  const handleDeleteView = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteView(id);
    if (activeViewId === id) {
      onActiveViewChange(null);
    }
    setShowMenuId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveView();
    } else if (e.key === 'Escape') {
      handleCancelSave();
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BookmarkPlus className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">常用视图</span>
        </div>
        {hasActiveFilters && !showSaveInput && (
          <button
            onClick={() => setShowSaveInput(true)}
            className="flex items-center space-x-1 text-xs text-primary-600 hover:text-primary-700 transition-colors font-medium"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            <span>保存当前筛选</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {views.length === 0 && !showSaveInput ? (
          <p className="text-xs text-gray-400">暂无保存的视图，设置筛选条件后可保存为常用视图</p>
        ) : null}

        {views.map((view) => (
          <div
            key={view.id}
            className="relative group"
            ref={showMenuId === view.id ? menuRef : undefined}
          >
            <button
              onClick={() => handleViewClick(view)}
              className={clsx(
                'inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm transition-all',
                activeViewId === view.id
                  ? 'bg-primary-100 text-primary-700 font-medium ring-1 ring-primary-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <span>{view.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenuId(showMenuId === view.id ? null : view.id);
                }}
                className={clsx(
                  'ml-1 p-0.5 rounded transition-opacity',
                  activeViewId === view.id
                    ? 'text-primary-500 hover:bg-primary-200'
                    : 'text-gray-400 hover:bg-gray-300 opacity-0 group-hover:opacity-100'
                )}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </button>

            {showMenuId === view.id && (
              <div className="absolute top-full left-0 mt-1 z-10 min-w-[120px] bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <button
                  onClick={(e) => handleDeleteView(e, view.id)}
                  className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>删除视图</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {showSaveInput && (
          <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-primary-50 ring-1 ring-primary-200">
            <input
              ref={inputRef}
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入视图名称"
              className="w-28 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none px-1"
            />
            <button
              onClick={handleSaveView}
              className="p-0.5 text-primary-600 hover:bg-primary-100 rounded transition-colors"
              title="保存"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancelSave}
              className="p-0.5 text-gray-500 hover:bg-gray-200 rounded transition-colors"
              title="取消"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
