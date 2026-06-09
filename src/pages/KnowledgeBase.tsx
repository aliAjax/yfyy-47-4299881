import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Edit2,
  Filter,
  Flame,
  Plus,
  RotateCcw,
  Save,
  Search,
  Tag,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useKnowledgeBaseStore } from '@/store/useKnowledgeBaseStore';
import { CATEGORIES, HANDLER_UNITS, HandlerUnit, TicketCategory } from '@/types';
import { clsx } from 'clsx';

type KnowledgeSortMode = 'updated' | 'useCount' | 'lastUsed';

interface KnowledgeFormData {
  title: string;
  category: TicketCategory | '';
  keywords: string;
  handlerUnit: HandlerUnit | '';
  replyTemplate: string;
  handlingPoints: string;
  enabled: boolean;
}

const initialFormData: KnowledgeFormData = {
  title: '',
  category: '',
  keywords: '',
  handlerUnit: '',
  replyTemplate: '',
  handlingPoints: '',
  enabled: true,
};

function splitList(value: string) {
  return value.split(/[，,、\n]+/).map(item => item.trim()).filter(Boolean);
}

function getTimeValue(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

function formatLastUsed(value?: string) {
  return value || '未使用';
}

export default function KnowledgeBase() {
  const { entries, addEntry, updateEntry, deleteEntry, toggleEntry, resetEntries } = useKnowledgeBaseStore();

  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<TicketCategory | ''>('');
  const [filterUnit, setFilterUnit] = useState<HandlerUnit | ''>('');
  const [sortMode, setSortMode] = useState<KnowledgeSortMode>('useCount');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<KnowledgeFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchesText =
          entry.title.toLowerCase().includes(search) ||
          entry.keywords.some(keyword => keyword.toLowerCase().includes(search)) ||
          entry.replyTemplate.toLowerCase().includes(search) ||
          entry.handlingPoints.some(point => point.toLowerCase().includes(search));
        if (!matchesText) return false;
      }
      if (filterCategory && entry.category !== filterCategory) return false;
      if (filterUnit && entry.handlerUnit !== filterUnit) return false;
      return true;
    }).sort((a, b) => {
      const enabledSort = Number(b.enabled) - Number(a.enabled);
      if (enabledSort !== 0) return enabledSort;

      if (sortMode === 'useCount') {
        return (b.useCount ?? 0) - (a.useCount ?? 0) || getTimeValue(b.lastUsedTime) - getTimeValue(a.lastUsedTime);
      }
      if (sortMode === 'lastUsed') {
        return getTimeValue(b.lastUsedTime) - getTimeValue(a.lastUsedTime) || (b.useCount ?? 0) - (a.useCount ?? 0);
      }
      return new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime();
    });
  }, [entries, filterCategory, filterUnit, searchText, sortMode]);

  const hotEntries = useMemo(
    () => [...entries]
      .filter(entry => (entry.useCount ?? 0) > 0)
      .sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0) || getTimeValue(b.lastUsedTime) - getTimeValue(a.lastUsedTime))
      .slice(0, 5),
    [entries]
  );

  const stats = useMemo(() => {
    const totalUseCount = entries.reduce((sum, entry) => sum + (entry.useCount ?? 0), 0);
    const recentlyUsedEntry = [...entries].sort((a, b) => getTimeValue(b.lastUsedTime) - getTimeValue(a.lastUsedTime))[0];

    return {
      total: entries.length,
      enabled: entries.filter(entry => entry.enabled).length,
      disabled: entries.filter(entry => !entry.enabled).length,
      templates: entries.filter(entry => entry.replyTemplate.trim()).length,
      totalUseCount,
      recentlyUsedTime: recentlyUsedEntry?.lastUsedTime,
    };
  }, [entries]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors([]);
    setShowModal(true);
  };

  const handleOpenEdit = (id: string) => {
    const entry = useKnowledgeBaseStore.getState().getEntryById(id);
    if (!entry) return;
    setEditingId(id);
    setFormData({
      title: entry.title,
      category: entry.category,
      keywords: entry.keywords.join('，'),
      handlerUnit: entry.handlerUnit,
      replyTemplate: entry.replyTemplate,
      handlingPoints: entry.handlingPoints.join('\n'),
      enabled: entry.enabled,
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

  const handleFormChange = (field: keyof KnowledgeFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors.length > 0) setFormErrors([]);
  };

  const handleSubmit = () => {
    const payload = {
      title: formData.title,
      category: formData.category as TicketCategory | '',
      keywords: splitList(formData.keywords),
      handlerUnit: formData.handlerUnit as HandlerUnit,
      replyTemplate: formData.replyTemplate,
      handlingPoints: splitList(formData.handlingPoints),
      enabled: formData.enabled,
    };

    const result = editingId ? updateEntry(editingId, payload) : addEntry(payload);
    if (!result.success) {
      setFormErrors(result.errors);
      return;
    }
    handleClose();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条知识条目吗？')) {
      deleteEntry(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
            <BookOpen className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">知识库管理</h1>
            <p className="text-sm text-gray-500">维护常见诉求办理口径和答复模板</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (confirm('确定要重置知识库为默认数据吗？')) {
                resetEntries();
              }
            }}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>重置</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>新增条目</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">条目总数</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">已启用</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">{stats.enabled}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">已停用</p>
          <p className="mt-1 text-2xl font-semibold text-gray-500">{stats.disabled}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">累计使用</p>
          <p className="mt-1 text-2xl font-semibold text-primary-600">{stats.totalUseCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-900">使用热度 Top5</h3>
            </div>
            <span className="text-xs text-amber-700">按使用次数统计</span>
          </div>
          {hotEntries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-amber-200 bg-white/60 py-6 text-center text-sm text-amber-700">
              暂无模板使用记录
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {hotEntries.map((entry, index) => (
                <div key={entry.id} className="rounded-lg border border-amber-100 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {index + 1}. {entry.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">最近使用：{formatLastUsed(entry.lastUsedTime)}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {entry.useCount ?? 0} 次
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">模板数量</p>
          <p className="mt-1 text-2xl font-semibold text-primary-600">{stats.templates}</p>
          <div className="mt-4 rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">最近一次使用</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{formatLastUsed(stats.recentlyUsedTime)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索标题、关键词、模板或办理要点..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as TicketCategory | '')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">全部类型</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value as HandlerUnit | '')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">全部承办单位</option>
              {HANDLER_UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as KnowledgeSortMode)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="useCount">按使用热度</option>
              <option value="lastUsed">按最近使用</option>
              <option value="updated">按更新时间</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <h3 className="text-sm font-medium text-gray-700">共 {filteredEntries.length} 条知识条目</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredEntries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <BookOpen className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-sm text-gray-500">暂无匹配的知识条目</p>
            </div>
          ) : (
            filteredEntries.map(entry => (
              <div
                key={entry.id}
                className={clsx('px-6 py-4 transition-colors hover:bg-gray-50', !entry.enabled && 'bg-gray-50/50 opacity-60')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={clsx('text-sm font-medium', entry.enabled ? 'text-gray-900' : 'text-gray-500')}>
                        {entry.title}
                      </h4>
                      <span className={clsx(
                        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                        entry.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      )}>
                        {entry.enabled ? '启用' : '停用'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center space-x-1 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">
                        <Tag className="h-3 w-3" />
                        <span>{entry.category || '不限类型'}</span>
                      </span>
                      <span className="inline-flex items-center space-x-1 rounded-md bg-green-50 px-2 py-1 text-xs text-green-700">
                        <Building2 className="h-3 w-3" />
                        <span>{entry.handlerUnit}</span>
                      </span>
                      <span className="inline-flex items-center space-x-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                        <Zap className="h-3 w-3" />
                        <span>{entry.keywords.join('、')}</span>
                      </span>
                      <span className="inline-flex items-center space-x-1 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700">
                        <TrendingUp className="h-3 w-3" />
                        <span>使用 {entry.useCount ?? 0} 次</span>
                      </span>
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        最近使用：{formatLastUsed(entry.lastUsedTime)}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-600">
                      {entry.replyTemplate}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.handlingPoints.map(point => (
                        <span key={point} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                          {point}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center space-x-1">
                    <button
                      onClick={() => toggleEntry(entry.id)}
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      title={entry.enabled ? '停用条目' : '启用条目'}
                    >
                      {entry.enabled ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(entry.id)}
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                      title="编辑条目"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="删除条目"
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">{editingId ? '编辑知识条目' : '新增知识条目'}</h3>
              <button
                onClick={handleClose}
                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {formErrors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-red-800">请修正以下问题</p>
                      <ul className="mt-1 list-inside list-disc text-sm text-red-600">
                        {formErrors.map(error => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  条目标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="例如：路灯损坏维修答复口径"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    适用诉求类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">请选择诉求类型</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    推荐承办单位 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.handlerUnit}
                    onChange={(e) => handleFormChange('handlerUnit', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">请选择承办单位</option>
                    {HANDLER_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  关键词 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => handleFormChange('keywords', e.target.value)}
                  placeholder="多个关键词用逗号或顿号分隔"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  答复模板 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.replyTemplate}
                  onChange={(e) => handleFormChange('replyTemplate', e.target.value)}
                  placeholder="填写可带入工单或办理结果的模板文本"
                  rows={5}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  办理要点 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.handlingPoints}
                  onChange={(e) => handleFormChange('handlingPoints', e.target.value)}
                  placeholder="每行一个办理要点"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleFormChange('enabled', !formData.enabled)}
                  className={clsx('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', formData.enabled ? 'bg-primary-600' : 'bg-gray-300')}
                >
                  <span className={clsx('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', formData.enabled ? 'translate-x-6' : 'translate-x-1')} />
                </button>
                <span className="text-sm text-gray-700">{formData.enabled ? '条目已启用' : '条目已停用'}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                onClick={handleClose}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                <Save className="h-4 w-4" />
                <span>{editingId ? '保存修改' : '创建条目'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
