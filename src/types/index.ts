export type TicketStatus = 'pending' | 'processing' | 'completed' | 'overdue' | 'returned';

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
}

export interface FilterOptions {
  status: TicketStatus | '';
  area: Area | '';
  handlerUnit: HandlerUnit | '';
  category: TicketCategory | '';
  deadlineRange: string;
}

export type RiskLevel = 'high' | 'medium' | 'low';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: '待办理',
  processing: '办理中',
  completed: '已办结',
  overdue: '已超期',
  returned: '已退回',
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
