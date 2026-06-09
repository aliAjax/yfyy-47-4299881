import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  MapPin,
  AlertTriangle,
  PieChart as PieChartIcon,
  Activity,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  ArrowLeft,
  Calendar,
  Timer,
  Zap,
  ThumbsUp,
  AlertCircle,
} from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import {
  getTotalStats,
  getTrendData,
  getAreaDistribution,
  getUnitOverdueRank,
  getCategoryRatio,
  getHighRiskTickets,
  getRecentDynamics,
  getUrgeCount,
  getReturnCount,
} from '@/utils/dashboardStats';
import {
  DashboardCard,
  StatItem,
  LineChart,
  BarChart,
  RankItem,
  PieChart,
  ScrollList,
  RiskItem,
  DynamicItem,
} from '@/components/dashboard';
import { Area, TicketCategory, HandlerUnit } from '@/types';
import { clsx } from 'clsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { tickets, currentRole, currentUnit } = useTicketStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const scopedTickets = useMemo(() => {
    if (currentRole === 'handler' && currentUnit) {
      return tickets.filter(t =>
        t.handlerUnit === currentUnit ||
        t.coOrganizers?.some(co => co.unit === currentUnit)
      );
    }
    return tickets;
  }, [tickets, currentRole, currentUnit]);

  const totalStats = useMemo(() => getTotalStats(scopedTickets), [scopedTickets]);
  const trendData = useMemo(() => getTrendData(scopedTickets, 7), [scopedTickets]);
  const areaData = useMemo(() => getAreaDistribution(scopedTickets), [scopedTickets]);
  const unitRank = useMemo(() => getUnitOverdueRank(scopedTickets), [scopedTickets]);
  const categoryData = useMemo(() => getCategoryRatio(scopedTickets), [scopedTickets]);
  const riskTickets = useMemo(() => getHighRiskTickets(scopedTickets, 20), [scopedTickets]);
  const dynamics = useMemo(() => getRecentDynamics(scopedTickets, 30), [scopedTickets]);
  const urgeCount = useMemo(() => getUrgeCount(scopedTickets), [scopedTickets]);
  const returnCount = useMemo(() => getReturnCount(scopedTickets), [scopedTickets]);

  const barChartData = useMemo(() =>
    areaData.map(item => ({ label: item.area, value: item.count })),
    [areaData]
  );

  const pieChartData = useMemo(() =>
    categoryData.map(item => ({ label: item.category, value: item.count })),
    [categoryData]
  );

  const maxOverdue = useMemo(() =>
    unitRank.length > 0 ? unitRank[0].overdueCount : 1,
    [unitRank]
  );

  const activeAreas = useMemo(() =>
    areaData.filter(a => a.count > 0).length,
    [areaData]
  );

  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const buildQueryString = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });
    return searchParams.toString();
  };

  const goToTicketList = (filters: Record<string, string> = {}) => {
    const query = buildQueryString(filters);
    navigate(query ? `/?${query}` : '/');
  };

  const goToSupervision = (filters: Record<string, string> = {}) => {
    const query = buildQueryString({ tab: 'risk', ...filters });
    navigate(`/supervision?${query}`);
  };

  const handleAreaClick = (area: string) => {
    goToTicketList({ area: area as Area });
  };

  const handleCategoryClick = (category: string) => {
    goToTicketList({ category: category as TicketCategory });
  };

  const handleUnitOverdueClick = (unit: string) => {
    goToSupervision({ handlerUnit: unit as HandlerUnit });
  };

  const handleHighRiskClick = () => {
    goToSupervision({ riskLevel: 'high' });
  };

  const handleOverdueClick = () => {
    goToSupervision({});
  };

  const handleReturnedClick = () => {
    const query = buildQueryString({ tab: 'return' });
    navigate(`/supervision?${query}`);
  };

  const handleTrendDateClick = (displayDate: string) => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const fullDate = `${year}-${month}-${displayDate}`;
    goToTicketList({ assignDate: fullDate });
  };

  const handleOverdueRateClick = () => {
    goToSupervision({});
  };

  const handleCompletionRateClick = () => {
    goToTicketList({ status: 'completed' });
  };

  const handleOnTimeRateClick = () => {
    goToTicketList({ status: 'completed' });
  };

  const handleAreaClickCard = () => {
    goToTicketList({});
  };

  const handleUnitClickCard = () => {
    goToSupervision({});
  };

  const handleUrgeCountClick = () => {
    const query = buildQueryString({ tab: 'urge' });
    navigate(`/supervision?${query}`);
  };

  const handleDynamicsClick = () => {
    goToSupervision({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-600 text-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all duration-200 hover:scale-105"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">返回首页</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <Activity className="w-7 h-7" />
                  监督指挥大屏
                </h1>
                <p className="text-sm text-primary-200 mt-1">全市工单运行态势实时监控</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-medium">{formatTime(currentTime)}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 px-6 pb-5">
          <StatItem
            label="工单总数"
            value={totalStats.total}
            color="blue"
            icon={FileText}
            onClick={() => goToTicketList()}
          />
          <StatItem
            label="今日新增"
            value={totalStats.todayNew}
            color="green"
            icon={Zap}
            onClick={() => goToTicketList()}
          />
          <StatItem
            label="本周新增"
            value={totalStats.weekNew}
            color="purple"
            icon={Calendar}
            onClick={() => goToTicketList()}
          />
          <StatItem
            label="待办理"
            value={totalStats.pending}
            color="yellow"
            icon={Clock}
            onClick={() => goToTicketList({ status: 'pending' })}
          />
          <StatItem
            label="办理中"
            value={totalStats.processing}
            color="blue"
            icon={TrendingUp}
            onClick={() => goToTicketList({ status: 'processing' })}
          />
          <StatItem
            label="已办结"
            value={totalStats.completed}
            color="green"
            icon={CheckCircle}
            onClick={() => goToTicketList({ status: 'completed' })}
          />
          <StatItem
            label="已超期"
            value={totalStats.overdue}
            color="red"
            icon={AlertTriangle}
            onClick={handleOverdueClick}
          />
          <StatItem
            label="已退回"
            value={totalStats.returned}
            color="red"
            icon={XCircle}
            onClick={handleReturnedClick}
          />
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="工单总量趋势"
            icon={TrendingUp}
            className="lg:col-span-2"
            action={<span className="text-xs text-gray-400">近7天 · 点击日期查看详情</span>}
          >
            <LineChart data={trendData} height={240} color="#3b82f6" onItemClick={handleTrendDateClick} />
          </DashboardCard>

          <DashboardCard
            title="诉求类型占比"
            icon={PieChartIcon}
            action={<span className="text-xs text-gray-400">点击类型查看详情</span>}
          >
            <PieChart data={pieChartData} size={180} innerRadius={50} onItemClick={handleCategoryClick} />
          </DashboardCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DashboardCard
            title="各区域工单分布"
            icon={MapPin}
            action={<span className="text-xs text-gray-400">点击区域查看详情</span>}
          >
            <BarChart data={barChartData} height={280} color="#3b82f6" horizontal={true} onItemClick={handleAreaClick} />
          </DashboardCard>

          <DashboardCard
            title="承办单位超期排行"
            icon={BarChart3}
            action={<span className="text-xs text-gray-400">点击单位查看详情</span>}
          >
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {unitRank.map((item, index) => (
                <RankItem
                  key={item.unit}
                  rank={index + 1}
                  label={item.unit}
                  value={item.overdueCount}
                  subValue={`超期率 ${item.overdueRate}%`}
                  maxValue={maxOverdue}
                  color="#ef4444"
                  onClick={() => handleUnitOverdueClick(item.unit)}
                />
              ))}
              {unitRank.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">暂无数据</div>
              )}
            </div>
          </DashboardCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DashboardCard
            title="高风险工单"
            icon={AlertTriangle}
            action={
              <button
                onClick={handleHighRiskClick}
                className="text-xs text-red-500 font-medium hover:text-red-600 transition-colors cursor-pointer"
              >
                {riskTickets.length} 个高风险 → 查看全部
              </button>
            }
          >
            <ScrollList height={340} speed={40}>
              {riskTickets.map(ticket => (
                <RiskItem
                  key={ticket.id}
                  title={ticket.title}
                  area={ticket.area}
                  unit={ticket.handlerUnit}
                  deadline={ticket.deadline}
                  remainingDays={ticket.remainingDays}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                />
              ))}
              {riskTickets.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">暂无高风险工单</div>
              )}
            </ScrollList>
          </DashboardCard>

          <DashboardCard
            title="催办退回动态"
            icon={Activity}
            action={
              <button
                onClick={handleDynamicsClick}
                className="flex items-center gap-3 text-xs cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="text-orange-500">催办 {urgeCount}</span>
                <span className="text-red-500">退回 {returnCount}</span>
                <span className="text-gray-400">→ 查看全部</span>
              </button>
            }
          >
            <ScrollList height={340} speed={35}>
              {dynamics.map(item => (
                <DynamicItem
                  key={item.id}
                  type={item.type}
                  title={item.ticketTitle}
                  content={item.content}
                  operator={item.operator}
                  time={item.time}
                  onClick={() => navigate(`/tickets/${item.ticketId}`)}
                />
              ))}
              {dynamics.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">暂无动态</div>
              )}
            </ScrollList>
          </DashboardCard>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div
            onClick={handleCompletionRateClick}
            className={clsx(
              "bg-white rounded-xl p-4 border border-gray-100 shadow-sm transition-shadow",
              "cursor-pointer hover:shadow-md hover:border-green-200"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <ThumbsUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-xs text-gray-500">办结率</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">{totalStats.completionRate}%</span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-1000"
                style={{ width: `${totalStats.completionRate}%` }}
              />
            </div>
          </div>

          <div
            onClick={handleOverdueRateClick}
            className={clsx(
              "bg-white rounded-xl p-4 border border-gray-100 shadow-sm transition-shadow",
              "cursor-pointer hover:shadow-md hover:border-red-200"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-xs text-gray-500">超期率</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-600">{totalStats.overdueRate}%</span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-1000"
                style={{ width: `${totalStats.overdueRate}%` }}
              />
            </div>
          </div>

          <div
            onClick={handleOnTimeRateClick}
            className={clsx(
              "bg-white rounded-xl p-4 border border-gray-100 shadow-sm transition-shadow",
              "cursor-pointer hover:shadow-md hover:border-blue-200"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500">按时办结率</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600">{totalStats.onTimeRate}%</span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-1000"
                style={{ width: `${totalStats.onTimeRate}%` }}
              />
            </div>
          </div>

          <div
            onClick={handleAreaClickCard}
            className={clsx(
              "bg-white rounded-xl p-4 border border-gray-100 shadow-sm transition-shadow",
              "cursor-pointer hover:shadow-md hover:border-purple-200"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs text-gray-500">涉及区域</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-600">{activeAreas}</span>
              <span className="text-xs text-gray-400 mb-1">个行政区</span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full transition-all duration-1000"
                style={{ width: `${(activeAreas / areaData.length) * 100}%` }}
              />
            </div>
          </div>

          <div
            onClick={handleUnitClickCard}
            className={clsx(
              "bg-white rounded-xl p-4 border border-gray-100 shadow-sm transition-shadow",
              "cursor-pointer hover:shadow-md hover:border-orange-200"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Timer className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-xs text-gray-500">承办单位</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-orange-600">{unitRank.length}</span>
              <span className="text-xs text-gray-400 mb-1">个部门</span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-1000"
                style={{ width: `${unitRank.length > 0 ? 100 : 0}%` }}
              />
            </div>
          </div>

          <div
            onClick={handleUrgeCountClick}
            className={clsx(
              "bg-white rounded-xl p-4 border border-gray-100 shadow-sm transition-shadow",
              "cursor-pointer hover:shadow-md hover:border-yellow-200"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </div>
              <p className="text-xs text-gray-500">催办次数</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-yellow-600">{urgeCount}</span>
              <span className="text-xs text-gray-400 mb-1">次</span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((urgeCount / (urgeCount + 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
