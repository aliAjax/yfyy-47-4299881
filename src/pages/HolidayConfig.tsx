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
  Briefcase
} from 'lucide-react';
import { useHolidayStore } from '@/store/useHolidayStore';
import type { HolidayType, HolidayConfig as HolidayConfigType } from '@/types';
import { clsx } from 'clsx';

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
  const { holidays, addHoliday, updateHoliday, deleteHoliday, resetHolidays } = useHolidayStore();

  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<HolidayType | ''>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<string[]>([]);

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

  const handleSubmit = () => {
    const year = formData.date ? parseInt(formData.date.split('-')[0]) : new Date().getFullYear();

    if (editingId) {
      const result = updateHoliday(editingId, {
        ...formData,
        year,
      });
      if (!result.success) {
        setFormErrors(result.errors);
        return;
      }
    } else {
      const result = addHoliday({
        ...formData,
        year,
      });
      if (!result.success) {
        setFormErrors(result.errors);
        return;
      }
    }
    handleClose();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条节假日配置吗？')) {
      deleteHoliday(id);
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认节假日配置吗？所有自定义配置将丢失。')) {
      resetHolidays();
    }
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
    </div>
  );
}
