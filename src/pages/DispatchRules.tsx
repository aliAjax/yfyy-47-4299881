import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Plus,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  AlertTriangle,
  Tag,
  MapPin,
  Building2,
  Clock,
  Zap,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Filter,
  FileText,
  BarChart3
} from 'lucide-react';
import { useDispatchRuleStore } from '@/store/useDispatchRuleStore';
import { useTicketStore } from '@/store/useTicketStore';
import { CATEGORIES, AREAS, HANDLER_UNITS, TicketCategory, Area, HandlerUnit } from '@/types';
import { checkRuleConflict } from '@/utils/dispatchRule';
import { clsx } from 'clsx';

interface RuleFormData {
  name: string;
  category: TicketCategory | '';
  area: Area | '';
  keywords: string;
  handlerUnit: HandlerUnit | '';
  deadlineDays: string;
  priority: string;
  enabled: boolean;
  description: string;
}

const initialFormData: RuleFormData = {
  name: '',
  category: '',
  area: '',
  keywords: '',
  handlerUnit: '',
  deadlineDays: '7',
  priority: '50',
  enabled: true,
  description: '',
};

export default function DispatchRules() {
  const navigate = useNavigate();
  const { rules, addRule, updateRule, deleteRule, toggleRule, resetRules } = useDispatchRuleStore();
  const { getTicketCountByRule, getTicketsByRule } = useTicketStore();

  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<TicketCategory | ''>('');
  const [filterUnit, setFilterUnit] = useState<HandlerUnit | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [conflictRules, setConflictRules] = useState<typeof rules>([]);

  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchName = rule.name.toLowerCase().includes(search);
        const matchKeywords = rule.keywords.some(kw => kw.toLowerCase().includes(search));
        const matchDesc = rule.description?.toLowerCase().includes(search) ?? false;
        if (!matchName && !matchKeywords && !matchDesc) return false;
      }
      if (filterCategory && rule.category !== filterCategory) return false;
      if (filterUnit && rule.handlerUnit !== filterUnit) return false;
      return true;
    }).sort((a, b) => b.priority - a.priority);
  }, [rules, searchText, filterCategory, filterUnit]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors([]);
    setConflictRules([]);
    setShowModal(true);
  };

  const handleOpenEdit = (id: string) => {
    const rule = useDispatchRuleStore.getState().getRuleById(id);
    if (!rule) return;
    setEditingId(id);
    setFormData({
      name: rule.name,
      category: rule.category,
      area: rule.area,
      keywords: rule.keywords.join('，'),
      handlerUnit: rule.handlerUnit,
      deadlineDays: String(rule.deadlineDays),
      priority: String(rule.priority),
      enabled: rule.enabled,
      description: rule.description || '',
    });
    setFormErrors([]);
    setConflictRules([]);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors([]);
    setConflictRules([]);
  };

  const handleFormChange = (field: keyof RuleFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  const checkConflicts = (data: RuleFormData) => {
    const testRule = {
      id: editingId || 'temp',
      name: data.name,
      category: data.category,
      area: data.area,
      keywords: data.keywords.split(/[，,、\s]+/).filter(Boolean),
      handlerUnit: data.handlerUnit as HandlerUnit,
      deadlineDays: parseInt(data.deadlineDays) || 7,
      priority: parseInt(data.priority) || 50,
      enabled: data.enabled,
      description: data.description,
      createTime: '',
      updateTime: '',
    };
    const conflicts = checkRuleConflict(rules, testRule, editingId || undefined);
    setConflictRules(conflicts);
  };

  const handleSubmit = () => {
    const keywordList = formData.keywords.split(/[，,、\s]+/).filter(Boolean);

    if (editingId) {
      const result = updateRule(editingId, {
        name: formData.name,
        category: formData.category as TicketCategory | '',
        area: formData.area as Area | '',
        keywords: keywordList,
        handlerUnit: formData.handlerUnit as HandlerUnit,
        deadlineDays: parseInt(formData.deadlineDays) || 7,
        priority: parseInt(formData.priority) || 50,
        enabled: formData.enabled,
        description: formData.description,
      });
      if (!result.success) {
        setFormErrors(result.errors);
        checkConflicts(formData);
        return;
      }
    } else {
      const result = addRule({
        name: formData.name,
        category: formData.category as TicketCategory | '',
        area: formData.area as Area | '',
        keywords: keywordList,
        handlerUnit: formData.handlerUnit as HandlerUnit,
        deadlineDays: parseInt(formData.deadlineDays) || 7,
        priority: parseInt(formData.priority) || 50,
        enabled: formData.enabled,
        description: formData.description,
      });
      if (!result.success) {
        setFormErrors(result.errors);
        checkConflicts(formData);
        return;
      }
    }
    handleClose();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条规则吗？')) {
      deleteRule(id);
    }
  };

  const handleMovePriority = (id: string, direction: 'up' | 'down') => {
    const sorted = [...rules].sort((a, b) => b.priority - a.priority);
    const index = sorted.findIndex(r => r.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const prev = sorted[index - 1];
      const current = sorted[index];
      const tempPriority = prev.priority;
      useDispatchRuleStore.getState().updatePriority(prev.id, current.priority);
      useDispatchRuleStore.getState().updatePriority(current.id, tempPriority);
    } else if (direction === 'down' && index < sorted.length - 1) {
      const next = sorted[index + 1];
      const current = sorted[index];
      const tempPriority = next.priority;
      useDispatchRuleStore.getState().updatePriority(next.id, current.priority);
      useDispatchRuleStore.getState().updatePriority(current.id, tempPriority);
    }
  };

  const stats = useMemo(() => {
    const dispatchedCount = rules.reduce((sum, rule) => sum + getTicketCountByRule(rule.id), 0);
    return {
      total: rules.length,
      enabled: rules.filter(r => r.enabled).length,
      disabled: rules.filter(r => !r.enabled).length,
      dispatched: dispatchedCount,
    };
  }, [rules, getTicketCountByRule]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
            <Settings className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">分派规则管理</h1>
            <p className="text-sm text-gray-500">配置工单智能分派规则，提升派单效率</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (confirm('确定要重置所有规则为默认值吗？')) {
                resetRules();
              }
            }}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>重置规则</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>新增规则</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">规则总数</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已启用</p>
              <p className="mt-1 text-2xl font-semibold text-green-600">{stats.enabled}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <ToggleRight className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已停用</p>
              <p className="mt-1 text-2xl font-semibold text-gray-500">{stats.disabled}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
              <ToggleLeft className="h-6 w-6 text-gray-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">累计分派工单</p>
              <p className="mt-1 text-2xl font-semibold text-violet-600">{stats.dispatched}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
              <BarChart3 className="h-6 w-6 text-violet-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索规则名称、关键词..."
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as TicketCategory | '')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
            >
              <option value="">全部类型</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value as HandlerUnit | '')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
            >
              <option value="">全部承办单位</option>
              {HANDLER_UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">
            共 {filteredRules.length} 条规则
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredRules.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Settings className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">暂无匹配的分派规则</p>
            </div>
          ) : (
            filteredRules.map((rule, index) => (
              <div
                key={rule.id}
                className={clsx(
                  'px-6 py-4 hover:bg-gray-50 transition-colors',
                  !rule.enabled && 'bg-gray-50/50 opacity-60'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h4 className={clsx(
                        'text-sm font-medium',
                        rule.enabled ? 'text-gray-900' : 'text-gray-500'
                      )}>
                        {rule.name}
                      </h4>
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        rule.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      )}>
                        {rule.enabled ? '启用' : '停用'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700">
                        优先级 {rule.priority}
                      </span>
                    </div>
                    {rule.description && (
                      <p className="mt-1 text-xs text-gray-500">{rule.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {rule.category && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-blue-50 text-xs text-blue-700">
                          <Tag className="h-3 w-3" />
                          <span>{rule.category}</span>
                        </span>
                      )}
                      {rule.area && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-purple-50 text-xs text-purple-700">
                          <MapPin className="h-3 w-3" />
                          <span>{rule.area}</span>
                        </span>
                      )}
                      {rule.keywords.length > 0 && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-amber-50 text-xs text-amber-700">
                          <Zap className="h-3 w-3" />
                          <span>关键词: {rule.keywords.join('、')}</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                      <span className="inline-flex items-center space-x-1">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>承办: {rule.handlerUnit}</span>
                      </span>
                      <span className="inline-flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>期限: {rule.deadlineDays} 天</span>
                      </span>
                      {(() => {
                        const count = getTicketCountByRule(rule.id);
                        return count > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedRuleId(rule.id);
                            }}
                            className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-700 transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>已分派 {count} 单 →</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-gray-400">
                            <FileText className="h-3.5 w-3.5" />
                            <span>未使用</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => handleMovePriority(rule.id, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="提高优先级"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMovePriority(rule.id, 'down')}
                      disabled={index === filteredRules.length - 1}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="降低优先级"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title={rule.enabled ? '停用规则' : '启用规则'}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(rule.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="编辑规则"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="删除规则"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? '编辑规则' : '新增规则'}
              </h3>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {formErrors.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">请修正以下问题</p>
                      <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                        {formErrors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {conflictRules.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">检测到潜在冲突规则</p>
                      <p className="mt-1 text-sm text-amber-700">
                        以下规则可能与当前规则存在分派冲突，请确认：
                      </p>
                      <ul className="mt-2 space-y-1">
                        {conflictRules.map(r => (
                          <li key={r.id} className="text-sm text-amber-700">
                            • {r.name} → {r.handlerUnit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  规则名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="例如：城市管理-东城区-路灯问题"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Tag className="inline h-4 w-4 mr-1 text-gray-400" />
                    诉求类型
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  >
                    <option value="">不限</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <MapPin className="inline h-4 w-4 mr-1 text-gray-400" />
                    所属区域
                  </label>
                  <select
                    value={formData.area}
                    onChange={(e) => handleFormChange('area', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  >
                    <option value="">不限</option>
                    {AREAS.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Zap className="inline h-4 w-4 mr-1 text-gray-400" />
                  关键词
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => handleFormChange('keywords', e.target.value)}
                  placeholder="多个关键词用逗号或空格分隔，如：路灯,照明,灯不亮"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
                <p className="mt-1 text-xs text-gray-500">
                  当工单标题或内容包含任一关键词时，此规则将被触发
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Building2 className="inline h-4 w-4 mr-1 text-gray-400" />
                    承办单位 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.handlerUnit}
                    onChange={(e) => handleFormChange('handlerUnit', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  >
                    <option value="">请选择承办单位</option>
                    {HANDLER_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Clock className="inline h-4 w-4 mr-1 text-gray-400" />
                    办理期限（天）
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.deadlineDays}
                    onChange={(e) => handleFormChange('deadlineDays', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  优先级
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => handleFormChange('priority', e.target.value)}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <span className="text-sm font-medium text-gray-700 w-12 text-right">
                    {formData.priority}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  优先级越高，匹配得分越高，越容易被推荐
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  规则描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="可选，填写规则的使用说明或备注"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleFormChange('enabled', !formData.enabled)}
                  className={clsx(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    formData.enabled ? 'bg-primary-600' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      formData.enabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  {formData.enabled ? '规则已启用' : '规则已停用'}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingId ? '保存修改' : '创建规则'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Ticket List Modal */}
      {selectedRuleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedRuleId(null)} />
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {useDispatchRuleStore.getState().getRuleById(selectedRuleId)?.name || '规则'}
                </h3>
                <p className="text-sm text-gray-500">使用该规则分派的工单</p>
              </div>
              <button
                onClick={() => setSelectedRuleId(null)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {(() => {
                const tickets = getTicketsByRule(selectedRuleId);
                if (tickets.length === 0) {
                  return (
                    <div className="py-12 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">暂无使用该规则的工单</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {tickets.map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                        className="rounded-lg border border-gray-200 p-4 hover:border-primary-300 hover:bg-primary-50/30 cursor-pointer transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-400 font-mono">{ticket.id}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
                                {ticket.category}
                              </span>
                            </div>
                            <h4 className="mt-1 text-sm font-medium text-gray-900 truncate">
                              {ticket.title}
                            </h4>
                            <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
                              <span>{ticket.area}</span>
                              <span>·</span>
                              <span>{ticket.handlerUnit}</span>
                              <span>·</span>
                              <span>{ticket.assignTime}</span>
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <span className={clsx(
                              'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                              ticket.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : ticket.status === 'processing'
                                  ? 'bg-blue-100 text-blue-700'
                                  : ticket.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : ticket.status === 'overdue'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-orange-100 text-orange-700'
                            )}>
                              {ticket.status === 'pending' && '待办理'}
                              {ticket.status === 'processing' && '办理中'}
                              {ticket.status === 'completed' && '已完成'}
                              {ticket.status === 'overdue' && '已超期'}
                              {ticket.status === 'returned' && '已退回'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          {(() => {
                            const matchInfo = ticket.dispatchInfo?.matchedRules?.find(
                              m => m.ruleId === selectedRuleId
                            );
                            return matchInfo ? (
                              <p className="text-xs text-gray-500">
                                匹配得分：<span className="font-medium text-primary-600">{matchInfo.score} 分</span>
                                {matchInfo.matchedKeywords.length > 0 && (
                                  <span className="ml-2">
                                    命中关键词：{matchInfo.matchedKeywords.join('、')}
                                  </span>
                                )}
                              </p>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedRuleId(null)}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
