export type TicketStatus = 'pending' | 'processing' | 'completed' | 'overdue' | 'returned' | 'archived';

export type SatisfactionLevel = 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied' | 'very_dissatisfied';

export type QualityLevel = 'excellent' | 'good' | 'average' | 'poor' | 'very_poor';

export type ProblemTag = 
  | '响应及时'
  | '服务态度好'
  | '处理专业'
  | '沟通顺畅'
  | '结果满意'
  | '流程繁琐'
  | '办理时间长'
  | '结果不理想'
  | '沟通不畅'
  | '需要改进';

export const PROBLEM_TAGS: ProblemTag[] = [
  '响应及时',
  '服务态度好',
  '处理专业',
  '沟通顺畅',
  '结果满意',
  '流程繁琐',
  '办理时间长',
  '结果不理想',
  '沟通不畅',
  '需要改进',
];

export const SATISFACTION_LABELS: Record<SatisfactionLevel, string> = {
  very_satisfied: '非常满意',
  satisfied: '满意',
  neutral: '一般',
  dissatisfied: '不满意',
  very_dissatisfied: '非常不满意',
};

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  excellent: '优秀',
  good: '良好',
  average: '一般',
  poor: '较差',
  very_poor: '很差',
};

export type TicketCategory = 
  | '城市管理' 
  | '交通运输' 
  | '住房建设' 
  | '劳动社保' 
  | '教育文化' 
  | '医疗卫生' 
  | '环境保护' 
  | '市场监管';

export type Area = 
  | '东城区' 
  | '西城区' 
  | '朝阳区' 
  | '海淀区' 
  | '丰台区' 
  | '石景山区' 
  | '通州区' 
  | '昌平区';

export type HandlerUnit = 
  | '城市管理委员会' 
  | '交通委员会' 
  | '住房和城乡建设委员会' 
  | '人力资源和社会保障局' 
  | '教育委员会' 
  | '卫生健康委员会' 
  | '生态环境局' 
  | '市场监督管理局';

export type ProgressLogType = 
  | 'create' 
  | 'assign' 
  | 'progress' 
  | 'complete' 
  | 'urge' 
  | 'return' 
  | 'archive'
  | 'coorg_assign'
  | 'coorg_progress'
  | 'coorg_complete'
  | 'complete_ignore_coorg';

export interface ProgressLog {
  id: string;
  ticketId: string;
  content: string;
  operator: string;
  createTime: string;
  type: ProgressLogType;
}

export interface Attachment {
  id: string;
  ticketId: string;
  name: string;
  size: string;
  uploadTime: string;
}

export interface UrgeRecord {
  id: string;
  ticketId: string;
  reason: string;
  operator: string;
  createTime: string;
}

export interface ReturnRecord {
  id: string;
  ticketId: string;
  reason: string;
  operator: string;
  createTime: string;
}

export type CoOrgStatus = 'pending' | 'processing' | 'completed';

export const CO_ORG_STATUS_LABELS: Record<CoOrgStatus, string> = {
  pending: '待协办',
  processing: '协办中',
  completed: '已完成',
};

export interface CoOrganizer {
  id: string;
  ticketId: string;
  unit: HandlerUnit;
  status: CoOrgStatus;
  requirement: string;
  deadline: string;
  assignee?: string;
  result?: string;
  progressLogs: CoOrgProgressLog[];
  assignTime: string;
  completeTime?: string;
}

export interface CoOrgProgressLog {
  id: string;
  coOrganizerId: string;
  ticketId: string;
  content: string;
  operator: string;
  createTime: string;
}

export interface ArchiveInfo {
  id: string;
  ticketId: string;
  satisfaction: SatisfactionLevel;
  quality: QualityLevel;
  problemTags: ProblemTag[];
  reviewNote: string;
  operator: string;
  archiveTime: string;
}

export interface Ticket {
  id: string;
  title: string;
  category: TicketCategory;
  area: Area;
  content: string;
  assignTime: string;
  deadline: string;
  handlerUnit: HandlerUnit;
  status: TicketStatus;
  creator: string;
  handler?: string;
  result?: string;
  progressLogs: ProgressLog[];
  attachments: Attachment[];
  urgeRecords: UrgeRecord[];
  returnRecords: ReturnRecord[];
  coOrganizers: CoOrganizer[];
  dispatchInfo?: DispatchInfo;
  archiveInfo?: ArchiveInfo;
}

export interface ArchiveFilterOptions {
  handlerUnit: HandlerUnit | '';
  category: TicketCategory | '';
  satisfaction: SatisfactionLevel | '';
  archiveTimeRange: string;
  hasCoOrganizer: 'all' | 'yes' | 'no';
}

export interface DispatchInfo {
  matchedRules: {
    ruleId: string;
    ruleName: string;
    matchedFields: string[];
    matchedKeywords: string[];
    score: number;
  }[];
  recommendedUnit: HandlerUnit | null;
  recommendedDeadlineDays: number | null;
  appliedRecommendation: boolean;
  hasConflict: boolean;
  dispatchMethod: 'auto' | 'manual' | 'recommended';
  dispatchOperator: string;
  dispatchTime: string;
}

export interface FilterOptions {
  status: TicketStatus | '';
  area: Area | '';
  handlerUnit: HandlerUnit | '';
  category: TicketCategory | '';
  deadlineRange: string;
  hasCoOrganizer: 'all' | 'yes' | 'no';
  assignDate: string;
}

export interface FilterView {
  id: string;
  name: string;
  filterOptions: FilterOptions;
  createTime: string;
}

export type RiskLevel = 'high' | 'medium' | 'low';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: '待办理',
  processing: '办理中',
  completed: '已办结',
  overdue: '已超期',
  returned: '已退回',
  archived: '已归档',
};

export const CATEGORIES: TicketCategory[] = [
  '城市管理',
  '交通运输',
  '住房建设',
  '劳动社保',
  '教育文化',
  '医疗卫生',
  '环境保护',
  '市场监管',
];

export const AREAS: Area[] = [
  '东城区',
  '西城区',
  '朝阳区',
  '海淀区',
  '丰台区',
  '石景山区',
  '通州区',
  '昌平区',
];

export const HANDLER_UNITS: HandlerUnit[] = [
  '城市管理委员会',
  '交通委员会',
  '住房和城乡建设委员会',
  '人力资源和社会保障局',
  '教育委员会',
  '卫生健康委员会',
  '生态环境局',
  '市场监督管理局',
];

export interface ContactPerson {
  id: string;
  unit: HandlerUnit;
  name: string;
  phone: string;
  position: string;
  isOnDuty: boolean;
  remark?: string;
}

export interface UnitContact {
  unit: HandlerUnit;
  contacts: ContactPerson[];
}

export interface DispatchRule {
  id: string;
  name: string;
  category: TicketCategory | '';
  area: Area | '';
  keywords: string[];
  handlerUnit: HandlerUnit;
  deadlineDays: number;
  priority: number;
  enabled: boolean;
  description?: string;
  createTime: string;
  updateTime: string;
}

export interface MatchResult {
  rule: DispatchRule;
  matchedFields: string[];
  matchedKeywords: string[];
  score: number;
}

export interface DispatchRecommendation {
  handlerUnit: HandlerUnit | null;
  deadlineDays: number | null;
  matchedRules: MatchResult[];
  hasConflict: boolean;
  conflictReason?: string;
}

export type HolidayType = 'holiday' | 'workday';

export interface HolidayConfig {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  year: number;
  createTime: string;
  updateTime: string;
}

export interface SLARule {
  id: string;
  name: string;
  category: TicketCategory | '';
  handlerUnit: HandlerUnit | '';
  deadlineDays: number;
  priority: number;
  enabled: boolean;
  description?: string;
  createTime: string;
  updateTime: string;
}

export interface SLAMatchResult {
  rule: SLARule;
  matchedFields: string[];
  score: number;
}

export interface SLARecommendation {
  deadlineDays: number | null;
  matchedRules: SLAMatchResult[];
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: TicketCategory | '';
  keywords: string[];
  synonyms?: string[];
  recommendedUnit: HandlerUnit;
  replyTemplate: string;
  keyPoints: string;
  enabled: boolean;
  useCount: number;
  createTime: string;
  updateTime: string;
  lastUsedTime?: string;
}

export interface KnowledgeMatchResult {
  entry: KnowledgeEntry;
  matchedFields: string[];
  matchedKeywords: string[];
  matchedSynonyms?: string[];
  score: number;
  scoreBreakdown?: {
    category: number;
    area: number;
    keywordTitle: number;
    keywordContent: number;
    synonymTitle: number;
    synonymContent: number;
    titleBonus: number;
    useCountBonus: number;
  };
}

export interface KnowledgeSearchParams {
  title?: string;
  content?: string;
  category?: TicketCategory | '';
  area?: Area | '';
}

export type TemplateInsertMode = 'replace' | 'append' | 'prepend';

export interface TemplateApplyOptions {
  mode: TemplateInsertMode;
  replacePlaceholders?: boolean;
  context?: {
    title?: string;
    category?: string;
    area?: string;
    handlerUnit?: string;
    contactName?: string;
    contactPhone?: string;
    [key: string]: string | undefined;
  };
}

export type NotificationType = 'urge' | 'return' | 'overdue_soon' | 'coorg_request' | 'result_submit';

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  urge: '催办通知',
  return: '退回重办',
  overdue_soon: '即将超期',
  coorg_request: '协办请求',
  result_submit: '办理结果',
};

export type NotificationAudience = 'supervisor' | 'handler_unit' | 'coorg_unit' | 'all';

export type OverdueRiskStage = 'overdue' | 'within_1_day' | 'within_3_days';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  ticketId: string;
  ticketTitle: string;
  isRead: boolean;
  createTime: string;
  operator?: string;
  relatedId?: string;
  audience?: NotificationAudience;
  targetUnit?: string;
  riskStage?: OverdueRiskStage;
  remainingWorkdays?: number;
  hasUncompletedCoOrg?: boolean;
}

export type ImpactSeverity = 'low' | 'medium' | 'high' | 'critical';

export type HolidayChangeType = 'add' | 'update' | 'delete' | 'reset';

export interface HistoricalTicketImpact {
  ticketId: string;
  ticketTitle: string;
  handlerUnit: string;
  deadline: string;
  oldRemainingWorkdays: number;
  newRemainingWorkdays: number;
  workdaysChange: number;
  oldRiskLevel: RiskLevel;
  newRiskLevel: RiskLevel;
  riskLevelChanged: boolean;
  oldIsOverdue: boolean;
  newIsOverdue: boolean;
  overdueStatusChanged: boolean;
  isCoOrg: boolean;
  coOrgUnit?: string;
  coOrgDeadline?: string;
}

export interface HolidayChangeRecord {
  id: string;
  changeType: HolidayChangeType;
  changeDescription: string;
  oldHolidayDates: string[];
  oldWorkdayDates: string[];
  newHolidayDates: string[];
  newWorkdayDates: string[];
  affectedOpenTickets: number;
  affectedHistoricalTickets: number;
  newlyOverdue: number;
  noLongerOverdue: number;
  riskElevated: number;
  riskReduced: number;
  notificationsCreated: number;
  notificationsInvalidated: number;
  operator: string;
  createTime: string;
}
