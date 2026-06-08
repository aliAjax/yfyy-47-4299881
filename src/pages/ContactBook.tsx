import { useState, useMemo } from 'react';
import { 
  Search, 
  Phone, 
  User, 
  Building2, 
  Edit2, 
  Trash2, 
  X, 
  Plus,
  PhoneCall,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  BadgeCheck,
  RefreshCw
} from 'lucide-react';
import { useContactStore } from '@/store/useContactStore';
import { HANDLER_UNITS, HandlerUnit, ContactPerson } from '@/types';
import { clsx } from 'clsx';

export default function ContactBook() {
  const { 
    contacts, 
    searchKeyword, 
    selectedUnit,
    setSearchKeyword, 
    setSelectedUnit,
    getFilteredContacts,
    addContact,
    updateContact,
    deleteContact,
    toggleOnDuty,
  } = useContactStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactPerson | null>(null);
  const [formData, setFormData] = useState({
    unit: '' as HandlerUnit | '',
    name: '',
    phone: '',
    position: '',
    isOnDuty: false,
    remark: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [unitFilterOpen, setUnitFilterOpen] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set(HANDLER_UNITS));

  const filteredContacts = getFilteredContacts();

  const groupedContacts = useMemo(() => {
    const groups: Record<string, ContactPerson[]> = {};
    filteredContacts.forEach(contact => {
      if (!groups[contact.unit]) {
        groups[contact.unit] = [];
      }
      groups[contact.unit].push(contact);
    });
    return groups;
  }, [filteredContacts]);

  const unitStats = useMemo(() => {
    const stats: Record<string, { total: number; onDuty: number }> = {};
    HANDLER_UNITS.forEach(unit => {
      stats[unit] = { total: 0, onDuty: 0 };
    });
    contacts.forEach(c => {
      stats[c.unit].total++;
      if (c.isOnDuty) stats[c.unit].onDuty++;
    });
    return stats;
  }, [contacts]);

  const openAddModal = () => {
    setEditingContact(null);
    setFormData({
      unit: selectedUnit || '',
      name: '',
      phone: '',
      position: '',
      isOnDuty: false,
      remark: '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (contact: ContactPerson) => {
    setEditingContact(contact);
    setFormData({
      unit: contact.unit,
      name: contact.name,
      phone: contact.phone,
      position: contact.position,
      isOnDuty: contact.isOnDuty,
      remark: contact.remark || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.unit) newErrors.unit = '请选择承办单位';
    if (!formData.name.trim()) newErrors.name = '请输入姓名';
    if (!formData.phone.trim()) newErrors.phone = '请输入联系电话';
    if (!formData.position.trim()) newErrors.position = '请输入职务';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (editingContact) {
      updateContact(editingContact.id, {
        name: formData.name,
        phone: formData.phone,
        position: formData.position,
        isOnDuty: formData.isOnDuty,
        remark: formData.remark,
      });
    } else {
      addContact({
        unit: formData.unit as HandlerUnit,
        name: formData.name,
        phone: formData.phone,
        position: formData.position,
        isOnDuty: formData.isOnDuty,
        remark: formData.remark,
      });
      if (formData.isOnDuty) {
        toggleOnDutyForUnit(formData.unit as HandlerUnit, formData.name);
      }
    }

    closeModal();
  };

  const toggleOnDutyForUnit = (unit: HandlerUnit, name: string) => {
    const unitContacts = contacts.filter(c => c.unit === unit);
    const target = unitContacts.find(c => c.name === name);
    if (target) {
      toggleOnDuty(target.id);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除该联系人吗？')) {
      deleteContact(id);
    }
  };

  const handleToggleDuty = (id: string) => {
    toggleOnDuty(id);
  };

  const handleUnitFilter = (unit: HandlerUnit | '') => {
    setSelectedUnit(unit);
    setUnitFilterOpen(false);
  };

  const toggleUnitExpand = (unit: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unit)) {
        next.delete(unit);
      } else {
        next.add(unit);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedUnits(new Set(Object.keys(groupedContacts)));
  };

  const collapseAll = () => {
    setExpandedUnits(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <PhoneCall className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">承办单位通讯录</h2>
            <p className="text-sm text-gray-500">维护各承办单位联系人信息及值班状态</p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>新增联系人</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
        {HANDLER_UNITS.map(unit => (
          <div
            key={unit}
            onClick={() => handleUnitFilter(selectedUnit === unit ? '' : unit)}
            className={clsx(
              'rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md group',
              selectedUnit === unit
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                : 'border-gray-200 bg-white hover:border-gray-300'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                selectedUnit === unit ? 'bg-primary-100' : 'bg-gray-100 group-hover:bg-primary-50'
              )}>
                <Building2 className={clsx(
                  'h-5 w-5',
                  selectedUnit === unit ? 'text-primary-600' : 'text-gray-500 group-hover:text-primary-500'
                )} />
              </div>
              {unitStats[unit].onDuty > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  值班中
                </span>
              )}
            </div>
            <div className={clsx(
              'text-2xl font-bold',
              selectedUnit === unit ? 'text-primary-600' : 'text-gray-900'
            )}>
              {unitStats[unit].total}
              <span className="text-sm font-normal text-gray-500 ml-1">人</span>
            </div>
            <div className="text-xs text-gray-500 mt-1.5 truncate" title={unit}>
              {unit}
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索单位、姓名、电话、职务、备注..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setUnitFilterOpen(!unitFilterOpen)}
                className="inline-flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"
              >
                <Filter className="h-4 w-4" />
                <span>{selectedUnit || '全部单位'}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {unitFilterOpen && (
                <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200">
                  <button
                    onClick={() => handleUnitFilter('')}
                    className={clsx(
                      'block w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                      !selectedUnit && 'bg-primary-50 text-primary-700'
                    )}
                  >
                    全部单位
                  </button>
                  {HANDLER_UNITS.map(unit => (
                    <button
                      key={unit}
                      onClick={() => handleUnitFilter(unit)}
                      className={clsx(
                        'block w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                        selectedUnit === unit && 'bg-primary-50 text-primary-700'
                      )}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden sm:flex items-center space-x-1 text-sm">
              <button
                onClick={expandAll}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="全部展开"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="全部折叠"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            共找到 <span className="font-medium text-gray-900">{filteredContacts.length}</span> 位联系人
            <span className="text-gray-400 mx-2">·</span>
            <span className="text-green-600">
              {filteredContacts.filter(c => c.isOnDuty).length} 位值班中
            </span>
          </div>
          {selectedUnit && (
            <button
              onClick={() => setSelectedUnit('')}
              className="inline-flex items-center space-x-1 text-xs text-primary-600 hover:text-primary-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>清除筛选</span>
            </button>
          )}
        </div>
      </div>

      {/* Contact List by Unit */}
      <div className="space-y-4">
        {Object.keys(groupedContacts).length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-16 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">
              {searchKeyword || selectedUnit ? '未找到匹配的联系人' : '暂无联系人'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchKeyword || selectedUnit ? '请尝试调整搜索条件或筛选条件' : '点击右上角按钮添加第一个联系人'}
            </p>
            {(searchKeyword || selectedUnit) && (
              <button
                onClick={() => {
                  setSearchKeyword('');
                  setSelectedUnit('');
                }}
                className="inline-flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <RefreshCw className="h-4 w-4" />
                <span>清除筛选条件</span>
              </button>
            )}
          </div>
        ) : (
          Object.entries(groupedContacts).map(([unit, unitContacts]) => {
            const onDutyContact = unitContacts.find(c => c.isOnDuty);
            const isExpanded = expandedUnits.has(unit);
            return (
              <div key={unit} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleUnitExpand(unit)}
                  className="w-full border-b border-gray-100 bg-gray-50 px-6 py-4 hover:bg-gray-100/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-5 w-5 text-primary-600" />
                      <h3 className="text-base font-semibold text-gray-900">{unit}</h3>
                      <span className="text-sm text-gray-500">({unitContacts.length} 人)</span>
                      {onDutyContact && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <BadgeCheck className="h-3 w-3 mr-1" />
                          值班: {onDutyContact.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      {onDutyContact && (
                        <a
                          href={`tel:${onDutyContact.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hidden sm:inline-flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <Phone className="h-4 w-4" />
                          <span>{onDutyContact.phone}</span>
                        </a>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {unitContacts.map(contact => (
                      <div
                        key={contact.id}
                        className={clsx(
                          'px-6 py-4 flex items-center justify-between transition-colors',
                          contact.isOnDuty ? 'bg-green-50/50' : 'hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={clsx(
                            'flex h-11 w-11 items-center justify-center rounded-full',
                            contact.isOnDuty
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-600'
                          )}>
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">{contact.name}</span>
                              <span className="text-sm text-gray-500">{contact.position}</span>
                              {contact.isOnDuty && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  <Clock className="h-3 w-3 mr-1" />
                                  值班中
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 mt-1">
                              <a
                                href={`tel:${contact.phone}`}
                                className="inline-flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                <span>{contact.phone}</span>
                              </a>
                              {contact.remark && (
                                <span className="text-sm text-gray-400">| {contact.remark}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleDuty(contact.id)}
                            className={clsx(
                              'inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                              contact.isOnDuty
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            )}
                          >
                            <Clock className="h-4 w-4" />
                            <span>{contact.isOnDuty ? '取消值班' : '设为值班'}</span>
                          </button>
                          <button
                            onClick={() => openEditModal(contact)}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl mx-4">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingContact ? '编辑联系人' : '新增联系人'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  承办单位 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value as HandlerUnit }))}
                  className={clsx(
                    'w-full rounded-lg border px-3 py-2.5 text-sm transition-all',
                    errors.unit
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                  )}
                >
                  <option value="">请选择承办单位</option>
                  {HANDLER_UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
                {errors.unit && (
                  <p className="mt-1 text-xs text-red-500">{errors.unit}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入姓名"
                  className={clsx(
                    'w-full rounded-lg border px-4 py-2.5 text-sm transition-all',
                    errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                  )}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  联系电话 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="请输入联系电话"
                    className={clsx(
                      'w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm transition-all',
                      errors.phone
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                    )}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  职务 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="请输入职务"
                  className={clsx(
                    'w-full rounded-lg border px-4 py-2.5 text-sm transition-all',
                    errors.position
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                  )}
                />
                {errors.position && (
                  <p className="mt-1 text-xs text-red-500">{errors.position}</p>
                )}
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">值班状态</p>
                  <p className="text-xs text-gray-500">开启后该联系人将作为值班联系人显示</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isOnDuty: !prev.isOnDuty }))}
                  className={clsx(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                    formData.isOnDuty ? 'bg-primary-600' : 'bg-gray-200'
                  )}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      formData.isOnDuty ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  备注
                </label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                  placeholder="请输入备注信息（可选）"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                />
              </div>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-xl">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                {editingContact ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
