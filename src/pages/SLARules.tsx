import { useState, useMemo } from 'react';
import {
  Clock,
  Plus,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  RotateCcw,
  Filter,
  Tag,
  Building2,
  ChevronUp,
  ChevronDown,
  Zap
} from 'lucide-react';
import { useSLARuleStore } from '@/store/useSLARuleStore';
import { CATEGORIES, HANDLER_UNITS, TicketCategory, HandlerUnit } from '@/types';
import { clsx } from 'clsx';

interface SLARuleFormData {
  name: string;
  category: TicketCategory | '';
  handlerUnit: HandlerUnit | '';
  deadlineDays: string;
  priority: string;
  enabled: boolean;
  description: string;
}

const initialFormData: SLARuleFormData = {
  name: '',
  category: '',
  handlerUnit: '',
  deadlineDays: '7',
  priority: '50',
  enabled: true,
  description: '',
};

export default function SLARules() {
  const { rules, addRule, updateRule, deleteRule, toggleRule, updatePriority, resetRules } = useSLARuleStore();

  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<TicketCategory | ''>('');
  const [filterUnit, setFilterUnit] = useState<HandlerUnit | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SLARuleFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchName = rule.name.toLowerCase().includes(search);
        const matchDesc = rule.description?.toLowerCase().includes(search) ?? false;
        if (!matchName && !matchDesc) return false;
      }
      if (filterCategory && rule.category !== filterCategory) return false;
      if (filterUnit && rule.handlerUnit !== filterUnit) return false;
      return true;
    }).sort((a, b) => b.priority - a.priority);
  }, [rules, searchText, filterCategory, filterUnit]);

  const enabledCount = useMemo(() => filteredRules.filter(r => r.enabled).length, [filteredRules]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors([]);
    setShowModal(true);
  };

  const handleOpenEdit = (id: string) => {
    const rule = useSLARuleStore.getState().getRuleById(id);
    if (!rule) return;
    setEditingId(id);
    setFormData({
      name: rule.name,
      category: rule.category,
      handlerUnit: rule.handlerUnit,
      deadlineDays: String(rule.deadlineDays),
      priority: String(rule.priority),
      enabled: rule.enabled,
      description: rule.description || '',
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

  const handleFormChange = (field: keyof SLARuleFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  const handleSubmit = () => {
    const deadlineDays = parseInt(formData.deadlineDays) || 7;
    const priority = parseInt(formData.priority) || 0;

    if (editingId) {
      const result = updateRule(editingId, {
        name: formData.name,
        category: formData.category as TicketCategory | '',
        handlerUnit: formData.handlerUnit as HandlerUnit | '',
        deadlineDays,
        priority,
        enabled: formData.enabled,
        description: formData.description,
      });
      if (!result.success) {
        setFormErrors(result.errors);
        return;
      }
    } else {
      const result = addRule({
        name: formData.name,
        category: formData.category as TicketCategory | '',
        handlerUnit: formData.handlerUnit as HandlerUnit | '',
        deadlineDays,
        priority,
        enabled: formData.enabled,
        description: formData.description,
      });
      if (!result.success) {
        setFormErrors(result.errors);
        return;
      }
    }
    handleClose();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条SLA规则吗？')) {
      deleteRule(id);
    }
  };

  const handleToggle = (id: string) => {
    toggleRule(id);
  };

  const handleMovePriority = (id: string, direction: 'up' | 'down') => {
    const sorted = [...rules].sort((a, b) => b.priority - a.priority);
    const index = sorted.findIndex(r => r.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const prevRule = sorted[index - 1];
      const currentPriority = sorted[index].priority;
      const prevPriority = prevRule.priority;
      updatePriority(id, prevPriority);
      updatePriority(prevRule.id, currentPriority);
    } else if (direction === 'down' && index < sorted.length - 1) {
      const nextRule = sorted[index + 1];
      const currentPriority = sorted[index].priority;
      const nextPriority = nextRule.priority;
      updatePriority(id, nextPriority);
      updatePriority(nextRule.id, currentPriority);
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认SLA规则吗？所有自定义规则将丢失。')) {
      resetRules();
    }
  };

  const getScoreColor = (priority: number) => {
    if (priority >= 150) return 'text-red-600';
    if (priority >= 100) return 'text-amber-600';
    return 'text-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <Clock className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">SLA时限规则</h1>
            <p className="text-sm text-gray-500">配置不同诉求类型和承办单位的办理期限，按工作日计算</p>
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
            <span>新增规则</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Clock className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredRules.length}</p>
              <p className="text-sm text-gray-500">规则总数</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <ToggleRight className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{enabledCount}</p>
              <p className="text-sm text-green-500">已启用规则</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">工作日</p>
              <p className="text-sm text-blue-500">计算方式</p>
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
              placeholder="搜索规则名称..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as TicketCategory | '')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">全部诉求类型</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value as HandlerUnit | '')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">全部承办单位</option>
            {HANDLER_UNITS.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rule List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 w-12">
                  优先级
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  规则名称
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  诉求类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  承办单位
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  办理期限
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
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    暂无SLA规则
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule, index) => (
                  <tr key={rule.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-y-1">
                        <button
                          onClick={() => handleMovePriority(rule.id, 'up')}
                          disabled={index === 0}
                          className="p-0.5 text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMovePriority(rule.id, 'down')}
                          disabled={index === filteredRules.length - 1}
                          className="p-0.5 text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <span className={clsx('text-xs font-semibold ml-1', getScoreColor(rule.priority))}>
                          {rule.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                        {rule.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{rule.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {rule.category || '全部类型'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{rule.handlerUnit || '全部单位'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-primary-600">
                        {rule.deadlineDays} 个工作日
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(rule.id)}
                        className="inline-flex items-center"
                      >
                        {rule.enabled ? (
                          <ToggleRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEdit(rule.id)}
                          className="inline-flex items-center p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
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
            共 <span className="font-medium text-gray-900">{filteredRules.length}</span> 条规则
          </p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? '编辑SLA规则' : '新增SLA规则'}
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
                  规则名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="请输入规则名称"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Tag className="inline h-4 w-4 mr-1 text-gray-400" />
                    诉求类型
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">全部类型</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Building2 className="inline h-4 w-4 mr-1 text-gray-400" />
                    承办单位
                  </label>
                  <select
                    value={formData.handlerUnit}
                    onChange={(e) => handleFormChange('handlerUnit', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">全部单位</option>
                    {HANDLER_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Clock className="inline h-4 w-4 mr-1 text-gray-400" />
                    办理期限（工作日）<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.deadlineDays}
                    onChange={(e) => handleFormChange('deadlineDays', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Zap className="inline h-4 w-4 mr-1 text-gray-400" />
                    优先级<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.priority}
                    onChange={(e) => handleFormChange('priority', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  规则描述
                </label>
                <textarea
                  placeholder="请输入规则描述（选填）"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleFormChange('enabled', !formData.enabled)}
                  className={clsx(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                    formData.enabled ? 'bg-green-500' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      formData.enabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  {formData.enabled ? '启用' : '禁用'}规则
                </span>
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
