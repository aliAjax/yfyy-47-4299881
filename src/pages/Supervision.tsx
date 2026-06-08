import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  RotateCcw, 
  Bell,
  ChevronRight,
  TrendingUp,
  AlertOctagon,
  AlertCircle,
  Info
} from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import { StatusBadge } from '@/components/StatusBadge';
import { getDeadlineLabel, getDaysRemaining } from '@/utils/date';
import { clsx } from 'clsx';

type TabType = 'risk' | 'pendingUrge' | 'urge' | 'return';

const VALID_TABS: TabType[] = ['risk', 'pendingUrge', 'urge', 'return'];

export default function Supervision() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getRiskTickets, getUrgeRecords, getReturnRecords, getSupervisorTodoTickets, tickets } = useTicketStore();
  
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'risk';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`/supervision?tab=${tab}`, { replace: true });
  };
  
  const riskTickets = getRiskTickets();
  const pendingUrgeTickets = getSupervisorTodoTickets('pendingUrge');
  const urgeRecords = getUrgeRecords();
  const returnRecords = getReturnRecords();

  const getTicketById = (id: string) => tickets.find(t => t.id === id);

  const tabs = [
    { key: 'risk' as TabType, label: '超期风险', icon: AlertTriangle, count: riskTickets.high.length + riskTickets.medium.length },
    { key: 'pendingUrge' as TabType, label: '待催办工单', icon: Bell, count: pendingUrgeTickets.length },
    { key: 'urge' as TabType, label: '催办记录', icon: Bell, count: urgeRecords.length },
    { key: 'return' as TabType, label: '退回重办', icon: RotateCcw, count: returnRecords.length },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">高风险工单</p>
              <p className="mt-2 text-3xl font-bold text-red-700">{riskTickets.high.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <AlertOctagon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="mt-3 text-xs text-red-500">
            已超期或即将到期，需重点关注
          </p>
        </div>

        <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">中风险工单</p>
              <p className="mt-2 text-3xl font-bold text-orange-700">{riskTickets.medium.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <p className="mt-3 text-xs text-orange-500">
            剩余期限1-3天，需加快办理
          </p>
        </div>

        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">低风险工单</p>
              <p className="mt-2 text-3xl font-bold text-green-700">{riskTickets.low.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <Info className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="mt-3 text-xs text-green-500">
            剩余期限充足，按计划推进
          </p>
        </div>
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={clsx(
                  'flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-all border-b-2 -mb-px',
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={clsx(
                    'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium',
                    activeTab === tab.key
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-200 text-gray-600'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div className="p-6">
          {/* 超期风险 */}
          {activeTab === 'risk' && (
            <div className="space-y-8">
              {/* 高风险 */}
              <div>
                <h3 className="flex items-center space-x-2 text-sm font-semibold text-gray-900 mb-4">
                  <span className="flex h-2 w-2 rounded-full bg-red-500" />
                  <span>高风险工单（{riskTickets.high.length}）</span>
                </h3>
                {riskTickets.high.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
                    <p className="text-sm text-gray-500">暂无高风险工单</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-red-200">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-red-50 border-b border-red-100">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-red-700">工单编号</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-red-700">诉求标题</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-red-700">承办单位</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-red-700">剩余期限</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-red-700">状态</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-red-700">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {riskTickets.high.map((ticket) => (
                          <tr
                            key={ticket.id}
                            className="hover:bg-red-50/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                          >
                            <td className="px-4 py-3 text-sm font-mono text-red-600 font-medium">{ticket.id}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{ticket.title}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{ticket.handlerUnit}</td>
                            <td className="px-4 py-3 text-sm text-red-600 font-medium">
                              {getDeadlineLabel(ticket.deadline, ticket.status)}
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={ticket.status} size="sm" /></td>
                            <td className="px-4 py-3 text-right">
                              <button className="inline-flex items-center text-sm text-red-600 hover:text-red-700 font-medium">
                                查看
                                <ChevronRight className="ml-1 h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 中风险 */}
              <div>
                <h3 className="flex items-center space-x-2 text-sm font-semibold text-gray-900 mb-4">
                  <span className="flex h-2 w-2 rounded-full bg-orange-500" />
                  <span>中风险工单（{riskTickets.medium.length}）</span>
                </h3>
                {riskTickets.medium.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
                    <p className="text-sm text-gray-500">暂无中风险工单</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-orange-200">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-orange-50 border-b border-orange-100">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-orange-700">工单编号</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-orange-700">诉求标题</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-orange-700">承办单位</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-orange-700">剩余期限</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-orange-700">状态</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-orange-700">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-100">
                        {riskTickets.medium.map((ticket) => (
                          <tr
                            key={ticket.id}
                            className="hover:bg-orange-50/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                          >
                            <td className="px-4 py-3 text-sm font-mono text-orange-600 font-medium">{ticket.id}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{ticket.title}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{ticket.handlerUnit}</td>
                            <td className="px-4 py-3 text-sm text-orange-600 font-medium">
                              {getDeadlineLabel(ticket.deadline, ticket.status)}
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={ticket.status} size="sm" /></td>
                            <td className="px-4 py-3 text-right">
                              <button className="inline-flex items-center text-sm text-orange-600 hover:text-orange-700 font-medium">
                                查看
                                <ChevronRight className="ml-1 h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 待催办工单 */}
          {activeTab === 'pendingUrge' && (
            <div>
              {pendingUrgeTickets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center">
                  <Bell className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">暂无待催办工单</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-orange-200">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-orange-50 border-b border-orange-100">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-orange-700">工单编号</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-orange-700">诉求标题</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-orange-700">承办单位</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-orange-700">剩余期限</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-orange-700">状态</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-orange-700">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100">
                      {pendingUrgeTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="hover:bg-orange-50/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                        >
                          <td className="px-4 py-3 text-sm font-mono text-orange-600 font-medium">{ticket.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{ticket.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{ticket.handlerUnit}</td>
                          <td className="px-4 py-3 text-sm text-orange-600 font-medium">
                            {getDeadlineLabel(ticket.deadline, ticket.status)}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={ticket.status} size="sm" /></td>
                          <td className="px-4 py-3 text-right">
                            <button className="inline-flex items-center text-sm text-orange-600 hover:text-orange-700 font-medium">
                              查看
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 催办记录 */}
          {activeTab === 'urge' && (
            <div>
              {urgeRecords.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">暂无催办记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {urgeRecords.map((record) => {
                    const ticket = getTicketById(record.ticketId);
                    return (
                      <div
                        key={record.id}
                        className="flex items-start space-x-4 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => ticket && navigate(`/tickets/${ticket.id}`)}
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                          <Bell className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {ticket?.title || '未知工单'}
                            </p>
                            <span className="text-xs text-gray-400">{record.createTime}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            催办原因：{record.reason}
                          </p>
                          <div className="mt-2 flex items-center space-x-4">
                            <span className="text-xs text-gray-500">
                              工单编号：<span className="font-mono text-primary-600">{record.ticketId}</span>
                            </span>
                            <span className="text-xs text-gray-500">
                              操作人：{record.operator}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 退回重办 */}
          {activeTab === 'return' && (
            <div>
              {returnRecords.length === 0 ? (
                <div className="py-12 text-center">
                  <RotateCcw className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">暂无退回重办记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {returnRecords.map((record) => {
                    const ticket = getTicketById(record.ticketId);
                    return (
                      <div
                        key={record.id}
                        className="flex items-start space-x-4 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => ticket && navigate(`/tickets/${ticket.id}`)}
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-100">
                          <RotateCcw className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {ticket?.title || '未知工单'}
                            </p>
                            <span className="text-xs text-gray-400">{record.createTime}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            退回原因：{record.reason}
                          </p>
                          <div className="mt-2 flex items-center space-x-4">
                            <span className="text-xs text-gray-500">
                              工单编号：<span className="font-mono text-primary-600">{record.ticketId}</span>
                            </span>
                            <span className="text-xs text-gray-500">
                              操作人：{record.operator}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 督办统计 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-primary-600" />
            各单位超期情况
          </h3>
          <div className="space-y-3">
            {['城市管理委员会', '交通委员会', '住房和城乡建设委员会', '人力资源和社会保障局'].map((unit) => {
              const unitTickets = tickets.filter(t => t.handlerUnit === unit && t.status !== 'completed');
              const overdueCount = unitTickets.filter(t => {
                const days = getDaysRemaining(t.deadline);
                return days < 0 || t.status === 'overdue';
              }).length;
              const total = unitTickets.length;
              const percent = total > 0 ? Math.round((overdueCount / total) * 100) : 0;
              
              return (
                <div key={unit} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{unit}</span>
                    <span className="text-xs text-gray-500">{overdueCount}/{total} 件</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all',
                        percent > 50 ? 'bg-red-500' : percent > 20 ? 'bg-orange-500' : 'bg-green-500'
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-4 w-4 mr-2 text-primary-600" />
            办理效率统计
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">
                {tickets.filter(t => t.status === 'completed').length}
              </p>
              <p className="text-xs text-blue-600 mt-1">已办结工单</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">85%</p>
              <p className="text-xs text-green-600 mt-1">按时办结率</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">5.2天</p>
              <p className="text-xs text-yellow-600 mt-1">平均办理时长</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{urgeRecords.length}</p>
              <p className="text-xs text-red-600 mt-1">累计催办次数</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
