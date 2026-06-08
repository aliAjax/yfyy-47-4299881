import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Building2, 
  Tag,
  Clock,
  User,
  Paperclip,
  Send,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  CheckCircle,
  FileText,
  Upload,
  X,
  Phone,
  BadgeCheck,
  BookOpen,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import { useContactStore } from '@/store/useContactStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { generateId, formatDateTime, formatFileSize } from '@/utils/date';
import { useWorkday } from '@/hooks/useWorkday';
import { Attachment, HandlerUnit } from '@/types';
import { getMatchReasonText } from '@/utils/dispatchRule';
import { clsx } from 'clsx';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getTicketById, 
    currentRole, 
    addProgressLog, 
    updateTicketStatus,
    submitResult,
    urgeTicket,
    returnTicket
  } = useTicketStore();
  const { getOnDutyContact, getContactsByUnit } = useContactStore();
  const { getRiskLevel, getDeadlineLabel } = useWorkday();
  
  const ticket = getTicketById(id || '');
  
  const [progressText, setProgressText] = useState('');
  const [resultText, setResultText] = useState('');
  const [urgeReason, setUrgeReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [showUrgeModal, setShowUrgeModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'attachments'>('timeline');
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileText className="h-16 w-16 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">工单不存在</p>
        <button
          onClick={() => navigate('/')}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          返回工单列表
        </button>
      </div>
    );
  }

  const riskLevel = getRiskLevel(ticket.deadline, ticket.status);
  const deadlineLabel = getDeadlineLabel(ticket.deadline, ticket.status);

  const handleAddProgress = () => {
    if (!progressText.trim()) return;
    addProgressLog(ticket.id, progressText, 'progress', '承办单位经办人');
    if (ticket.status === 'pending' || ticket.status === 'returned') {
      updateTicketStatus(ticket.id, 'processing');
    }
    setProgressText('');
    setShowProgressForm(false);
  };

  const handleSubmitResult = () => {
    if (!resultText.trim()) return;
    
    const attachments: Attachment[] = pendingAttachments.map(file => ({
      id: generateId(),
      ticketId: ticket.id,
      name: file.name,
      size: formatFileSize(file.size),
      uploadTime: formatDateTime(new Date()),
    }));
    
    submitResult(ticket.id, resultText, attachments);
    setResultText('');
    setPendingAttachments([]);
    setAttachmentError('');
    setShowResultForm(false);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => file.size <= MAX_ATTACHMENT_SIZE);
    const oversizedFiles = fileArray.filter(file => file.size > MAX_ATTACHMENT_SIZE);

    if (validFiles.length > 0) {
      setPendingAttachments(prev => [...prev, ...validFiles]);
    }

    setAttachmentError(
      oversizedFiles.length > 0
        ? `${oversizedFiles.map(file => file.name).join('、')} 超过10MB，未添加到附件列表`
        : ''
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleUrge = () => {
    if (!urgeReason.trim()) return;
    urgeTicket(ticket.id, urgeReason, '督办员');
    setUrgeReason('');
    setShowUrgeModal(false);
  };

  const handleReturn = () => {
    if (!returnReason.trim()) return;
    returnTicket(ticket.id, returnReason, '督办员');
    setReturnReason('');
    setShowReturnModal(false);
  };

  const riskConfig = {
    high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '高风险' },
    medium: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: '中风险' },
    low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: '低风险' },
  };

  const risk = riskConfig[ticket.status === 'completed' ? 'low' : riskLevel];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>返回列表</span>
          </button>
        </div>
        
        {currentRole === 'supervisor' && ticket.status !== 'completed' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowUrgeModal(true)}
              className="inline-flex items-center space-x-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>发起催办</span>
            </button>
            <button
              onClick={() => setShowReturnModal(true)}
              className="inline-flex items-center space-x-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>退回重办</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Ticket Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-primary-200 font-mono">{ticket.id}</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">{ticket.title}</h2>
                </div>
                <StatusBadge status={ticket.status} />
              </div>
            </div>
            
            <div className="p-6">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <Tag className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">诉求类型</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900">{ticket.category}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">所属区域</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900">{ticket.area}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">承办单位</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900">{ticket.handlerUnit}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">经办人</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900">{ticket.handler || '未指派'}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">交办时间</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900">{ticket.assignTime}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">办理期限</p>
                    <p className={clsx('mt-0.5 text-sm font-medium', risk.text)}>
                      {ticket.deadline}（{deadlineLabel}）
                    </p>
                  </div>
                </div>
              </div>

              {/* Risk Badge */}
              {ticket.status !== 'completed' && (
                <div className={clsx(
                  'mt-6 flex items-center space-x-2 rounded-lg border px-4 py-2.5',
                  risk.bg,
                  risk.border,
                  risk.text
                )}>
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm font-medium">超期风险等级：{risk.label}</span>
                </div>
              )}

              {/* Content */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">诉求内容</h3>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{ticket.content}</p>
                </div>
              </div>

              {/* Result */}
              {ticket.result && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    办理结果
                  </h3>
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{ticket.result}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Handler Actions */}
          {currentRole === 'handler' && ticket.status !== 'completed' && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">办理操作</h3>
              
              <div className="flex space-x-3 mb-4">
                {!showProgressForm && !showResultForm && (
                  <>
                    <button
                      onClick={() => setShowProgressForm(true)}
                      className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>更新进度</span>
                    </button>
                    <button
                      onClick={() => setShowResultForm(true)}
                      className="inline-flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>提交办理结果</span>
                    </button>
                  </>
                )}
              </div>

              {showProgressForm && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      进度说明
                    </label>
                    <textarea
                      value={progressText}
                      onChange={(e) => setProgressText(e.target.value)}
                      placeholder="请描述当前办理进度..."
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowProgressForm(false)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddProgress}
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                    >
                      提交进度
                    </button>
                  </div>
                </div>
              )}

              {showResultForm && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      办理结果
                    </label>
                    <textarea
                      value={resultText}
                      onChange={(e) => setResultText(e.target.value)}
                      placeholder="请详细填写办理结果..."
                      rows={5}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      附件上传
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={clsx(
                        'rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all',
                        isDragOver
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                      />
                      <Upload className={clsx(
                        'mx-auto h-8 w-8 mb-2 transition-colors',
                        isDragOver ? 'text-primary-500' : 'text-gray-400'
                      )} />
                      <p className={clsx(
                        'text-sm transition-colors',
                        isDragOver ? 'text-primary-600' : 'text-gray-600'
                      )}>
                        点击或拖拽文件到此处上传
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        支持 PDF、Word、图片等格式，单个文件不超过 10MB
                      </p>
                    </div>
                    
                    {pendingAttachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-gray-500">
                          已选择 {pendingAttachments.length} 个文件
                        </p>
                        {pendingAttachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-primary-100 text-primary-600">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(file.size)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAttachment(index);
                              }}
                              className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {attachmentError && (
                      <p className="mt-2 text-xs text-red-500">
                        {attachmentError}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowResultForm(false)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSubmitResult}
                      className="inline-flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      <span>提交结果</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Timeline & Attachments */}
        <div className="space-y-6">
          {/* Tabs */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('timeline')}
                className={clsx(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === 'timeline'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                办理时间线
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={clsx(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === 'attachments'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                附件 ({ticket.attachments.length})
              </button>
            </div>
            
            <div className="p-5 max-h-[500px] overflow-y-auto">
              {activeTab === 'timeline' ? (
                <Timeline logs={ticket.progressLogs} />
              ) : (
                <div className="space-y-3">
                  {ticket.attachments.length === 0 ? (
                    <div className="py-8 text-center">
                      <Paperclip className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">暂无附件</p>
                    </div>
                  ) : (
                    ticket.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{att.name}</p>
                          <p className="text-xs text-gray-500">{att.size} · {att.uploadTime}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">值班联系人</h3>
              <button
                onClick={() => navigate('/contacts')}
                className="inline-flex items-center space-x-1 text-xs text-primary-600 hover:text-primary-700"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>通讯录</span>
              </button>
            </div>
            {(() => {
              const onDuty = getOnDutyContact(ticket.handlerUnit as HandlerUnit);
              const unitContacts = getContactsByUnit(ticket.handlerUnit as HandlerUnit);
              return onDuty ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{onDuty.name}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <BadgeCheck className="h-3 w-3 mr-1" />
                          值班中
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{onDuty.position}</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${onDuty.phone}`}
                    className="flex items-center justify-center space-x-2 w-full rounded-lg bg-primary-50 text-primary-700 py-2.5 text-sm font-medium hover:bg-primary-100 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span>{onDuty.phone}</span>
                  </a>
                  {onDuty.remark && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                      备注：{onDuty.remark}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">暂无值班联系人</p>
                  {unitContacts.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">共 {unitContacts.length} 位联系人</p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Dispatch Info */}
          {ticket.dispatchInfo && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
                <div className="flex items-center space-x-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">分派依据</h3>
                    <p className="text-xs text-gray-500">智能分派规则匹配结果</p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">分派方式</span>
                  <span className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    ticket.dispatchInfo.dispatchMethod === 'auto'
                      ? 'bg-green-100 text-green-700'
                      : ticket.dispatchInfo.dispatchMethod === 'recommended'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                  )}>
                    {ticket.dispatchInfo.dispatchMethod === 'auto' && '智能分派'}
                    {ticket.dispatchInfo.dispatchMethod === 'recommended' && '推荐采纳'}
                    {ticket.dispatchInfo.dispatchMethod === 'manual' && '人工分派'}
                  </span>
                </div>

                {ticket.dispatchInfo.hasConflict && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">分派时存在规则冲突，需人工确认</p>
                    </div>
                  </div>
                )}

                {ticket.dispatchInfo.matchedRules.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">命中规则</p>
                    <div className="space-y-2">
                      {ticket.dispatchInfo.matchedRules.map((match, index) => (
                        <div
                          key={match.ruleId}
                          className={clsx(
                            'rounded-lg border p-3',
                            index === 0
                              ? 'border-primary-200 bg-primary-50/50'
                              : 'border-gray-200 bg-gray-50'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={clsx(
                              'text-xs font-medium',
                              index === 0 ? 'text-primary-700' : 'text-gray-600'
                            )}>
                              {match.ruleName}
                            </span>
                            <span className={clsx(
                              'text-xs font-semibold',
                              match.score >= 60
                                ? 'text-green-600'
                                : match.score >= 30
                                  ? 'text-amber-600'
                                  : 'text-gray-500'
                            )}>
                              {match.score} 分
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {match.matchedFields.length > 0 || match.matchedKeywords.length > 0
                              ? getMatchReasonText({
                                  rule: { id: match.ruleId, name: match.ruleName } as any,
                                  matchedFields: match.matchedFields,
                                  matchedKeywords: match.matchedKeywords,
                                  score: match.score,
                                })
                              : '部分条件匹配'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">推荐单位</span>
                    <span className="text-gray-700 font-medium">
                      {ticket.dispatchInfo.recommendedUnit || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">推荐期限</span>
                    <span className="text-gray-700 font-medium">
                      {ticket.dispatchInfo.recommendedDeadlineDays
                        ? `${ticket.dispatchInfo.recommendedDeadlineDays} 天`
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">调度员</span>
                    <span className="text-gray-700">{ticket.dispatchInfo.dispatchOperator}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">分派时间</span>
                    <span className="text-gray-700">{ticket.dispatchInfo.dispatchTime}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/dispatch-rules')}
                  className="w-full text-center text-xs text-gray-500 hover:text-primary-600 transition-colors"
                >
                  查看全部分派规则 →
                </button>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">工单统计</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">催办次数</span>
                <span className="text-sm font-medium text-red-600">{ticket.urgeRecords.length} 次</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">退回次数</span>
                <span className="text-sm font-medium text-orange-600">{ticket.returnRecords.length} 次</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">进度更新</span>
                <span className="text-sm font-medium text-blue-600">{ticket.progressLogs.filter(l => l.type === 'progress').length} 次</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Urge Modal */}
      {showUrgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">发起催办</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                催办原因
              </label>
              <textarea
                value={urgeReason}
                onChange={(e) => setUrgeReason(e.target.value)}
                placeholder="请填写催办原因..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div className="flex justify-end space-x-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowUrgeModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUrge}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
              >
                确认催办
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">退回重办</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                退回原因
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="请填写退回原因..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div className="flex justify-end space-x-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowReturnModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReturn}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                确认退回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
