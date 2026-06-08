import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Star, ChevronRight, Filter, X, Building2, Tag, Clock, ThumbsUp, ThumbsDown, Minus, Users } from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import { StatsCard } from '@/components/StatsCard';
import { HandlerUnit, TicketCategory, SatisfactionLevel, HANDLER_UNITS, CATEGORIES, SATISFACTION_LABELS, QUALITY_LABELS } from '@/types';
import { clsx } from 'clsx';

export default function ArchiveList() {
  const navigate = useNavigate();
  const { 
    getArchivedTickets, 
    getArchiveStats, 
    archiveFilterOptions,
    setArchiveFilterOptions,
    resetArchiveFilters,
  } = useTicketStore();
  
  const [showFilters, setShowFilters] = useState(false);

  const tickets = getArchivedTickets();
  const stats = getArchiveStats();

  const getSatisfactionIcon = (level: SatisfactionLevel) => {
    switch (level) {
      case 'very_satisfied':
      case 'satisfied':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'dissatisfied':
      case 'very_dissatisfied':
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSatisfactionColor = (level: SatisfactionLevel) => {
    switch (level) {
      case 'very_satisfied': return 'text-green-600 bg-green-50';
      case 'satisfied': return 'text-blue-600 bg-blue-50';
      case 'neutral': return 'text-gray-600 bg-gray-50';
      case 'dissatisfied': return 'text-orange-600 bg-orange-50';
      case 'very_dissatisfied': return 'text-red-600 bg-red-50';
    }
  };

  const satisfactionRate = stats.total > 0 
    ? (((stats.verySatisfied + stats.satisfied) / stats.total) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="已归档工单"
          value={stats.total}
          icon={Archive}
          color="purple"
        />
        <StatsCard
          title="非常满意"
          value={stats.verySatisfied}
          icon={Star}
          color="green"
        />
        <StatsCard
          title="满意"
          value={stats.satisfied}
          icon={Star}
          color="blue"
        />
        <StatsCard
          title="满意率"
          value={`${satisfactionRate}%`}
          icon={ThumbsUp}
          color="yellow"
        />
      </div>

      {/* Filter Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">筛选条件</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => resetArchiveFilters()}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              重置
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              {showFilters ? '收起' : '展开'}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                承办单位
              </label>
              <select
                value={archiveFilterOptions.handlerUnit}
                onChange={(e) => setArchiveFilterOptions({ handlerUnit: e.target.value as HandlerUnit | '' })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              >
                <option value="">全部单位</option>
                {HANDLER_UNITS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                诉求类型
              </label>
              <select
                value={archiveFilterOptions.category}
                onChange={(e) => setArchiveFilterOptions({ category: e.target.value as TicketCategory | '' })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              >
                <option value="">全部类型</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                满意度
              </label>
              <select
                value={archiveFilterOptions.satisfaction}
                onChange={(e) => setArchiveFilterOptions({ satisfaction: e.target.value as SatisfactionLevel | '' })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              >
                <option value="">全部满意度</option>
                {Object.entries(SATISFACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                归档时间
              </label>
              <select
                value={archiveFilterOptions.archiveTimeRange}
                onChange={(e) => setArchiveFilterOptions({ archiveTimeRange: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              >
                <option value="">全部时间</option>
                <option value="7days">近7天</option>
                <option value="30days">近30天</option>
                <option value="90days">近90天</option>
                <option value="thisYear">今年</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                协办情况
              </label>
              <select
                value={archiveFilterOptions.hasCoOrganizer}
                onChange={(e) => setArchiveFilterOptions({ hasCoOrganizer: e.target.value as 'all' | 'yes' | 'no' })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              >
                <option value="all">全部工单</option>
                <option value="yes">有协办</option>
                <option value="no">无协办</option>
              </select>
            </div>
          </div>
        )}

        {/* Active Filters */}
        {(archiveFilterOptions.handlerUnit || archiveFilterOptions.category || archiveFilterOptions.satisfaction || archiveFilterOptions.archiveTimeRange || archiveFilterOptions.hasCoOrganizer !== 'all') && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">已选条件：</span>
            {archiveFilterOptions.handlerUnit && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary-100 text-primary-700 text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                {archiveFilterOptions.handlerUnit}
                <button
                  onClick={() => setArchiveFilterOptions({ handlerUnit: '' })}
                  className="ml-1.5 hover:text-primary-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {archiveFilterOptions.category && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {archiveFilterOptions.category}
                <button
                  onClick={() => setArchiveFilterOptions({ category: '' })}
                  className="ml-1.5 hover:text-green-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {archiveFilterOptions.hasCoOrganizer !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs">
                <Users className="h-3 w-3 mr-1" />
                {archiveFilterOptions.hasCoOrganizer === 'yes' ? '有协办' : '无协办'}
                <button
                  onClick={() => setArchiveFilterOptions({ hasCoOrganizer: 'all' })}
                  className="ml-1.5 hover:text-indigo-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {archiveFilterOptions.satisfaction && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs">
                <Star className="h-3 w-3 mr-1" />
                {SATISFACTION_LABELS[archiveFilterOptions.satisfaction as SatisfactionLevel]}
                <button
                  onClick={() => setArchiveFilterOptions({ satisfaction: '' })}
                  className="ml-1.5 hover:text-yellow-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {archiveFilterOptions.archiveTimeRange && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {archiveFilterOptions.archiveTimeRange === '7days' && '近7天'}
                {archiveFilterOptions.archiveTimeRange === '30days' && '近30天'}
                {archiveFilterOptions.archiveTimeRange === '90days' && '近90天'}
                {archiveFilterOptions.archiveTimeRange === 'thisYear' && '今年'}
                <button
                  onClick={() => setArchiveFilterOptions({ archiveTimeRange: '' })}
                  className="ml-1.5 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Archived Ticket Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  工单编号
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  诉求标题
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  诉求类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  承办单位
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  满意度
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  办结质量
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  归档时间
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <Archive className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    <p>暂无归档工单</p>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="transition-colors hover:bg-gray-50 cursor-pointer group"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <td className="px-4 py-4">
                      <span className="text-sm font-mono text-primary-600 font-medium">
                        {ticket.id}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {ticket.title}
                        </p>
                        {ticket.coOrganizers && ticket.coOrganizers.length > 0 && (
                          <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-xs font-medium flex-shrink-0">
                            <Users className="h-3 w-3" />
                            <span>有协办</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{ticket.handlerUnit}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={clsx(
                        'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                        getSatisfactionColor(ticket.archiveInfo?.satisfaction || 'neutral')
                      )}>
                        {getSatisfactionIcon(ticket.archiveInfo?.satisfaction || 'neutral')}
                        <span>{SATISFACTION_LABELS[ticket.archiveInfo?.satisfaction || 'neutral']}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-700">
                        {QUALITY_LABELS[ticket.archiveInfo?.quality || 'average']}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">
                        {ticket.archiveInfo?.archiveTime}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        查看详情
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-900">{tickets.length}</span> 条归档工单
          </p>
          <div className="flex items-center space-x-2">
            <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              上一页
            </button>
            <span className="text-sm text-gray-700">第 1 页</span>
            <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              下一页
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
