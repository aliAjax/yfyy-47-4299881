import { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Save,
  RotateCcw,
  Filter,
  Tag,
  Building2,
  Lightbulb,
  FileText,
  CheckCircle,
  XCircle,
  Copy,
  Info,
  Sparkles,
  ChevronDown,
  SortDesc,
  SortAsc,
  ArrowUpDown,
  TrendingUp,
  Clock,
  ListCheck,
  Check,
  MoreHorizontal,
  BarChart3
} from 'lucide-react';
import { useKnowledgeStore } from '@/store/useKnowledgeStore';
import { CATEGORIES, HANDLER_UNITS, TicketCategory, HandlerUnit, KnowledgeEntry } from '@/types';
import { getScoreBadgeColor, getScoreColor } from '@/utils/knowledge';
import { clsx } from 'clsx';

interface KnowledgeFormData {
  title: string;
  category: TicketCategory | '';
  keywords: string[];
  synonyms: string[];
  recommendedUnit: HandlerUnit | '';
  replyTemplate: string;
  keyPoints: string;
  enabled: boolean;
}

const initialFormData: KnowledgeFormData = {
  title: '',
  category: '',
  keywords: [],
  synonyms: [],
  recommendedUnit: '',
  replyTemplate: '',
  keyPoints: '',
  enabled: true,
};

export default function KnowledgeBase() {
  const { 
    getFilteredEntries,
    getStats,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteSelected,
    toggleEntry,
    batchToggle,
    resetEntries,
    getEntryById,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    sortBy,
    setSortBy,
  } = useKnowledgeStore();

  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<TicketCategory | ''>('');
  const [filterUnit, setFilterUnit] = useState<HandlerUnit | ''>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<KnowledgeFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [synonymInput, setSynonymInput] = useState('');
  const [viewingEntry, setViewingEntry] = useState<KnowledgeEntry | null>(null);
  const [showTopUsed, setShowTopUsed] = useState(false);

  const filteredEntries = useMemo(() => {
    useKnowledgeStore.setState({
      searchKeyword: searchText,
      selectedCategory: filterCategory,
      selectedUnit: filterUnit,
      statusFilter,
    });
    return getFilteredEntries();
  }, [searchText, filterCategory, filterUnit, statusFilter, getFilteredEntries]);

  const stats = useMemo(() => getStats(), [getStats]);

  const allSelected = useMemo(() => {
    const filteredIds = filteredEntries.map(e => e.id);
    return filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
  }, [filteredEntries, selectedIds]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors([]);
    setKeywordInput('');
    setSynonymInput('');
    setShowModal(true);
  };

  const handleOpenEdit = (id: string) => {
    const entry = getEntryById(id);
    if (!entry) return;
    setEditingId(id);
    setFormData({
      title: entry.title,
      category: entry.category,
      keywords: [...entry.keywords],
      synonyms: [...(entry.synonyms || [])],
      recommendedUnit: entry.recommendedUnit,
      replyTemplate: entry.replyTemplate,
      keyPoints: entry.keyPoints,
      enabled: entry.enabled,
    });
    setFormErrors([]);
    setKeywordInput('');
    setSynonymInput('');
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors([]);
    setKeywordInput('');
    setSynonymInput('');
  };

  const handleFormChange = (field: keyof KnowledgeFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  const handleAddKeyword = () => {
    const keyword = keywordInput.trim();
    if (!keyword) return;
    if (formData.keywords.includes(keyword)) {
      setKeywordInput('');
      return;
    }
    handleFormChange('keywords', [...formData.keywords, keyword]);
    setKeywordInput('');
  };

  const handleRemoveKeyword = (keyword: string) => {
    handleFormChange('keywords', formData.keywords.filter(k => k !== keyword));
  };

  const handleAddSynonym = () => {
    const synonym = synonymInput.trim();
    if (!synonym) return;
    if (formData.synonyms.includes(synonym)) {
      setSynonymInput('');
      return;
    }
    handleFormChange('synonyms', [...formData.synonyms, synonym]);
    setSynonymInput('');
  };

  const handleRemoveSynonym = (synonym: string) => {
    handleFormChange('synonyms', formData.synonyms.filter(s => s !== synonym));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSynonymKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSynonym();
    }
  };

  const handleSubmit = () => {
    const submitData = {
      ...formData,
      recommendedUnit: formData.recommendedUnit as HandlerUnit,
    };

    if (editingId) {
      const result = updateEntry(editingId, submitData);
      if (!result.success) {
        setFormErrors(result.errors);
        return;
      }
    } else {
      const result = addEntry(submitData);
      if (!result.success) {
        setFormErrors(result.errors);
        return;
      }
    }
    handleClose();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条知识条目吗？')) {
      deleteEntry(id);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`确定要删除选中的 ${selectedIds.length} 条知识条目吗？`)) {
      deleteSelected();
    }
  };

  const handleBatchEnable = () => {
    if (selectedIds.length === 0) return;
    batchToggle(true);
  };

  const handleBatchDisable = () => {
    if (selectedIds.length === 0) return;
    batchToggle(false);
  };

  const handleToggle = (id: string) => {
    toggleEntry(id);
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认知识库吗？所有自定义条目将丢失。')) {
      resetEntries();
      clearSelection();
    }
  };

  const handleCopyTemplate = (template: string) => {
    navigator.clipboard.writeText(template).then(() => {
      alert('答复模板已复制到剪贴板');
    }).catch(() => {
      alert('复制失败，请手动复制');
    });
  };

  const handleViewDetail = (entry: KnowledgeEntry) => {
    setViewingEntry(entry);
  };

  const handleSortChange = (sort: 'updateTime' | 'useCount' | 'createTime') => {
    setSortBy(sort);
  };

  const formatNumber = (n: number) => {
    return n.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <BookOpen className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">知识库管理</h1>
            <p className="text-sm text-gray-500">沉淀常见诉求办理口径，提升办理效率和规范性</p>
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
            <span>新增条目</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <BookOpen className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">总条目数</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.enabled}</p>
              <p className="text-sm text-green-500">已启用</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200">
              <XCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{stats.disabled}</p>
              <p className="text-sm text-gray-500">已停用</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Tag className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-700">{Object.keys(stats.byCategory).length}</p>
              <p className="text-sm text-violet-500">覆盖类型</p>
            </div>
          </div>
        </div>
        <div 
          className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setShowTopUsed(!showTopUsed)}
        >
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{formatNumber(stats.totalUseCount)}</p>
              <p className="text-sm text-amber-500">累计使用次数</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Used Knowledge - Expandable */}
      {showTopUsed && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <span>使用频率 Top 5</span>
            </h3>
            <button
              onClick={() => setShowTopUsed(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              收起
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {stats.topUsed.map((entry, index) => (
              <div
                key={entry.id}
                onClick={() => handleViewDetail(entry)}
                className="rounded-lg border border-amber-200 bg-white p-3 cursor-pointer hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-xs font-medium text-amber-600">
                    {formatNumber(entry.useCount)} 次
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 line-clamp-2">
                  {entry.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Batch Actions Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">筛选：</span>
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索标题、关键词、内容..."
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
            <option value="">全部类型</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value as HandlerUnit | '')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">全部承办单位</option>
            {HANDLER_UNITS.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">全部状态</option>
            <option value="enabled">已启用</option>
            <option value="disabled">已停用</option>
          </select>
          
          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-sm text-gray-500">排序：</span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="updateTime">最近更新</option>
              <option value="useCount">使用频率</option>
              <option value="createTime">创建时间</option>
            </select>
          </div>
        </div>

        {/* Batch Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                已选择 <span className="font-medium text-primary-600">{selectedIds.length}</span> 条
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                取消选择
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBatchEnable}
                className="inline-flex items-center space-x-1 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>批量启用</span>
              </button>
              <button
                onClick={handleBatchDisable}
                className="inline-flex items-center space-x-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                <span>批量停用</span>
              </button>
              <button
                onClick={handleDeleteSelected}
                className="inline-flex items-center space-x-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>批量删除</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Knowledge List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  标题
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  适用类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  关键词
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  推荐承办单位
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>使用次数</span>
                </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  更新时间
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <BookOpen className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    <p>暂无知识条目</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr 
                    key={entry.id} 
                    className={clsx(
                      "transition-colors",
                      selectedIds.includes(entry.id) ? "bg-primary-50" : "hover:bg-gray-50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewDetail(entry)}
                        className="text-left text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors"
                      >
                        {entry.title}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {entry.category || '通用'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {entry.keywords.slice(0, 3).map((kw, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-primary-50 text-primary-600"
                          >
                            {kw}
                          </span>
                        ))}
                        {entry.keywords.length > 3 && (
                          <span className="text-xs text-gray-400">+{entry.keywords.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{entry.recommendedUnit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        entry.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      )}>
                        {entry.enabled ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'text-sm font-medium',
                        entry.useCount > 100 ? 'text-green-600' :
                        entry.useCount > 50 ? 'text-amber-600' : 'text-gray-500'
                      )}>
                        {formatNumber(entry.useCount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{entry.updateTime}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleViewDetail(entry)}
                          className="inline-flex items-center p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="查看详情"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCopyTemplate(entry.replyTemplate)}
                          className="inline-flex items-center p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="复制模板"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(entry.id)}
                          className="inline-flex items-center p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title={entry.enabled ? '停用' : '启用'}
                        >
                          {entry.enabled ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(entry.id)}
                          className="inline-flex items-center p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
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
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            共 <span className="font-medium text-gray-900">{filteredEntries.length}</span> 条知识条目
          </p>
          <p className="text-xs text-gray-400">
            数据自动保存到本地存储
          </p>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? '编辑知识条目' : '新增知识条目'}
              </h3>
              <button
                onClick={handleClose}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
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
                  标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="请输入知识条目标题"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Tag className="inline h-4 w-4 mr-1 text-gray-400" />
                    适用诉求类型
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">通用（全部类型）</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Building2 className="inline h-4 w-4 mr-1 text-gray-400" />
                    推荐承办单位 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.recommendedUnit}
                    onChange={(e) => handleFormChange('recommendedUnit', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">请选择承办单位</option>
                    {HANDLER_UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Sparkles className="inline h-4 w-4 mr-1 text-gray-400" />
                  关键词 <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-400 font-normal ml-2">（用于精确匹配）</span>
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="输入关键词，按回车添加"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.keywords.length === 0 ? (
                    <span className="text-xs text-gray-400">暂无关键词，请添加</span>
                  ) : (
                    formData.keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs"
                      >
                        <span>{kw}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(kw)}
                          className="text-primary-400 hover:text-primary-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Synonyms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Lightbulb className="inline h-4 w-4 mr-1 text-amber-500" />
                  同义词/相关词
                  <span className="text-xs text-gray-400 font-normal ml-2">（用于模糊匹配，提升召回率）</span>
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="输入同义词，按回车添加"
                    value={synonymInput}
                    onChange={(e) => setSynonymInput(e.target.value)}
                    onKeyDown={handleSynonymKeyDown}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddSynonym}
                    className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.synonyms.length === 0 ? (
                    <span className="text-xs text-gray-400">暂无同义词，可选添加</span>
                  ) : (
                    formData.synonyms.map((syn, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs"
                      >
                        <span>{syn}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSynonym(syn)}
                          className="text-amber-400 hover:text-amber-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <FileText className="inline h-4 w-4 mr-1 text-gray-400" />
                  答复模板 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.replyTemplate}
                  onChange={(e) => handleFormChange('replyTemplate', e.target.value)}
                  placeholder="请输入标准答复模板内容。&#10;&#10;支持占位符：{area}（区域）、{category}（类型）、{handlerUnit}（承办单位）等"
                  rows={6}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                />
                <p className="mt-1 text-xs text-gray-400 text-right">
                  {formData.replyTemplate.length} / 5000 字
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Lightbulb className="inline h-4 w-4 mr-1 text-amber-500" />
                  办理要点
                </label>
                <textarea
                  value={formData.keyPoints}
                  onChange={(e) => handleFormChange('keyPoints', e.target.value)}
                  placeholder="请输入办理要点和注意事项..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                />
              </div>

              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">启用状态</label>
                <button
                  type="button"
                  onClick={() => handleFormChange('enabled', !formData.enabled)}
                  className={clsx(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    formData.enabled ? 'bg-primary-600' : 'bg-gray-200'
                  )}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      formData.enabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm text-gray-500">
                  {formData.enabled ? '启用中' : '已停用'}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end space-x-3 flex-shrink-0">
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

      {/* View Detail Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
                  <BookOpen className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">知识条目详情</h3>
                </div>
              </div>
              <button
                onClick={() => setViewingEntry(null)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{viewingEntry.title}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {viewingEntry.category || '通用'}
                  </span>
                  <span className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    viewingEntry.enabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {viewingEntry.enabled ? '启用' : '停用'}
                  </span>
                  <span className="inline-flex items-center space-x-1 text-xs text-gray-500">
                    <TrendingUp className="h-3 w-3" />
                    <span>使用 {viewingEntry.useCount} 次</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">推荐承办单位</p>
                  <p className="text-sm text-gray-700">{viewingEntry.recommendedUnit}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">关键词</p>
                <div className="flex flex-wrap gap-1.5">
                  {viewingEntry.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary-50 text-primary-600"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {viewingEntry.synonyms && viewingEntry.synonyms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">同义词/相关词</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingEntry.synonyms.map((syn, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-600"
                      >
                        {syn}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">答复模板</p>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{viewingEntry.replyTemplate}</pre>
                </div>
              </div>

              {viewingEntry.keyPoints && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">办理要点</p>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                    <pre className="text-sm text-amber-700 whitespace-pre-wrap font-sans">{viewingEntry.keyPoints}</pre>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <p className="text-xs font-medium text-gray-500">创建时间</p>
                  <p className="text-sm text-gray-700">{viewingEntry.createTime}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">更新时间</p>
                  <p className="text-sm text-gray-700">{viewingEntry.updateTime}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">最近使用</p>
                  <p className="text-sm text-gray-700">{viewingEntry.lastUsedTime || '未使用'}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between flex-shrink-0">
              <button
                onClick={() => {
                  handleCopyTemplate(viewingEntry.replyTemplate);
                }}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span>复制模板</span>
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setViewingEntry(null);
                    handleOpenEdit(viewingEntry.id);
                  }}
                  className="inline-flex items-center space-x-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  <span>编辑</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
