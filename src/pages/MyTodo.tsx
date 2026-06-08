import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Loader2,
  RotateCcw,
  AlertTriangle,
  Bell,
  ChevronRight,
  CalendarClock,
  AlertOctagon,
  Inbox
} from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import { StatusBadge } from '@/components/StatusBadge';
import { getDeadlineLabel } from '@/utils/date';
import { clsx } from 'clsx';

export default function MyTodo() {
  const navigate = useNavigate();
  const {
    currentRole,
    currentUnit,
    getHandlerTodoStats,
    getHandlerTodoTickets,
    getSupervisorTodoStats,
    getSupervisorTodoTickets,
    setFilterOptions,
  } = useTicketStore();

  const isSupervisor = currentRole === 'supervisor';

  const handleViewAll = (type: string) => {
    if (isSupervisor) {
      if (type === 'highRisk' || type === 'pendingUrge') {
        navigate('/supervision');
      } else if (type === 'returned') {
        setFilterOptions({ status: 'returned' });
        navigate('/');
      }
    } else {
      if (type === 'pending') {
        setFilterOptions({ status: 'pending' });
      } else if (type === 'processing') {
        setFilterOptions({ status: 'processing' });
      } else if (type === 'returned') {
        setFilterOptions({ status: 'returned' });
      } else if (type === 'upcoming') {
        setFilterOptions({ deadlineRange: '3days', status: '' });
      }
      navigate('/');
    }
  };

  const handlerStats = getHandlerTodoStats();
  const supervisorStats = getSupervisorTodoStats();

  const pendingTickets = getHandlerTodoTickets('pending').slice(0, 5);
  const processingTickets = getHandlerTodoTickets('processing').slice(0, 5);
  const returnedTicketsHandler = getHandlerTodoTickets('returned').slice(0, 5);
  const upcomingTickets = getHandlerTodoTickets('upcoming').slice(0, 5);

  const highRiskTickets = getSupervisorTodoTickets('highRisk').slice(0, 5);
  const pendingUrgeTickets = getSupervisorTodoTickets('pendingUrge').slice(0, 5);
  const returnedTicketsSupervisor = getSupervisorTodoTickets('returned').slice(0, 5);

  const TodoCard = ({
    title,
    count,
    icon: Icon,
    color,
    children,
    onViewAll,
  }: {
    title: string;
    count: number;
    icon: any;
    color: 'yellow' | 'blue' | 'orange' | 'red';
    children: React.ReactNode;
    onViewAll: () => void;
  }) => {
    const colorStyles = {
      yellow: {
        bg: 'from-yellow-50 to-white',
        border: 'border-yellow-200',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        titleColor: 'text-yellow-600',
        countColor: 'text-yellow-700',
        bar: 'from-yellow-500 to-yellow-600',
      },
      blue: {
        bg: 'from-blue-50 to-white',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        titleColor: 'text-blue-600',
        countColor: 'text-blue-700',
        bar: 'from-blue-500 to-blue-600',
      },
      orange: {
        bg: 'from-orange-50 to-white',
        border: 'border-orange-200',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        titleColor: 'text-orange-600',
        countColor: 'text-orange-700',
        bar: 'from-orange-500 to-orange-600',
      },
      red: {
        bg: 'from-red-50 to-white',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        titleColor: 'text-red-600',
        countColor: 'text-red-700',
        bar: 'from-red-500 to-red-600',
      },
    };

    const styles = colorStyles[color];

    return (
      <div className={clsx(
        'rounded-xl border bg-gradient-to-br p-5 shadow-sm overflow-hidden',
        styles.bg,
        styles.border
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', styles.iconBg)}>
              <Icon className={clsx('h-6 w-6', styles.iconColor)} />
            </div>
            <div>
              <p className={clsx('text-sm font-medium', styles.titleColor)}>{title}</p>
              <p className={clsx('text-2xl font-bold', styles.countColor)}>{count}</p>
            </div>
          </div>
          <button
            onClick={onViewAll}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            查看全部
            <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-gray-200/60 mb-3" />

        <div className="space-y-2">
          {children}
        </div>

        <div className={clsx('mt-4 h-1 w-full rounded-full bg-gradient-to-r', styles.bar)} />
      </div>
    );
  };

  const TicketItem = ({ ticket, showUnit = false }: { ticket: any; showUnit?: boolean }) => (
    <div
      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/60 transition-colors cursor-pointer group"
      onClick={() => navigate(`/tickets/${ticket.id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate font-medium">{ticket.title}</p>
        <div className="flex items-center space-x-3 mt-1">
          <span className="text-xs text-gray-500 font-mono">{ticket.id}</span>
          {showUnit && <span className="text-xs text-gray-500">{ticket.handlerUnit}</span>}
          <StatusBadge status={ticket.status} size="sm" />
        </div>
      </div>
      <div className="ml-4 text-right flex-shrink-0">
        <span className={clsx(
          'text-xs font-medium',
          getDeadlineLabel(ticket.deadline, ticket.status).includes('超期') ? 'text-red-600' :
          getDeadlineLabel(ticket.deadline, ticket.status).includes('今天') || getDeadlineLabel(ticket.deadline, ticket.status).includes('明天') ? 'text-orange-600' :
          'text-gray-500'
        )}>
          {getDeadlineLabel(ticket.deadline, ticket.status)}
        </span>
      </div>
    </div>
  );

  const EmptyState = ({ text }: { text: string }) => (
    <div className="py-6 text-center">
      <Inbox className="mx-auto h-8 w-8 text-gray-300 mb-2" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">我的待办</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSupervisor ? '全局督办工作概览，重点关注高风险和待催办工单' : `${currentUnit} 待办工作一览，及时处理各类工单`}
          </p>
        </div>
      </div>

      {isSupervisor ? (
        /* 督办人员视角 */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 高风险工单 */}
          <TodoCard
            title="高风险工单"
            count={supervisorStats.highRisk}
            icon={AlertOctagon}
            color="red"
            onViewAll={() => handleViewAll('highRisk')}
          >
            {highRiskTickets.length === 0 ? (
              <EmptyState text="暂无高风险工单" />
            ) : (
              highRiskTickets.map((ticket) => (
                <TicketItem key={ticket.id} ticket={ticket} showUnit />
              ))
            )}
          </TodoCard>

          {/* 待催办工单 */}
          <TodoCard
            title="待催办工单"
            count={supervisorStats.pendingUrge}
            icon={Bell}
            color="orange"
            onViewAll={() => handleViewAll('pendingUrge')}
          >
            {pendingUrgeTickets.length === 0 ? (
              <EmptyState text="暂无待催办工单" />
            ) : (
              pendingUrgeTickets.map((ticket) => (
                <TicketItem key={ticket.id} ticket={ticket} showUnit />
              ))
            )}
          </TodoCard>

          {/* 退回重办 */}
          <TodoCard
            title="退回重办"
            count={supervisorStats.returned}
            icon={RotateCcw}
            color="yellow"
            onViewAll={() => handleViewAll('returned')}
          >
            {returnedTicketsSupervisor.length === 0 ? (
              <EmptyState text="暂无退回重办工单" />
            ) : (
              returnedTicketsSupervisor.map((ticket) => (
                <TicketItem key={ticket.id} ticket={ticket} showUnit />
              ))
            )}
          </TodoCard>
        </div>
      ) : (
        /* 承办单位视角 */
        <div className="space-y-6">
          {/* 第一行：待办理 + 办理中 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TodoCard
              title="待办理"
              count={handlerStats.pending}
              icon={Clock}
              color="yellow"
              onViewAll={() => handleViewAll('pending')}
            >
              {pendingTickets.length === 0 ? (
                <EmptyState text="暂无待办理工单" />
              ) : (
                pendingTickets.map((ticket) => (
                  <TicketItem key={ticket.id} ticket={ticket} />
                ))
              )}
            </TodoCard>

            <TodoCard
              title="办理中"
              count={handlerStats.processing}
              icon={Loader2}
              color="blue"
              onViewAll={() => handleViewAll('processing')}
            >
              {processingTickets.length === 0 ? (
                <EmptyState text="暂无办理中工单" />
              ) : (
                processingTickets.map((ticket) => (
                  <TicketItem key={ticket.id} ticket={ticket} />
                ))
              )}
            </TodoCard>
          </div>

          {/* 第二行：退回重办 + 即将到期 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TodoCard
              title="退回重办"
              count={handlerStats.returned}
              icon={RotateCcw}
              color="orange"
              onViewAll={() => handleViewAll('returned')}
            >
              {returnedTicketsHandler.length === 0 ? (
                <EmptyState text="暂无退回重办工单" />
              ) : (
                returnedTicketsHandler.map((ticket) => (
                  <TicketItem key={ticket.id} ticket={ticket} />
                ))
              )}
            </TodoCard>

            <TodoCard
              title="即将到期"
              count={handlerStats.upcomingDeadline}
              icon={CalendarClock}
              color="red"
              onViewAll={() => handleViewAll('upcoming')}
            >
              {upcomingTickets.length === 0 ? (
                <EmptyState text="暂无即将到期工单" />
              ) : (
                upcomingTickets.map((ticket) => (
                  <TicketItem key={ticket.id} ticket={ticket} />
                ))
              )}
            </TodoCard>
          </div>
        </div>
      )}

      {/* 快捷操作区 */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">快捷入口</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {isSupervisor ? (
            <>
              <button
                onClick={() => navigate('/supervision')}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 hover:bg-gray-50 hover:border-primary-200 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 mb-2 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">督办中心</span>
              </button>
              <button
                onClick={() => { setFilterOptions({ status: '' }); navigate('/'); }}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 hover:bg-gray-50 hover:border-primary-200 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 mb-2 group-hover:scale-110 transition-transform">
                  <Inbox className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">全部工单</span>
              </button>
              <button
                onClick={() => navigate('/tickets/new')}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 hover:bg-gray-50 hover:border-primary-200 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 mb-2 group-hover:scale-110 transition-transform">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">新建工单</span>
              </button>
              <button
                onClick={() => navigate('/tickets/batch-import')}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 hover:bg-gray-50 hover:border-primary-200 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 mb-2 group-hover:scale-110 transition-transform">
                  <Loader2 className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">批量导入</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setFilterOptions({ status: 'pending' }); navigate('/'); }}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 hover:bg-gray-50 hover:border-primary-200 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 mb-2 group-hover:scale-110 transition-transform">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">待办理</span>
              </button>
              <button
                onClick={() => { setFilterOptions({ status: 'processing' }); navigate('/'); }}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 hover:bg-gray-50 hover:border-primary-200 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 mb-2 group-hover:scale-110 transition-transform">
                  <Loader2 className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">办理中</span>
              </button>
              <button
                onClick={() => { setFilterOptions({ status: 'completed' }); navigate('/'); }}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 hover:bg-gray-50 hover:border-primary-200 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 mb-2 group-hover:scale-110 transition-transform">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">已办结</span>
              </button>
              <button
                onClick={() => { setFilterOptions({ deadlineRange: 'overdue', status: '' }); navigate('/'); }}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 hover:bg-gray-50 hover:border-primary-200 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 mb-2 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700">超期工单</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
