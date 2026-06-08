import { useTicketStore } from '@/store/useTicketStore';
import { STATUS_LABELS, CATEGORIES, AREAS, HANDLER_UNITS } from '@/types';
import { Filter, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';

export function FilterBar() {
  const { filterOptions, setFilterOptions, resetFilters, currentRole } = useTicketStore();

  const hasActiveFilters = Object.values(filterOptions).some(v => v !== '');

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">筛选条件</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>重置筛选</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* 状态 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">工单状态</label>
          <select
            value={filterOptions.status}
            onChange={(e) => setFilterOptions({ status: e.target.value as typeof filterOptions.status })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
          >
            <option value="">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* 诉求类型 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">诉求类型</label>
          <select
            value={filterOptions.category}
            onChange={(e) => setFilterOptions({ category: e.target.value as typeof filterOptions.category })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
          >
            <option value="">全部类型</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 所属区域 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">所属区域</label>
          <select
            value={filterOptions.area}
            onChange={(e) => setFilterOptions({ area: e.target.value as typeof filterOptions.area })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
          >
            <option value="">全部区域</option>
            {AREAS.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        {/* 承办单位 - 督办人员才能筛选全部 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">承办单位</label>
          <select
            value={filterOptions.handlerUnit}
            onChange={(e) => setFilterOptions({ handlerUnit: e.target.value as typeof filterOptions.handlerUnit })}
            disabled={currentRole === 'handler'}
            className={clsx(
              'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all',
              currentRole === 'handler' && 'bg-gray-100 cursor-not-allowed'
            )}
          >
            <option value="">全部单位</option>
            {HANDLER_UNITS.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>

        {/* 办理期限 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">办理期限</label>
          <select
            value={filterOptions.deadlineRange}
            onChange={(e) => setFilterOptions({ deadlineRange: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
          >
            <option value="">全部期限</option>
            <option value="overdue">已超期</option>
            <option value="today">今天到期</option>
            <option value="3days">3天内到期</option>
            <option value="7days">7天内到期</option>
            <option value="15days">15天内到期</option>
          </select>
        </div>

        {/* 是否有协办 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">协办情况</label>
          <select
            value={filterOptions.hasCoOrganizer}
            onChange={(e) => setFilterOptions({ hasCoOrganizer: e.target.value as 'all' | 'yes' | 'no' })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
          >
            <option value="all">全部工单</option>
            <option value="yes">有协办</option>
            <option value="no">无协办</option>
          </select>
        </div>
      </div>
    </div>
  );
}
