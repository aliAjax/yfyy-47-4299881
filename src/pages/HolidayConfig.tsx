import { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Save,
  RotateCcw,
  Filter,
  CalendarClock,
  Sun,
  Briefcase,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert,
  Shield,
  ShieldCheck,
  History,
  CheckSquare,
  Square
} from 'lucide-react';
import { useHolidayStore } from '@/store/useHolidayStore';
import { useTicketStore } from '@/store/useTicketStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { HolidayType, RiskLevel, ImpactSeverity, HolidayChangeType } from '@/types';
import { calculateHolidayImpactPreview, type HolidayImpactPreview } from '@/utils/workday';
import { clsx } from 'clsx';

type PendingAction =
  | { type: 'add'; data: Omit<import('@/types').HolidayConfig, 'id' | 'createTime' | 'updateTime'> }
  | { type: 'update'; id: string; data: Partial<import('@/types').HolidayConfig> }
  | { type: 'delete'; id: string }
  | { type: 'reset' };

interface HolidayFormData {
  date: string;
  name: string;
  type: HolidayType;
}

const initialFormData: HolidayFormData = {
  date: '',
  name: '',
  type: 'holiday',
};

export default function HolidayConfig() {
  const { holidays, addHoliday, updateHoliday, deleteHoliday, resetHolidays, getHolidayDatesByType, addChangeRecord } = useHolidayStore();
  const { tickets } = useTicketStore();
  const { refreshOverdueNotifications } = useNotificationStore();

  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<HolidayType | ''>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showImpactPreview, setShowImpactPreview] = useState(false);
  const [impactPreview, setImpactPreview] = useState<HolidayImpactPreview | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [strongConfirmChecked, setStrongConfirmChecked] = useState(false);
  const [historicalTabActive, setHistoricalTabActive] = useState(false);

  const years = useMemo(() => {
    const yearSet = new Set(holidays.map(h => h.year));
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [holidays]);

  const filteredHolidays = useMemo(() => {
    return holidays.filter(h => {
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchName = h.name.toLowerCase().includes(search);
        const matchDate = h.date.includes(search);
        if (!matchName && !matchDate) return false;
      }
      if (filterType && h.type !== filterType) return false;
      if (filterYear && String(h.year) !== filterYear) return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, searchText, filterType, filterYear]);

  const holidayCount = useMemo(() => filteredHolidays.filter(h => h.type === 'holiday').length, [filteredHolidays]);
  const workdayCount = useMemo(() => filteredHolidays.filter(h => h.type === 'workday').length, [filteredHolidays]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors([]);
    setShowModal(true);
  };

  const handleOpenEdit = (id: string) => {
    const holiday = useHolidayStore.getState().holidays.find(h => h.id === id);
    if (!holiday) return;
    setEditingId(id);
    setFormData({
      date: holiday.date,
      name: holiday.name,
      type: holiday.type,
    });
    setFormErrors([]);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors([]);
  };

  const handleFormChange = (field: keyof HolidayFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  const simulateNewHolidayDates = (action: PendingAction): { holidayDates: string[]; workdayDates: string[] } => {
    let simulatedHolidays = [...holidays];

    switch (action.type) {
      case 'add':
        simulatedHolidays = [
          {
            ...action.data,
            id: 'temp',
            createTime: '',
            updateTime: '',
          } as import('@/types').HolidayConfig,
          ...simulatedHolidays,
        ];
        break;
      case 'update':
        simulatedHolidays = simulatedHolidays.map(h =>
          h.id === action.id ? { ...h, ...action.data } : h
        );
        break;
      case 'delete':
        simulatedHolidays = simulatedHolidays.filter(h => h.id !== action.id);
        break;
      case 'reset':
        simulatedHolidays = [];
        break;
    }

    return {
      holidayDates: simulatedHolidays.filter(h => h.type === 'holiday').map(h => h.date),
      workdayDates: simulatedHolidays.filter(h => h.type === 'workday').map(h => h.date),
    };
  };

  const getSeverityBadge = (severity: ImpactSeverity) => {
    const map: Record<ImpactSeverity, { label: string; bg: string; text: string; border: string; icon: typeof Shield }> = {
      low: { label: '低影响', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: ShieldCheck },
      medium: { label: '中等影响', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: ShieldAlert },
      high: { label: '高影响', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle },
      critical: { label: '严重影响', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
    };
    return map[severity];
  };

  const getChangeDescription = (action: PendingAction): string => {
    switch (action.type) {
      case 'add': return `添加节假日：${action.data.name} (${action.data.date})`;
      case 'update': return `更新节假日配置 (${action.id})`;
      case 'delete': return `删除节假日配置 (${action.id})`;
      case 'reset': return '重置为默认节假日配置';
    }
  };

  const showImpactPreviewForAction = (action: PendingAction) => {
    const oldHolidayDates = getHolidayDatesByType('holiday');
    const oldWorkdayDates = getHolidayDatesByType('workday');
    const { holidayDates: newHolidayDates, workdayDates: newWorkdayDates } = simulateNewHolidayDates(action);

    const preview = calculateHolidayImpactPreview(
      tickets,
      oldHolidayDates,
      oldWorkdayDates,
      newHolidayDates,
      newWorkdayDates
    );

    setPendingAction(action);
    setImpactPreview(preview);
    setStrongConfirmChecked(false);
    setHistoricalTabActive(false);
    setShowImpactPreview(true);
  };

  const executePendingAction = () => {
    if (!pendingAction || !impactPreview) return;

    if (impactPreview.requiresStrongConfirmation && !strongConfirmChecked) {
      return;
    }

    const oldHolidayDates = getHolidayDatesByType('holiday');
    const oldWorkdayDates = getHolidayDatesByType('workday');

    switch (pendingAction.type) {
      case 'add':
        addHoliday(pendingAction.data);
        break;
      case 'update':
        updateHoliday(pendingAction.id, pendingAction.data);
        break;
      case 'delete':
        deleteHoliday(pendingAction.id);
        break;
      case 'reset':
        resetHolidays();
        break;
    }

    const { invalidated, created } = refreshOverdueNotifications();

    const newHolidayDates = getHolidayDatesByType('holiday');
    const newWorkdayDates = getHolidayDatesByType('workday');

    addChangeRecord({
      changeType: pendingAction.type as HolidayChangeType,
      changeDescription: getChangeDescription(pendingAction),
      oldHolidayDates,
      oldWorkdayDates,
      newHolidayDates,
      newWorkdayDates,
      affectedOpenTickets: impactPreview.totalAffected,
      affectedHistoricalTickets: impactPreview.historicalAffected,
      newlyOverdue: impactPreview.newlyOverdue,
      noLongerOverdue: impactPreview.noLongerOverdue,
      riskElevated: impactPreview.riskElevated,
      riskReduced: impactPreview.riskReduced,
      notificationsCreated: created,
      notificationsInvalidated: invalidated,
      operator: '李督办',
    });

    setShowImpactPreview(false);
    setImpactPreview(null);
    setPendingAction(null);
    setStrongConfirmChecked(false);
    setHistoricalTabActive(false);
    setShowModal(false);
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors([]);
  };

  const cancelImpactPreview = () => {
    setShowImpactPreview(false);
    setImpactPreview(null);
    setPendingAction(null);
    setStrongConfirmChecked(false);
    setHistoricalTabActive(false);
  };

  const handleSubmit = () => {
    const year = formData.date ? parseInt(formData.date.split('-')[0]) : new Date().getFullYear();

    if (editingId) {
      const existingHoliday = useHolidayStore.getState().holidays.find(h => h.id === editingId);
      const updatedHoliday = { ...existingHoliday, ...formData, year };
      const errors: string[] = [];
      if (!updatedHoliday.date) errors.push('请选择日期');
      if (!updatedHoliday.name?.trim()) errors.push('请输入节假日名称');
      if (!updatedHoliday.type) errors.push('请选择类型');
      if (errors.length > 0) {
        setFormErrors(errors);
        return;
      }
      if (formData.date && formData.date !== existingHoliday?.date) {
        const duplicate = useHolidayStore.getState().holidays.find(h => h.date === formData.date && h.id !== editingId);
        if (duplicate) {
          setFormErrors(['该日期已存在配置']);
          return;
        }
      }
      showImpactPreviewForAction({
        type: 'update',
        id: editingId,
        data: { ...formData, year },
      });
    } else {
      const errors: string[] = [];
      if (!formData.date) errors.push('请选择日期');
      if (!formData.name?.trim()) errors.push('请输入节假日名称');
      if (!formData.type) errors.push('请选择类型');
      if (errors.length > 0) {
        setFormErrors(errors);
        return;
      }
      const existing = useHolidayStore.getState().getHolidayByDate(formData.date);
      if (existing) {
        setFormErrors(['该日期已存在配置']);
        return;
      }
      showImpactPreviewForAction({
        type: 'add',
        data: { ...formData, year },
      });
    }
  };

  const handleDelete = (id: string) => {
    showImpactPreviewForAction({ type: 'delete', id });
  };

  const handleReset = () => {
    showImpactPreviewForAction({ type: 'reset' });
  };

  const getRiskLabel = (level: RiskLevel) => {
    switch (level) {
      case 'high': return '高风险';
      case 'medium': return '中风险';
      case 'low': return '低风险';
    }
  };

  const getRiskBadgeClass = (level: RiskLevel) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-green-100 text-green-700';
    }
  };

  const formatWorkdaysChange = (change: number) => {
    if (change > 0) return `+${change}个工作日`;
    if (change < 0) return `${change}个工作日`;
    return '无变化';
  };

  const getTypeLabel = (type: HolidayType) => {
    return type === 'holiday' ? '放假' : '上班';
  };

  const getTypeBadgeClass = (type: HolidayType) => {
    return type === 'holiday'
      ? 'bg-red-100 text-red-700'
      : 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <CalendarClock className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">节假日配置</h1>
            <p className="text-sm text-gray-500">管理法定节假日和调休上班日，用于工作日计算</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>重置默认</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>添加配置</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredHolidays.length}</p>
              <p className="text-sm text-gray-500">总配置数</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <Sun className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{holidayCount}</p>
              <p className="text-sm text-red-500">放假天数</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{workdayCount}</p>
              <p className="text-sm text-blue-500">调休上班</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">筛选：</span>
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索日期或名称..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">全部年份</option>
            {years.map(year => (
              <option key={year} value={String(year)}>{year}年</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as HolidayType | '')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">全部类型</option>
            <option value="holiday">放假</option>
            <option value="workday">调休上班</option>
          </select>
        </div>
      </div>

      {/* Holiday List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  日期
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  名称
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  年份
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    暂无节假日配置
                  </td>
                </tr>
              ) : (
                filteredHolidays.map((holiday) => (
                  <tr key={holiday.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-gray-900">{holiday.date}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{holiday.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        getTypeBadgeClass(holiday.type)
                      )}>
                        {getTypeLabel(holiday.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{holiday.year}年</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEdit(holiday.id)}
                          className="inline-flex items-center p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(holiday.id)}
                          className="inline-flex items-center p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-900">{filteredHolidays.length}</span> 条配置
          </p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? '编辑节假日配置' : '添加节假日配置'}
              </h3>
              <button
                onClick={handleClose}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formErrors.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <ul className="text-sm text-red-600 space-y-1">
                    {formErrors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：元旦、春节、劳动节调休上班等"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  类型 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleFormChange('type', 'holiday')}
                    className={clsx(
                      'flex items-center justify-center space-x-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                      formData.type === 'holiday'
                        ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500/20'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Sun className="h-4 w-4" />
                    <span>放假</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormChange('type', 'workday')}
                    className={clsx(
                      'flex items-center justify-center space-x-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                      formData.type === 'workday'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Briefcase className="h-4 w-4" />
                    <span>调休上班</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="inline-flex items-center space-x-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>保存</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impact Preview Modal */}
      {showImpactPreview && impactPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-xl bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  getSeverityBadge(impactPreview.severity).bg,
                  getSeverityBadge(impactPreview.severity).border,
                  'border'
                )}>
                  {(() => {
                    const Icon = getSeverityBadge(impactPreview.severity).icon;
                    return <Icon className={clsx('h-5 w-5', getSeverityBadge(impactPreview.severity).text)} />;
                  })()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900">节假日配置变更影响预览</h3>
                    <span className={clsx(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                      getSeverityBadge(impactPreview.severity).bg,
                      getSeverityBadge(impactPreview.severity).text,
                      getSeverityBadge(impactPreview.severity).border
                    )}>
                      {getSeverityBadge(impactPreview.severity).label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {pendingAction?.type === 'add' && '即将添加节假日配置'}
                    {pendingAction?.type === 'update' && '即将更新节假日配置'}
                    {pendingAction?.type === 'delete' && '即将删除节假日配置'}
                    {pendingAction?.type === 'reset' && '即将重置为默认节假日配置'}
                    {impactPreview.historicalAffected > 0 && ` · 同时影响 ${impactPreview.historicalAffected} 个历史工单`}
                  </p>
                </div>
              </div>
              <button
                onClick={cancelImpactPreview}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {impactPreview.requiresStrongConfirmation && impactPreview.strongConfirmationReason && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">{impactPreview.strongConfirmationReason}</p>
                      <label className="mt-3 flex items-start space-x-2 cursor-pointer">
                        <button
                          type="button"
                          onClick={() => setStrongConfirmChecked(!strongConfirmChecked)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {strongConfirmChecked ? (
                            <CheckSquare className="h-5 w-5 text-red-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <span className="text-sm text-red-700">
                          我已仔细阅读并理解本次变更将对 {impactPreview.totalAffected} 个未办结工单造成影响，
                          其中 {impactPreview.newlyOverdue} 个工单将变为超期，{impactPreview.riskElevated} 个工单风险等级将升高。
                          确认继续执行此变更。
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {impactPreview.totalAffected === 0 && impactPreview.historicalAffected === 0 ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-medium text-green-800">本次变更未影响任何工单</p>
                  <p className="text-sm text-green-600 mt-1">所有工单的剩余工作日、风险等级和超期状态均保持不变</p>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center space-x-2 text-gray-600 mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-medium">未办结工单</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{impactPreview.totalAffected}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center space-x-2 text-slate-600 mb-1">
                        <History className="h-4 w-4" />
                        <span className="text-xs font-medium">历史工单</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-700">{impactPreview.historicalAffected}</p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-center space-x-2 text-red-600 mb-1">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-xs font-medium">工作日减少</span>
                      </div>
                      <p className="text-2xl font-bold text-red-700">{impactPreview.workdaysDecreased}</p>
                    </div>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center space-x-2 text-green-600 mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-medium">工作日增加</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">{impactPreview.workdaysIncreased}</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center space-x-2 text-amber-600 mb-1">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">风险/超期变化</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-700">
                        {impactPreview.riskElevated + impactPreview.newlyOverdue}
                      </p>
                    </div>
                  </div>

                  {/* Change Breakdown */}
                  {(impactPreview.newlyOverdue > 0 || impactPreview.noLongerOverdue > 0 || impactPreview.riskElevated > 0 || impactPreview.riskReduced > 0) && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">变化明细：</p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        {impactPreview.newlyOverdue > 0 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                            {impactPreview.newlyOverdue} 个变为超期
                          </span>
                        )}
                        {impactPreview.noLongerOverdue > 0 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            {impactPreview.noLongerOverdue} 个解除超期
                          </span>
                        )}
                        {impactPreview.riskElevated > 0 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                            <TrendingDown className="h-3.5 w-3.5 mr-1" />
                            {impactPreview.riskElevated} 个风险等级升高
                          </span>
                        )}
                        {impactPreview.riskReduced > 0 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-100 text-teal-700">
                            <TrendingUp className="h-3.5 w-3.5 mr-1" />
                            {impactPreview.riskReduced} 个风险等级降低
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="border-b border-gray-200">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setHistoricalTabActive(false)}
                        className={clsx(
                          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                          !historicalTabActive
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        )}
                      >
                        未办结工单（{impactPreview.affectedTickets.length}）
                      </button>
                      <button
                        onClick={() => setHistoricalTabActive(true)}
                        className={clsx(
                          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                          historicalTabActive
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        )}
                      >
                        <History className="inline h-4 w-4 mr-1" />
                        历史工单（{impactPreview.historicalTickets.length}）
                      </button>
                    </div>
                  </div>

                  {/* Affected Tickets List */}
                  <div>
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="max-h-80 overflow-y-auto">
                        {!historicalTabActive ? (
                          impactPreview.affectedTickets.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                              本次变更未影响任何未办结工单
                            </div>
                          ) : (
                            <table className="w-full">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr className="border-b border-gray-200">
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    工单信息
                                  </th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    剩余工作日
                                  </th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    风险等级
                                  </th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    超期状态
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {impactPreview.affectedTickets.map((item, idx) => (
                                  <tr key={`${item.ticketId}-${idx}`} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 py-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-xs font-mono text-gray-400">{item.ticketId}</span>
                                          {item.isCoOrg && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">
                                              协办
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.ticketTitle}</p>
                                        <p className="text-xs text-gray-500">
                                          {item.isCoOrg ? `协办单位：${item.coOrgUnit}` : `承办单位：${item.handlerUnit}`}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          <Clock className="inline h-3 w-3 mr-0.5" />
                                          期限：{item.isCoOrg ? item.coOrgDeadline : item.deadline}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex items-center space-x-2">
                                        <span className={clsx(
                                          'text-sm font-medium',
                                          item.oldRemainingWorkdays < 0 ? 'text-red-600' : 'text-gray-700'
                                        )}>
                                          {item.oldRemainingWorkdays < 0
                                            ? `超期${Math.abs(item.oldRemainingWorkdays)}天`
                                            : item.oldRemainingWorkdays === 0
                                              ? '今天到期'
                                              : `${item.oldRemainingWorkdays}天`}
                                        </span>
                                        <ArrowRight className={clsx(
                                          'h-3.5 w-3.5 flex-shrink-0',
                                          item.workdaysChange < 0 ? 'text-red-500' : item.workdaysChange > 0 ? 'text-green-500' : 'text-gray-400'
                                        )} />
                                        <span className={clsx(
                                          'text-sm font-medium',
                                          item.newRemainingWorkdays < 0 ? 'text-red-600' : 'text-gray-700'
                                        )}>
                                          {item.newRemainingWorkdays < 0
                                            ? `超期${Math.abs(item.newRemainingWorkdays)}天`
                                            : item.newRemainingWorkdays === 0
                                              ? '今天到期'
                                              : `${item.newRemainingWorkdays}天`}
                                        </span>
                                        {item.workdaysChange !== 0 && (
                                          <span className={clsx(
                                            'text-xs px-1.5 py-0.5 rounded',
                                            item.workdaysChange < 0
                                              ? 'bg-red-100 text-red-600'
                                              : 'bg-green-100 text-green-600'
                                          )}>
                                            {formatWorkdaysChange(item.workdaysChange)}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        ) : (
                          impactPreview.historicalTickets.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                              本次变更未影响任何历史工单
                            </div>
                          ) : (
                            <table className="w-full">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr className="border-b border-gray-200">
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    工单信息
                                  </th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    剩余工作日
                                  </th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    风险等级
                                  </th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    超期状态
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {impactPreview.historicalTickets.map((item, idx) => (
                                  <tr key={`hist-${item.ticketId}-${idx}`} className="hover:bg-gray-50 transition-colors bg-slate-50/50">
                                    <td className="px-3 py-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-xs font-mono text-gray-400">{item.ticketId}</span>
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-200 text-slate-600">
                                            历史
                                          </span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.ticketTitle}</p>
                                        <p className="text-xs text-gray-500">
                                          承办单位：{item.handlerUnit}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          <Clock className="inline h-3 w-3 mr-0.5" />
                                          期限：{item.deadline}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex items-center space-x-2">
                                        <span className={clsx(
                                          'text-sm font-medium',
                                          item.oldRemainingWorkdays < 0 ? 'text-red-600' : 'text-gray-700'
                                        )}>
                                          {item.oldRemainingWorkdays < 0
                                            ? `超期${Math.abs(item.oldRemainingWorkdays)}天`
                                            : item.oldRemainingWorkdays === 0
                                              ? '今天到期'
                                              : `${item.oldRemainingWorkdays}天`}
                                        </span>
                                        <ArrowRight className={clsx(
                                          'h-3.5 w-3.5 flex-shrink-0',
                                          item.workdaysChange < 0 ? 'text-red-500' : item.workdaysChange > 0 ? 'text-green-500' : 'text-gray-400'
                                        )} />
                                        <span className={clsx(
                                          'text-sm font-medium',
                                          item.newRemainingWorkdays < 0 ? 'text-red-600' : 'text-gray-700'
                                        )}>
                                          {item.newRemainingWorkdays < 0
                                            ? `超期${Math.abs(item.newRemainingWorkdays)}天`
                                            : item.newRemainingWorkdays === 0
                                              ? '今天到期'
                                              : `${item.newRemainingWorkdays}天`}
                                        </span>
                                        {item.workdaysChange !== 0 && (
                                          <span className={clsx(
                                            'text-xs px-1.5 py-0.5 rounded',
                                            item.workdaysChange < 0
                                              ? 'bg-red-100 text-red-600'
                                              : 'bg-green-100 text-green-600'
                                          )}>
                                            {formatWorkdaysChange(item.workdaysChange)}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex items-center space-x-2">
                                        <span className={clsx(
                                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium opacity-70',
                                          getRiskBadgeClass(item.oldRiskLevel)
                                        )}>
                                          {getRiskLabel(item.oldRiskLevel)}
                                        </span>
                                        <ArrowRight className={clsx(
                                          'h-3.5 w-3.5 flex-shrink-0',
                                          item.riskLevelChanged ? 'text-amber-500' : 'text-gray-300'
                                        )} />
                                        <span className={clsx(
                                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium opacity-70',
                                          getRiskBadgeClass(item.newRiskLevel)
                                        )}>
                                          {getRiskLabel(item.newRiskLevel)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex items-center space-x-2">
                                        <span className={clsx(
                                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium opacity-70',
                                          item.oldIsOverdue
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-100 text-gray-600'
                                        )}>
                                          {item.oldIsOverdue ? '已超期' : '未超期'}
                                        </span>
                                        <ArrowRight className={clsx(
                                          'h-3.5 w-3.5 flex-shrink-0',
                                          item.overdueStatusChanged ? (item.newIsOverdue ? 'text-red-500' : 'text-green-500') : 'text-gray-300'
                                        )} />
                                        <span className={clsx(
                                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium opacity-70',
                                          item.newIsOverdue
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-100 text-gray-600'
                                        )}>
                                          {item.newIsOverdue ? '已超期' : '未超期'}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="mb-3 space-y-1">
                <p className="text-xs font-medium text-gray-700">
                  确认后将执行以下操作：
                </p>
                <ul className="text-xs text-gray-500 space-y-0.5 list-disc list-inside">
                  <li>保存节假日配置变更</li>
                  <li>清理过时的超期风险通知（基于旧配置的通知）</li>
                  <li>重新生成基于新配置的超期风险通知</li>
                  <li>刷新所有工单的风险等级和超期状态判断</li>
                  <li>记录本次变更操作日志（包含影响范围统计）</li>
                </ul>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  本次将影响 <span className="font-medium text-gray-600">{impactPreview.totalAffected}</span> 个未办结工单
                  {impactPreview.historicalAffected > 0 && (
                    <> 和 <span className="font-medium text-gray-600">{impactPreview.historicalAffected}</span> 个历史工单</>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={cancelImpactPreview}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={executePendingAction}
                    disabled={impactPreview.requiresStrongConfirmation && !strongConfirmChecked}
                    className={clsx(
                      'inline-flex items-center space-x-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                      impactPreview.requiresStrongConfirmation && !strongConfirmChecked
                        ? 'bg-gray-400 cursor-not-allowed'
                        : impactPreview.severity === 'critical'
                          ? 'bg-red-600 hover:bg-red-700'
                          : impactPreview.severity === 'high'
                            ? 'bg-orange-600 hover:bg-orange-700'
                            : impactPreview.totalAffected === 0 && impactPreview.historicalAffected === 0
                              ? 'bg-primary-600 hover:bg-primary-700'
                              : 'bg-amber-600 hover:bg-amber-700'
                    )}
                  >
                    <Save className="h-4 w-4" />
                    <span>
                      {impactPreview.requiresStrongConfirmation && !strongConfirmChecked
                        ? '请先勾选确认'
                        : impactPreview.totalAffected === 0 && impactPreview.historicalAffected === 0
                          ? '确认保存'
                          : `确认保存并应用变更（影响 ${impactPreview.totalAffected + impactPreview.historicalAffected} 个工单）`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
