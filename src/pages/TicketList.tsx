import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import { StatsCard } from '@/components/StatsCard';
import { FilterBar } from '@/components/FilterBar';
import { StatusBadge } from '@/components/StatusBadge';
import { Ticket } from '@/types';
import { getDeadlineLabel, getRiskLevel } from '@/utils/date';
import { clsx } from 'clsx';

export default function TicketList() {
  const navigate = useNavigate();
  const { getFilteredTickets, getTicketStats, setFilterOptions } = useTicketStore();
  
  const tickets = getFilteredTickets();
  const stats = getTicketStats();

  const handleStatClick = (status: string) => {
    if (status === 'overdue') {
      setFilterOptions({ deadlineRange: 'overdue' });
    } else {
      setFilterOptions({ status: status as Ticket['status'] });
    }
  };

  const getDeadlineClass = (ticket: Ticket) => {
    if (ticket.status === 'completed') return 'text-gray-500';
    const risk = getRiskLevel(ticket.deadline, ticket.status);
    if (risk === 'high') return 'text-red-600 font-medium';
    if (risk === 'medium') return 'text-orange-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="待办理"
          value={stats.pending}
          icon={Clock}
          color="yellow"
          onClick={() => handleStatClick('pending')}
        />
        <StatsCard
          title="办理中"
          value={stats.processing}
          icon={Loader2}
          color="blue"
          onClick={() => handleStatClick('processing')}
        />
        <StatsCard
          title="已办结"
          value={stats.completed}
          icon={CheckCircle}
          color="green"
          onClick={() => handleStatClick('completed')}
        />
        <StatsCard
          title="超期工单"
          value={stats.overdue}
          icon={AlertCircle}
          color="red"
          onClick={() => handleStatClick('overdue')}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar />

      {/* Ticket Table */}
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
                  所属区域
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  承办单位
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  交办时间
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  剩余期限
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  状态
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    暂无符合条件的工单
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
                      <p className="text-sm font-medium text-gray-900 max-w-xs truncate">
                        {ticket.title}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{ticket.area}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{ticket.handlerUnit}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{ticket.assignTime}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={clsx('text-sm', getDeadlineClass(ticket))}>
                        {getDeadlineLabel(ticket.deadline, ticket.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={ticket.status} size="sm" />
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
        
        {/* Table Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-900">{tickets.length}</span> 条工单
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
