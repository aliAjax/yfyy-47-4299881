import { useNavigate } from 'react-router-dom';
import { Archive, ChevronRight, Filter, RotateCcw, Star } from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import {
  CATEGORIES,
  COMPLETION_QUALITY_LABELS,
  HANDLER_UNITS,
  SATISFACTION_LABELS,
  SatisfactionLevel,
} from '@/types';
import { clsx } from 'clsx';

export default function ArchiveList() {
  const navigate = useNavigate();
  const {
    archiveFilterOptions,
    setArchiveFilterOptions,
    resetArchiveFilters,
    getArchivedTickets,
    currentRole,
  } = useTicketStore();
  const tickets = getArchivedTickets();
  const hasActiveFilters = Object.values(archiveFilterOptions).some(v => v !== '');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">归档复盘</h2>
          <p className="mt-1 text-sm text-gray-500">查看已归档工单的满意度、办结质量和复盘记录</p>
        </div>
        <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
          已归档 <span className="font-semibold text-gray-900">{tickets.length}</span> 件
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">归档筛选</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetArchiveFilters}
              className="flex items-center space-x-1 text-xs text-gray-500 transition-colors hover:text-gray-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>重置筛选</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">承办单位</label>
            <select
              value={archiveFilterOptions.handlerUnit}
              onChange={(e) => setArchiveFilterOptions({ handlerUnit: e.target.value as typeof archiveFilterOptions.handlerUnit })}
              disabled={currentRole === 'handler'}
              className={clsx(
                'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                currentRole === 'handler' && 'cursor-not-allowed bg-gray-100'
              )}
            >
              <option value="">全部单位</option>
              {HANDLER_UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">诉求类型</label>
            <select
              value={archiveFilterOptions.category}
              onChange={(e) => setArchiveFilterOptions({ category: e.target.value as typeof archiveFilterOptions.category })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">全部类型</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">满意度</label>
            <select
              value={archiveFilterOptions.satisfaction}
              onChange={(e) => setArchiveFilterOptions({ satisfaction: e.target.value as SatisfactionLevel | '' })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">全部满意度</option>
              {Object.entries(SATISFACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">归档时间</label>
            <select
              value={archiveFilterOptions.archiveTimeRange}
              onChange={(e) => setArchiveFilterOptions({ archiveTimeRange: e.target.value as typeof archiveFilterOptions.archiveTimeRange })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">全部时间</option>
              <option value="today">今天</option>
              <option value="7days">近7天</option>
              <option value="30days">近30天</option>
              <option value="90days">近90天</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">工单编号</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">诉求标题</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">诉求类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">承办单位</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">满意度</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">办结质量</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">归档时间</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <Archive className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    暂无符合条件的归档工单
                  </td>
                </tr>
              ) : (
                tickets.map(ticket => {
                  const archiveInfo = ticket.archiveInfo;
                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm font-medium text-primary-600">{ticket.id}</span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-xs truncate text-sm font-medium text-gray-900">{ticket.title}</p>
                        {archiveInfo?.issueTags.length ? (
                          <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                            {archiveInfo.issueTags.join('、')}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {ticket.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{ticket.handlerUnit}</td>
                      <td className="px-4 py-4">
                        {archiveInfo && (
                          <span className={clsx(
                            'inline-flex items-center space-x-1 rounded-full px-2.5 py-1 text-xs font-medium',
                            archiveInfo.satisfaction === 'satisfied' && 'bg-green-100 text-green-700',
                            archiveInfo.satisfaction === 'neutral' && 'bg-blue-100 text-blue-700',
                            archiveInfo.satisfaction === 'unsatisfied' && 'bg-red-100 text-red-700'
                          )}>
                            <Star className="h-3 w-3" />
                            <span>{SATISFACTION_LABELS[archiveInfo.satisfaction]}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {archiveInfo ? COMPLETION_QUALITY_LABELS[archiveInfo.completionQuality] : '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{archiveInfo?.archiveTime || '-'}</td>
                      <td className="px-4 py-4 text-right">
                        <button className="inline-flex items-center text-sm font-medium text-primary-600 opacity-0 transition-opacity hover:text-primary-700 group-hover:opacity-100">
                          查看详情
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
