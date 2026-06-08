export type TicketStatus = 'pending' | 'processing' | 'completed' | 'overdue' | 'returned' | 'archived';

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
  | 'archive';

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

export type SatisfactionLevel = 'satisfied' | 'neutral' | 'unsatisfied';

export type CompletionQuality = 'excellent' | 'qualified' | 'poor';

export interface ArchiveReview {
  id: string;
  ticketId: string;
  satisfaction: SatisfactionLevel;
  completionQuality: CompletionQuality;
  issueTags: string[];
  remark: string;
  archivedBy: string;
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
  archiveInfo?: ArchiveReview;
  dispatchInfo?: DispatchInfo;
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
}

export interface ArchiveFilterOptions {
  handlerUnit: HandlerUnit | '';
  category: TicketCategory | '';
  satisfaction: SatisfactionLevel | '';
  archiveTimeRange: '' | 'today' | '7days' | '30days' | '90days';
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

export const SATISFACTION_LABELS: Record<SatisfactionLevel, string> = {
  satisfied: '满意',
  neutral: '基本满意',
  unsatisfied: '不满意',
};

export const COMPLETION_QUALITY_LABELS: Record<CompletionQuality, string> = {
  excellent: '优秀',
  qualified: '合格',
  poor: '不合格',
};

export const ARCHIVE_ISSUE_TAGS = [
  '响应及时',
  '处理彻底',
  '沟通充分',
  '材料完整',
  '答复不清',
  '办理超期',
  '群众重复反映',
  '需专项跟进',
];

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
