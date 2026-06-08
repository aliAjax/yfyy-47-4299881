import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, FileText, MapPin, Building2, Tag, Calendar, FileQuestion, Phone, BadgeCheck, User, BookOpen
} from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import { useContactStore } from '@/store/useContactStore';
import { CATEGORIES, AREAS, HANDLER_UNITS, TicketCategory, Area, HandlerUnit } from '@/types';
import { formatDate, addDays } from '@/utils/date';

export default function NewTicket() {
  const navigate = useNavigate();
  const { addTicket } = useTicketStore();
  const { getOnDutyContact, getContactsByUnit } = useContactStore();

  const [formData, setFormData] = useState({
    title: '',
    category: '' as TicketCategory | '',
    area: '' as Area | '',
    content: '',
    handlerUnit: '' as HandlerUnit | '',
    deadlineDays: '7',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = '请输入诉求标题';
    if (!formData.category) newErrors.category = '请选择诉求类型';
    if (!formData.area) newErrors.area = '请选择所属区域';
    if (!formData.content.trim()) newErrors.content = '请输入诉求内容';
    if (!formData.handlerUnit) newErrors.handlerUnit = '请选择承办单位';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const deadline = formatDate(addDays(new Date(), parseInt(formData.deadlineDays)));
    
    addTicket({
      title: formData.title,
      category: formData.category as TicketCategory,
      area: formData.area as Area,
      content: formData.content,
      handlerUnit: formData.handlerUnit as HandlerUnit,
      assignTime: formatDate(new Date()) + ' ' + new Date().toTimeString().slice(0, 5),
      deadline: deadline,
    });

    navigate('/');
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>返回列表</span>
        </button>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">新建工单</h2>
              <p className="text-sm text-primary-200">录入群众诉求信息，分派至承办单位</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 诉求标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              诉求标题 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="请简要描述诉求内容"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-all
                  ${errors.title 
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                    : 'border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                  }
                `}
              />
            </div>
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* 两列布局 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 诉求类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Tag className="inline h-4 w-4 mr-1 text-gray-400" />
              诉求类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-all
                ${errors.category
                  ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                }
              `}
            >
              <option value="">请选择诉求类型</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-red-500">{errors.category}</p>
            )}
          </div>

            {/* 所属区域 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <MapPin className="inline h-4 w-4 mr-1 text-gray-400" />
                所属区域 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.area}
                onChange={(e) => handleChange('area', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-all
                  ${errors.area
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                  }
                `}
              >
                <option value="">请选择所属区域</option>
                {AREAS.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
              {errors.area && (
                <p className="mt-1 text-xs text-red-500">{errors.area}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 承办单位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Building2 className="inline h-4 w-4 mr-1 text-gray-400" />
                承办单位 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.handlerUnit}
                onChange={(e) => handleChange('handlerUnit', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-all
                  ${errors.handlerUnit
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                  }
                `}
              >
                <option value="">请选择承办单位</option>
                {HANDLER_UNITS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              {errors.handlerUnit && (
                <p className="mt-1 text-xs text-red-500">{errors.handlerUnit}</p>
              )}
              {formData.handlerUnit && (() => {
                const onDuty = getOnDutyContact(formData.handlerUnit as HandlerUnit);
                const unitContacts = getContactsByUnit(formData.handlerUnit as HandlerUnit);
                return (
                  <div className="mt-3 rounded-lg bg-green-50 border border-green-200 overflow-hidden">
                    <div className="p-3">
                      <div className="flex items-start space-x-2">
                        <BadgeCheck className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-green-800">
                              当前值班联系人
                            </p>
                            <button
                              onClick={() => navigate('/contacts')}
                              className="inline-flex items-center space-x-1 text-xs text-green-600 hover:text-green-700"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>查看通讯录</span>
                            </button>
                          </div>
                          {onDuty ? (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center space-x-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                                  <User className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-green-800">
                                    {onDuty.name}
                                  </p>
                                  <p className="text-xs text-green-600">{onDuty.position}</p>
                                </div>
                              </div>
                              <a
                                href={`tel:${onDuty.phone}`}
                                className="inline-flex items-center space-x-1.5 text-sm text-green-700 hover:text-green-800 font-medium"
                              >
                                <Phone className="h-4 w-4" />
                                <span>{onDuty.phone}</span>
                              </a>
                              {onDuty.remark && (
                                <p className="text-xs text-green-600 mt-1 bg-green-100/50 rounded px-2 py-1">
                                  备注：{onDuty.remark}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center space-x-2">
                              <User className="h-4 w-4 text-green-400" />
                              <p className="text-sm text-green-600">
                                暂无值班联系人
                                {unitContacts.length > 0 && `（共 ${unitContacts.length} 位联系人）`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 办理期限 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="inline h-4 w-4 mr-1 text-gray-400" />
                办理期限
              </label>
              <select
                value={formData.deadlineDays}
                onChange={(e) => handleChange('deadlineDays', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              >
                <option value="3">3 天</option>
                <option value="5">5 天</option>
                <option value="7">7 天</option>
                <option value="10">10 天</option>
                <option value="15">15 天</option>
                <option value="30">30 天</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                截止日期：{formatDate(addDays(new Date(), parseInt(formData.deadlineDays)))}
              </p>
            </div>
          </div>

          {/* 诉求内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <FileQuestion className="inline h-4 w-4 mr-1 text-gray-400" />
              诉求内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="请详细描述群众诉求内容..."
              rows={6}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-all resize-none
                ${errors.content
                  ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                }
              `}
            />
            {errors.content && (
              <p className="mt-1 text-xs text-red-500">{errors.content}</p>
            )}
            <p className="mt-1 text-xs text-gray-400 text-right">
              {formData.content.length} / 1000 字
            </p>
          </div>

          {/* 附件上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              相关附件
            </label>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-all cursor-pointer">
              <FileText className="mx-auto h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">点击或拖拽文件到此处上传</p>
              <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG、PDF、Word 格式，单文件不超过 10MB</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            <Send className="h-4 w-4" />
            <span>提交工单</span>
          </button>
        </div>
      </div>
    </div>
  );
}
