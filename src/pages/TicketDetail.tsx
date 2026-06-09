import { useState, useRef, useMemo, useEffect } from 'react';
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
  Archive,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Lightbulb,
  ChevronDown,
  Users,
  Plus,
  MessageSquare,
  CheckSquare,
  Clock4,
  TrendingUp
} from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import { useContactStore } from '@/store/useContactStore';
import { useKnowledgeStore } from '@/store/useKnowledgeStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { ArchiveModal } from '@/components/ArchiveModal';
import { generateId, formatDateTime, formatFileSize } from '@/utils/date';
import { useWorkday } from '@/hooks/useWorkday';
import { Attachment, HandlerUnit, HANDLER_UNITS, SATISFACTION_LABELS, QUALITY_LABELS, SatisfactionLevel, QualityLevel, ProblemTag, KnowledgeMatchResult, TemplateInsertMode, CoOrganizer, CO_ORG_STATUS_LABELS } from '@/types';
import { getMatchReasonText } from '@/utils/dispatchRule';
import { getKnowledgeMatchReasonText, applyTemplateToContent, getScoreBadgeColor } from '@/utils/knowledge';
import { clsx } from 'clsx';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

interface CoOrganizerCardProps {
  coOrg: CoOrganizer;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateProgress: (id: string) => void;
  onComplete: (id: string) => void;
  showActions: boolean;
}

function CoOrganizerCard({ coOrg, isExpanded, onToggle, onUpdateProgress, onComplete, showActions }: CoOrganizerCardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border transition-all overflow-hidden',
        isExpanded 
          ? 'border-indigo-200 bg-indigo-50/30' 
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={clsx(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              coOrg.status === 'completed' 
                ? 'bg-green-100' 
                : coOrg.status === 'processing'
                  ? 'bg-blue-100'
                  : 'bg-yellow-100'
            )}>
              {coOrg.status === 'completed' 
                ? <CheckCircle className="h-4 w-4 text-green-600" />
                : coOrg.status === 'processing'
                  ? <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                  : <Clock4 className="h-4 w-4 text-yellow-600" />
              }
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{coOrg.unit}</p>
              <p className="text-xs text-gray-500">
                协办期限：{coOrg.deadline}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              coOrg.status === 'completed' 
                ? 'bg-green-100 text-green-700' 
                : coOrg.status === 'processing'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-yellow-100 text-yellow-700'
            )}>
              {CO_ORG_STATUS_LABELS[coOrg.status]}
            </span>
            <ChevronDown className={clsx(
              'h-4 w-4 text-gray-400 transition-transform',
              isExpanded && 'rotate-180'
            )} />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">协办要求</p>
            <p className="text-sm text-gray-700">{coOrg.requirement}</p>
          </div>

          {coOrg.result && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-xs font-medium text-green-700 mb-1 flex items-center">
                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                协办结果
              </p>
              <p className="text-sm text-green-800">{coOrg.result}</p>
              {coOrg.completeTime && (
                <p className="text-xs text-green-600 mt-1">完成时间：{coOrg.completeTime}</p>
              )}
            </div>
          )}

          {coOrg.progressLogs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">办理进度</p>
              <div className="space-y-2">
                {coOrg.progressLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{log.content}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {log.operator} · {log.createTime}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showActions && coOrg.status !== 'completed' && (
            <div className="flex space-x-2 pt-2 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateProgress(coOrg.id);
                }}
                className="flex-1 inline-flex items-center justify-center space-x-1 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>更新进度</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(coOrg.id);
                }}
                className="flex-1 inline-flex items-center justify-center space-x-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>完成协办</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTicketById, 
    currentRole,
    currentUnit,
    addProgressLog, 
    updateTicketStatus,
    submitResult,
    urgeTicket,
    returnTicket,
    archiveTicket,
    addCoOrganizer,
    updateCoOrgProgress,
    completeCoOrganizer,
    isCoOrganizing,
    getCoOrganizerByUnit
  } = useTicketStore();
  const { getOnDutyContact, getContactsByUnit } = useContactStore();
  const { searchKnowledge } = useKnowledgeStore();
  const { getRiskLevel, getDeadlineLabel } = useWorkday();
  const { notifications, markAsRead } = useNotificationStore();
  
  const ticket = getTicketById(id || '');
  
  useEffect(() => {
    if (!ticket) return;
    const ticketNotifications = notifications.filter(
      (n) => n.ticketId === ticket.id && !n.isRead
    );
    ticketNotifications.forEach((n) => markAsRead(n.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id, notifications, markAsRead]);
  
  const [progressText, setProgressText] = useState('');
  const [resultText, setResultText] = useState('');
  const [urgeReason, setUrgeReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [showUrgeModal, setShowUrgeModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'attachments' | 'archive'>('timeline');
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedKnowledgeResultId, setExpandedKnowledgeResultId] = useState<string | null>(null);
  const [resultTemplateMode, setResultTemplateMode] = useState<TemplateInsertMode>('replace');
  
  const [showCoOrgModal, setShowCoOrgModal] = useState(false);
  const [coOrgUnit, setCoOrgUnit] = useState<HandlerUnit | ''>('');
  const [coOrgRequirement, setCoOrgRequirement] = useState('');
  const [coOrgDeadline, setCoOrgDeadline] = useState('');
  
  const [showCoOrgProgressModal, setShowCoOrgProgressModal] = useState(false);
  const [selectedCoOrganizerId, setSelectedCoOrganizerId] = useState('');
  const [coOrgProgressText, setCoOrgProgressText] = useState('');
  
  const [showCoOrgCompleteModal, setShowCoOrgCompleteModal] = useState(false);
  const [coOrgResult, setCoOrgResult] = useState('');
  
  const [expandedCoOrgId, setExpandedCoOrgId] = useState<string | null>(null);
  const [coOrgFilter, setCoOrgFilter] = useState<'all' | 'pending' | 'processing' | 'completed'>('all');
  const coOrgSectionRef = useRef<HTMLDivElement>(null);
  const [showCoOrgWarningModal, setShowCoOrgWarningModal] = useState(false);

  const currentUserCoOrganizer = useMemo(() => {
    if (!ticket || currentRole !== 'handler' || !currentUnit) return undefined;
    return getCoOrganizerByUnit(ticket, currentUnit);
  }, [ticket, currentRole, currentUnit, getCoOrganizerByUnit]);

  const coOrgCompletedCount = ticket?.coOrganizers?.filter(co => co.status === 'completed').length || 0;
  const coOrgTotalCount = ticket?.coOrganizers?.length || 0;
  const coOrgPendingCount = ticket?.coOrganizers?.filter(co => co.status === 'pending').length || 0;
  const coOrgProcessingCount = ticket?.coOrganizers?.filter(co => co.status === 'processing').length || 0;
  const uncompletedCoOrganizers = ticket?.coOrganizers?.filter(co => co.status !== 'completed') || [];
  const hasUncompletedCoOrg = uncompletedCoOrganizers.length > 0;

  const filteredCoOrganizers = useMemo(() => {
    if (!ticket?.coOrganizers) return [];
    if (coOrgFilter === 'all') return ticket.coOrganizers;
    return ticket.coOrganizers.filter(co => co.status === coOrgFilter);
  }, [ticket?.coOrganizers, coOrgFilter]);

  const groupedCoOrganizers = useMemo(() => {
    const groups: Record<string, CoOrganizer[]> = {
      pending: [],
      processing: [],
      completed: [],
    };
    filteredCoOrganizers.forEach(co => {
      if (groups[co.status]) {
        groups[co.status].push(co);
      }
    });
    return groups;
  }, [filteredCoOrganizers]);

  useEffect(() => {
    if (currentUserCoOrganizer && coOrgSectionRef.current) {
      setExpandedCoOrgId(currentUserCoOrganizer.id);
      setTimeout(() => {
        coOrgSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserCoOrganizer?.id]);

  const knowledgeRecommendationsForResult = useMemo(() => {
    if (!ticket) return [];
    return searchKnowledge({
      title: ticket.title,
      content: ticket.content + ' ' + resultText,
      category: ticket.category,
    }, 5);
  }, [ticket, resultText, searchKnowledge]);

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

  const doSubmitResult = (ignoreUncompletedCoOrg: boolean = false) => {
    if (!resultText.trim()) return;
    
    const attachments: Attachment[] = pendingAttachments.map(file => ({
      id: generateId(),
      ticketId: ticket.id,
      name: file.name,
      size: formatFileSize(file.size),
      uploadTime: formatDateTime(new Date()),
    }));
    
    submitResult(ticket.id, resultText, attachments, ignoreUncompletedCoOrg);
    setResultText('');
    setPendingAttachments([]);
    setAttachmentError('');
    setShowResultForm(false);
    setShowCoOrgWarningModal(false);
  };

  const handleSubmitResult = () => {
    if (!resultText.trim()) return;
    
    if (hasUncompletedCoOrg) {
      setShowCoOrgWarningModal(true);
    } else {
      doSubmitResult(false);
    }
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

  const applyKnowledgeToResult = (match: KnowledgeMatchResult) => {
    if (!ticket) return;
    
    const context = {
      area: ticket.area,
      category: ticket.category,
      handlerUnit: ticket.handlerUnit,
      title: ticket.title,
    };

    const newResult = applyTemplateToContent(resultText, match.entry.replyTemplate, {
      mode: resultTemplateMode,
      replacePlaceholders: true,
      context,
    });

    setResultText(newResult);
    useKnowledgeStore.getState().incrementUseCount(match.entry.id);
  };

  const toggleKnowledgeResultExpand = (id: string) => {
    setExpandedKnowledgeResultId(prev => prev === id ? null : id);
  };

  const handleArchive = (data: {
    satisfaction: SatisfactionLevel;
    quality: QualityLevel;
    problemTags: ProblemTag[];
    reviewNote: string;
  }) => {
    archiveTicket(ticket.id, data, '督办员');
    setShowArchiveModal(false);
  };

  const handleAddCoOrganizer = () => {
    if (!coOrgUnit || !coOrgRequirement.trim() || !coOrgDeadline) return;
    addCoOrganizer(ticket.id, {
      unit: coOrgUnit as HandlerUnit,
      requirement: coOrgRequirement,
      deadline: coOrgDeadline,
    }, '督办员');
    setCoOrgUnit('');
    setCoOrgRequirement('');
    setCoOrgDeadline('');
    setShowCoOrgModal(false);
  };

  const handleUpdateCoOrgProgress = () => {
    if (!coOrgProgressText.trim() || !selectedCoOrganizerId) return;
    updateCoOrgProgress(ticket.id, selectedCoOrganizerId, coOrgProgressText, '协办单位经办人');
    setCoOrgProgressText('');
    setSelectedCoOrganizerId('');
    setShowCoOrgProgressModal(false);
  };

  const handleCompleteCoOrganizer = () => {
    if (!coOrgResult.trim() || !selectedCoOrganizerId) return;
    completeCoOrganizer(ticket.id, selectedCoOrganizerId, coOrgResult, '协办单位经办人');
    setCoOrgResult('');
    setSelectedCoOrganizerId('');
    setShowCoOrgCompleteModal(false);
  };

  const openCoOrgProgressModal = (coOrgId: string) => {
    setSelectedCoOrganizerId(coOrgId);
    setShowCoOrgProgressModal(true);
  };

  const openCoOrgCompleteModal = (coOrgId: string) => {
    setSelectedCoOrganizerId(coOrgId);
    setShowCoOrgCompleteModal(true);
  };

  const getSatisfactionIcon = (level: SatisfactionLevel) => {
    switch (level) {
      case 'very_satisfied':
      case 'satisfied':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'dissatisfied':
      case 'very_dissatisfied':
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSatisfactionColor = (level: SatisfactionLevel) => {
    switch (level) {
      case 'very_satisfied': return 'text-green-600 bg-green-50 border-green-200';
      case 'satisfied': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'neutral': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'dissatisfied': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'very_dissatisfied': return 'text-red-600 bg-red-50 border-red-200';
    }
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
        
        {currentRole === 'supervisor' && ticket.status !== 'completed' && ticket.status !== 'archived' && (
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

        {currentRole === 'supervisor' && ticket.status === 'completed' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowArchiveModal(true)}
              className="inline-flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
            >
              <Archive className="h-4 w-4" />
              <span>归档复盘</span>
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
                <div className="flex items-center space-x-2">
                  {isCoOrganizing(ticket) && (
                    ticket.status === 'completed' || ticket.status === 'archived' ? (
                      <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/40 border border-amber-300/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                        <AlertTriangle className="h-3 w-3" />
                        <span>含未完成协办</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 rounded-full bg-indigo-500/30 border border-indigo-300/50 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                        <Users className="h-3 w-3" />
                        <span>协办中</span>
                      </span>
                    )
                  )}
                  <StatusBadge status={ticket.status} />
                </div>
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
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center flex-wrap gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>办理结果</span>
                    {hasUncompletedCoOrg && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        含未完成协办
                      </span>
                    )}
                  </h3>
                  <div className={clsx(
                    'rounded-lg border p-4',
                    hasUncompletedCoOrg 
                      ? 'bg-amber-50 border-amber-200' 
                      : 'bg-green-50 border-green-200'
                  )}>
                    <p className="text-sm text-gray-700 leading-relaxed">{ticket.result}</p>
                    {hasUncompletedCoOrg && (
                      <p className="mt-3 text-xs text-amber-700 flex items-start space-x-1">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span>
                          该工单提交办理结果时仍有 {uncompletedCoOrganizers.length} 个协办单位未完成工作：
                          {uncompletedCoOrganizers.map(co => co.unit).join('、')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Archive Info */}
              {ticket.archiveInfo && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Archive className="h-4 w-4 text-purple-500 mr-2" />
                    归档复盘信息
                  </h3>
                  <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">满意度</p>
                        <span className={clsx(
                          'inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-sm font-medium border',
                          getSatisfactionColor(ticket.archiveInfo.satisfaction)
                        )}>
                          {getSatisfactionIcon(ticket.archiveInfo.satisfaction)}
                          <span>{SATISFACTION_LABELS[ticket.archiveInfo.satisfaction]}</span>
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">办结质量</p>
                        <span className="text-sm font-medium text-gray-900">
                          {QUALITY_LABELS[ticket.archiveInfo.quality]}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">归档人</p>
                        <p className="text-sm font-medium text-gray-900">{ticket.archiveInfo.operator}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">归档时间</p>
                        <p className="text-sm font-medium text-gray-900">{ticket.archiveInfo.archiveTime}</p>
                      </div>
                    </div>
                    
                    {ticket.archiveInfo.problemTags.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2">问题标签</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ticket.archiveInfo.problemTags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">复盘备注</p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {ticket.archiveInfo.reviewNote || '无'}
                      </p>
                    </div>
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
                  {coOrgTotalCount > 0 && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="h-4 w-4 text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-800">协办单位完成情况</span>
                      </div>
                      <p className="text-sm text-indigo-700">
                        共 <span className="font-semibold">{coOrgTotalCount}</span> 个协办单位，
                        已完成 <span className="font-semibold text-green-600">{coOrgCompletedCount}</span> 个，
                        进行中 <span className="font-semibold text-orange-600">{coOrgTotalCount - coOrgCompletedCount}</span> 个
                      </p>
                      {coOrgCompletedCount < coOrgTotalCount && (
                        <p className="text-xs text-indigo-600 mt-2">
                          提示：部分协办单位尚未完成，您仍可提交最终办理结果
                        </p>
                      )}
                    </div>
                  )}

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

                  {/* Knowledge Recommendations */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">知识库推荐</span>
                      {knowledgeRecommendationsForResult.length > 0 && (
                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                          {knowledgeRecommendationsForResult.length} 条
                        </span>
                      )}
                      <button
                        onClick={() => navigate('/knowledge-base')}
                        className="ml-auto text-xs text-amber-600 hover:text-amber-700"
                      >
                        查看全部 →
                      </button>
                    </div>
                    {knowledgeRecommendationsForResult.length === 0 ? (
                      <p className="text-xs text-amber-600">
                        暂无匹配的知识条目，可前往知识库管理查看全部
                      </p>
                    ) : (
                      <>
                        {/* Insert Mode Selector */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-200/50">
                          <span className="text-xs text-amber-700">模板插入方式：</span>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => setResultTemplateMode('replace')}
                              className={clsx(
                                'px-2 py-0.5 text-xs rounded transition-colors',
                                resultTemplateMode === 'replace'
                                  ? 'bg-amber-200 text-amber-800 font-medium'
                                  : 'text-amber-600 hover:bg-amber-100'
                              )}
                            >
                              替换
                            </button>
                            <button
                              onClick={() => setResultTemplateMode('append')}
                              className={clsx(
                                'px-2 py-0.5 text-xs rounded transition-colors',
                                resultTemplateMode === 'append'
                                  ? 'bg-amber-200 text-amber-800 font-medium'
                                  : 'text-amber-600 hover:bg-amber-100'
                              )}
                            >
                              追加
                            </button>
                            <button
                              onClick={() => setResultTemplateMode('prepend')}
                              className={clsx(
                                'px-2 py-0.5 text-xs rounded transition-colors',
                                resultTemplateMode === 'prepend'
                                  ? 'bg-amber-200 text-amber-800 font-medium'
                                  : 'text-amber-600 hover:bg-amber-100'
                              )}
                            >
                              前置
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {knowledgeRecommendationsForResult.map((match, index) => (
                            <div
                              key={match.entry.id}
                              className={clsx(
                                'rounded-lg border transition-all overflow-hidden',
                                index === 0
                                  ? 'border-amber-300 bg-white'
                                  : 'border-amber-200 bg-white/70'
                              )}
                            >
                              {/* Header */}
                              <div
                                className="p-2.5 cursor-pointer hover:bg-amber-50/50 transition-colors"
                                onClick={() => toggleKnowledgeResultExpand(match.entry.id)}
                              >
                                <div className="flex items-start justify-between mb-1">
                                  <div className="flex items-start space-x-2">
                                    {index === 0 && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                                        最佳
                                      </span>
                                    )}
                                    <span className="text-xs font-medium text-gray-800">
                                      {match.entry.title}
                                    </span>
                                  </div>
                                  <span className={clsx(
                                    'text-xs font-semibold px-1.5 py-0.5 rounded',
                                    getScoreBadgeColor(match.score)
                                  )}>
                                    {match.score}分
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-1">
                                  {getKnowledgeMatchReasonText(match)}
                                </p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-400">
                                      {match.entry.recommendedUnit}
                                    </span>
                                    {match.entry.useCount > 0 && (
                                      <span className={clsx(
                                        'text-xs flex items-center space-x-0.5 font-medium',
                                        match.entry.useCount > 100 ? 'text-green-600' :
                                        match.entry.useCount > 50 ? 'text-amber-600' : 'text-gray-500'
                                      )}>
                                        <TrendingUp className="h-3 w-3" />
                                        <span>{match.entry.useCount}次</span>
                                      </span>
                                    )}
                                    {match.entry.lastUsedTime && (
                                      <span className="text-xs text-gray-400">
                                        • {match.entry.lastUsedTime.split(' ')[0]}
                                      </span>
                                    )}
                                  </div>
                                  <ChevronDown
                                    className={clsx(
                                      'h-3.5 w-3.5 text-amber-400 transition-transform',
                                      expandedKnowledgeResultId === match.entry.id && 'rotate-180'
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Expanded Content */}
                              {expandedKnowledgeResultId === match.entry.id && (
                                <div className="px-2.5 pb-2.5 space-y-2.5 border-t border-amber-200/50 pt-2.5">
                                  {/* Key Points */}
                                  {match.entry.keyPoints && (
                                    <div className="rounded bg-amber-50 border border-amber-200/50 p-2">
                                      <p className="text-xs font-medium text-amber-800 mb-1 flex items-center space-x-1">
                                        <Lightbulb className="h-3 w-3" />
                                        <span>办理要点</span>
                                      </p>
                                      <p className="text-xs text-amber-700 whitespace-pre-wrap">
                                        {match.entry.keyPoints.slice(0, 80)}
                                        {match.entry.keyPoints.length > 80 && '...'}
                                      </p>
                                    </div>
                                  )}

                                  {/* Template Preview */}
                                  <div>
                                    <p className="text-xs font-medium text-gray-700 mb-1">
                                      模板预览
                                    </p>
                                    <div className="rounded bg-gray-50 border border-gray-200 p-2 max-h-20 overflow-y-auto">
                                      <p className="text-xs text-gray-600 whitespace-pre-wrap">
                                        {match.entry.replyTemplate.slice(0, 100)}
                                        {match.entry.replyTemplate.length > 100 && '...'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Apply Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      applyKnowledgeToResult(match);
                                    }}
                                    className="w-full py-1.5 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition-colors"
                                  >
                                    {resultTemplateMode === 'replace' ? '应用模板' :
                                      resultTemplateMode === 'append' ? '追加到末尾' : '插入到开头'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
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

          {/* Co-organizer Section */}
          {(ticket.coOrganizers && ticket.coOrganizers.length > 0) || currentRole === 'supervisor' ? (
            <div ref={coOrgSectionRef} className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900 flex items-center">
                  <Users className="h-5 w-5 text-indigo-600 mr-2" />
                  协办单位
                  {ticket.coOrganizers && ticket.coOrganizers.length > 0 && (
                    <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      {coOrgCompletedCount}/{coOrgTotalCount} 已完成
                    </span>
                  )}
                </h3>
                {currentRole === 'supervisor' && ticket.status !== 'completed' && ticket.status !== 'archived' && (
                  <button
                    onClick={() => setShowCoOrgModal(true)}
                    className="inline-flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    <span>发起协办</span>
                  </button>
                )}
              </div>

              {ticket.coOrganizers && ticket.coOrganizers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-100">
                  <button
                    onClick={() => setCoOrgFilter('all')}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                      coOrgFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    全部 ({coOrgTotalCount})
                  </button>
                  <button
                    onClick={() => setCoOrgFilter('pending')}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                      coOrgFilter === 'pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                    )}
                  >
                    未完成 ({coOrgPendingCount})
                  </button>
                  <button
                    onClick={() => setCoOrgFilter('processing')}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                      coOrgFilter === 'processing'
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    )}
                  >
                    处理中 ({coOrgProcessingCount})
                  </button>
                  <button
                    onClick={() => setCoOrgFilter('completed')}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                      coOrgFilter === 'completed'
                        ? 'bg-green-500 text-white'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    )}
                  >
                    已完成 ({coOrgCompletedCount})
                  </button>
                </div>
              )}

              {(!ticket.coOrganizers || ticket.coOrganizers.length === 0) ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">暂无协办单位</p>
                </div>
              ) : filteredCoOrganizers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">暂无符合条件的协办单位</p>
                </div>
              ) : coOrgFilter === 'all' ? (
                <div className="space-y-6">
                  {(['pending', 'processing', 'completed'] as const).map((status) => (
                    groupedCoOrganizers[status].length > 0 && (
                      <div key={status}>
                        <div className="flex items-center space-x-2 mb-3">
                          <div className={clsx(
                            'w-1.5 h-1.5 rounded-full',
                            status === 'completed' ? 'bg-green-500' :
                            status === 'processing' ? 'bg-blue-500' : 'bg-yellow-500'
                          )} />
                          <h4 className="text-sm font-medium text-gray-700">
                            {status === 'pending' && '未完成'}
                            {status === 'processing' && '处理中'}
                            {status === 'completed' && '已完成'}
                            <span className="ml-1.5 text-xs text-gray-400 font-normal">
                              ({groupedCoOrganizers[status].length})
                            </span>
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {groupedCoOrganizers[status].map((coOrg) => (
                            <CoOrganizerCard
                              key={coOrg.id}
                              coOrg={coOrg}
                              isExpanded={expandedCoOrgId === coOrg.id}
                              onToggle={() => setExpandedCoOrgId(prev => prev === coOrg.id ? null : coOrg.id)}
                              onUpdateProgress={openCoOrgProgressModal}
                              onComplete={openCoOrgCompleteModal}
                              showActions={currentRole === 'handler' && currentUnit === coOrg.unit}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCoOrganizers.map((coOrg) => (
                    <CoOrganizerCard
                      key={coOrg.id}
                      coOrg={coOrg}
                      isExpanded={expandedCoOrgId === coOrg.id}
                      onToggle={() => setExpandedCoOrgId(prev => prev === coOrg.id ? null : coOrg.id)}
                      onUpdateProgress={openCoOrgProgressModal}
                      onComplete={openCoOrgCompleteModal}
                      showActions={currentRole === 'handler' && currentUnit === coOrg.unit}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Right Column - Timeline & Attachments */}
        <div className="space-y-6">
          {/* Tabs */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('timeline')}
                className={clsx(
                  'flex-1 px-3 py-3 text-sm font-medium transition-colors',
                  activeTab === 'timeline'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                时间线
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={clsx(
                  'flex-1 px-3 py-3 text-sm font-medium transition-colors',
                  activeTab === 'attachments'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                附件 ({ticket.attachments.length})
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={clsx(
                  'flex-1 px-3 py-3 text-sm font-medium transition-colors',
                  activeTab === 'archive'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                归档复盘
              </button>
            </div>
            
            <div className="p-5 max-h-[500px] overflow-y-auto">
              {activeTab === 'timeline' && (
                <Timeline logs={ticket.progressLogs} />
              )}
              
              {activeTab === 'attachments' && (
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

              {activeTab === 'archive' && (
                <div className="space-y-4">
                  {ticket.archiveInfo ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">满意度</span>
                        <span className={clsx(
                          'inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                          getSatisfactionColor(ticket.archiveInfo.satisfaction)
                        )}>
                          {getSatisfactionIcon(ticket.archiveInfo.satisfaction)}
                          <span>{SATISFACTION_LABELS[ticket.archiveInfo.satisfaction]}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">办结质量</span>
                        <span className="text-sm font-medium text-gray-900">
                          {QUALITY_LABELS[ticket.archiveInfo.quality]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">归档人</span>
                        <span className="text-sm text-gray-700">{ticket.archiveInfo.operator}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">归档时间</span>
                        <span className="text-sm text-gray-700">{ticket.archiveInfo.archiveTime}</span>
                      </div>
                      
                      {ticket.archiveInfo.problemTags.length > 0 && (
                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-2">问题标签</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ticket.archiveInfo.problemTags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">复盘备注</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {ticket.archiveInfo.reviewNote || '无'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <Archive className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">暂无归档信息</p>
                      {currentRole === 'supervisor' && ticket.status === 'completed' && (
                        <button
                          onClick={() => setShowArchiveModal(true)}
                          className="mt-3 inline-flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          <Archive className="h-4 w-4 mr-1" />
                          立即归档
                        </button>
                      )}
                    </div>
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
                                  rule: {
                                    id: match.ruleId,
                                    name: match.ruleName,
                                    category: '',
                                    area: '',
                                    keywords: [],
                                    handlerUnit: ticket.handlerUnit,
                                    deadlineDays: ticket.dispatchInfo.recommendedDeadlineDays || 7,
                                    priority: 0,
                                    enabled: true,
                                    createTime: ticket.dispatchInfo.dispatchTime,
                                    updateTime: ticket.dispatchInfo.dispatchTime,
                                  },
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
              {coOrgTotalCount > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-sm text-gray-500">协办单位</span>
                  <span className="text-sm font-medium text-indigo-600">
                    {coOrgCompletedCount}/{coOrgTotalCount} 已完成
                  </span>
                </div>
              )}
              {currentUserCoOrganizer && (
                <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 mt-2">
                  <p className="text-xs font-medium text-indigo-700 flex items-center">
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    您所在单位是协办单位
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">
                    状态：{CO_ORG_STATUS_LABELS[currentUserCoOrganizer.status]}
                  </p>
                </div>
              )}
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

      {/* Archive Modal */}
      {showArchiveModal && (
        <ArchiveModal
          ticket={ticket}
          isOpen={showArchiveModal}
          onClose={() => setShowArchiveModal(false)}
          onSubmit={handleArchive}
        />
      )}

      {/* Add Co-organizer Modal */}
      {showCoOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">发起协办</h3>
              <button
                onClick={() => setShowCoOrgModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  协办单位
                </label>
                <select
                  value={coOrgUnit}
                  onChange={(e) => setCoOrgUnit(e.target.value as HandlerUnit)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                >
                  <option value="">请选择协办单位</option>
                  {HANDLER_UNITS.filter(unit => 
                    unit !== ticket.handlerUnit && 
                    !ticket.coOrganizers?.some(co => co.unit === unit)
                  ).map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  协办要求
                </label>
                <textarea
                  value={coOrgRequirement}
                  onChange={(e) => setCoOrgRequirement(e.target.value)}
                  placeholder="请描述协办事项和要求..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  协办期限
                </label>
                <input
                  type="date"
                  value={coOrgDeadline}
                  onChange={(e) => setCoOrgDeadline(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowCoOrgModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddCoOrganizer}
                disabled={!coOrgUnit || !coOrgRequirement.trim() || !coOrgDeadline}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认发起
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Co-org Progress Modal */}
      {showCoOrgProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">更新协办进度</h3>
              <button
                onClick={() => setShowCoOrgProgressModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                进度说明
              </label>
              <textarea
                value={coOrgProgressText}
                onChange={(e) => setCoOrgProgressText(e.target.value)}
                placeholder="请描述当前办理进度..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div className="flex justify-end space-x-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowCoOrgProgressModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpdateCoOrgProgress}
                disabled={!coOrgProgressText.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                提交进度
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Co-organizer Modal */}
      {showCoOrgCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">完成协办</h3>
              <button
                onClick={() => setShowCoOrgCompleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                协办结果
              </label>
              <textarea
                value={coOrgResult}
                onChange={(e) => setCoOrgResult(e.target.value)}
                placeholder="请详细填写协办结果..."
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            <div className="flex justify-end space-x-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowCoOrgCompleteModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCompleteCoOrganizer}
                disabled={!coOrgResult.trim()}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uncompleted Co-org Warning Modal */}
      {showCoOrgWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">存在未完成协办事项</h3>
                <p className="text-xs text-gray-500 mt-0.5">以下协办单位尚未完成协办工作</p>
              </div>
            </div>
            <div className="p-6">
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 mb-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="h-4 w-4 text-amber-700" />
                  <span className="text-sm font-medium text-amber-800">
                    未完成协办单位（共 {uncompletedCoOrganizers.length} 个）
                  </span>
                </div>
                <div className="space-y-2">
                  {uncompletedCoOrganizers.map((coOrg) => (
                    <div
                      key={coOrg.id}
                      className="flex items-center justify-between rounded-lg bg-white border border-amber-200/60 px-3 py-2"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className={clsx(
                          'flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0',
                          coOrg.status === 'processing' ? 'bg-blue-100' : 'bg-yellow-100'
                        )}>
                          {coOrg.status === 'processing'
                            ? <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                            : <Clock4 className="h-3.5 w-3.5 text-yellow-600" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{coOrg.unit}</p>
                          <p className="text-xs text-gray-500 truncate">
                            要求：{coOrg.requirement}
                          </p>
                        </div>
                      </div>
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ml-2',
                        coOrg.status === 'processing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      )}>
                        {CO_ORG_STATUS_LABELS[coOrg.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                继续提交将忽略未完成的协办事项，直接将工单标记为已办结，并在时间线中记录相关说明。督办员也将收到该工单仍有未完成协办的通知。
              </p>
            </div>
            <div className="flex justify-between space-x-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowCoOrgWarningModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                返回等待
              </button>
              <button
                onClick={() => doSubmitResult(true)}
                className="inline-flex items-center space-x-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>继续提交</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
