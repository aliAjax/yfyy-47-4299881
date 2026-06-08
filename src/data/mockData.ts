import {
  Ticket,
  TicketCategory,
  Area,
  HandlerUnit,
  ProgressLog,
  ContactPerson,
  DispatchRule,
  HolidayConfig,
  KnowledgeBaseEntry,
  SLARule,
  ArchiveReview,
} from '@/types';
import { addDays, formatDate, generateId, formatDateTime } from '@/utils/date';

const now = new Date();

function createMockTicket(
  id: string,
  title: string,
  category: TicketCategory,
  area: Area,
  content: string,
  handlerUnit: HandlerUnit,
  status: Ticket['status'],
  daysAgo: number,
  deadlineDays: number,
  hasProgress: boolean = true
): Ticket {
  const assignTime = addDays(now, -daysAgo);
  const deadline = addDays(assignTime, deadlineDays);

  const progressLogs: ProgressLog[] = [
    {
      id: generateId(),
      ticketId: id,
      content: '工单已创建',
      operator: '热线坐席员',
      createTime: formatDate(assignTime) + ' 09:30',
      type: 'create' as const,
    },
    {
      id: generateId(),
      ticketId: id,
      content: `工单已分派至${handlerUnit}`,
      operator: '工单调度员',
      createTime: formatDate(assignTime) + ' 10:00',
      type: 'assign' as const,
    },
  ];

  if (hasProgress && status !== 'pending') {
    progressLogs.push({
      id: generateId(),
      ticketId: id,
      content: '已接收工单，正在核实情况中',
      operator: '承办单位经办人',
      createTime: formatDate(addDays(assignTime, 1)) + ' 14:20',
      type: 'progress' as const,
    });
  }

  if (status === 'completed') {
    progressLogs.push({
      id: generateId(),
      ticketId: id,
      content: '已完成办理，提交办理结果已提交',
      operator: '承办单位经办人',
      createTime: formatDate(addDays(assignTime, deadlineDays - 1)) + ' 16:45',
      type: 'complete' as const,
    });
  }

  let archiveInfo: ArchiveReview | undefined;
  if (status === 'archived') {
    const completeTime = formatDate(addDays(assignTime, deadlineDays - 1)) + ' 16:45';
    const archiveTime = formatDate(addDays(assignTime, deadlineDays)) + ' 10:20';
    progressLogs.push({
      id: generateId(),
      ticketId: id,
      content: '已完成办理，提交办理结果已提交',
      operator: '承办单位经办人',
      createTime: completeTime,
      type: 'complete' as const,
    });
    progressLogs.push({
      id: generateId(),
      ticketId: id,
      content: '【归档复盘】满意度：满意，办结质量：优秀',
      operator: '督办员',
      createTime: archiveTime,
      type: 'archive' as const,
    });
    archiveInfo = {
      id: generateId(),
      ticketId: id,
      satisfaction: 'satisfied',
      completionQuality: 'excellent',
      issueTags: ['响应及时', '处理彻底', '材料完整'],
      remark: '承办单位按期反馈，现场处置材料完整，群众回访结果良好。',
      archivedBy: '督办员',
      archiveTime,
    };
  }

  if (status === 'returned') {
    progressLogs.push({
      id: generateId(),
      ticketId: id,
      content: '已完成办理，提交办理结果',
      operator: '承办单位经办人',
      createTime: formatDate(addDays(assignTime, 2)) + ' 15:30',
      type: 'complete' as const,
    });
    progressLogs.push({
      id: generateId(),
      ticketId: id,
      content: '办理结果不达标，退回重办',
      operator: '督办员',
      createTime: formatDate(addDays(assignTime, 3)) + ' 09:15',
      type: 'return' as const,
    });
  }

  return {
    id,
    title,
    category,
    area,
    content,
    assignTime: formatDate(assignTime) + ' 09:30',
    deadline: formatDate(deadline),
    handlerUnit,
    status,
    creator: '热线坐席员',
    handler: status !== 'pending' ? '张经办' : undefined,
    result: (status === 'completed' || status === 'archived') ? '已妥善处理群众反映的问题，相关情况如下：...' : undefined,
    progressLogs,
    attachments: (status === 'completed' || status === 'archived') ? [
      {
        id: generateId(),
        ticketId: id,
        name: '办理结果报告.pdf',
        size: '2.3MB',
        uploadTime: formatDate(addDays(assignTime, deadlineDays - 1)) + ' 16:40',
      },
    ] : [],
    archiveInfo,
    urgeRecords: status === 'overdue' ? [
      {
        id: generateId(),
        ticketId: id,
        reason: '工单即将超期，请加快办理进度',
        operator: '督办员',
        createTime: formatDate(deadline) + ' 10:00',
      },
    ] : [],
    returnRecords: status === 'returned' ? [
      {
        id: generateId(),
        ticketId: id,
        reason: '办理结果不详细，缺少具体处理措施',
        operator: '督办员',
        createTime: formatDate(addDays(assignTime, 3)) + ' 09:15',
      },
    ] : [],
  };
}

export const mockTickets: Ticket[] = [
  createMockTicket(
    'GD20240001',
    '关于东城区某街道路灯损坏的投诉',
    '城市管理',
    '东城区',
    '东城区建国门街道附近有多处路灯损坏，夜间出行不便，存在安全隐患。希望相关部门尽快维修。',
    '城市管理委员会',
    'processing',
    2,
    7
  ),
  createMockTicket(
    'GD20240002',
    '公交车站候车亭破损问题',
    '交通运输',
    '朝阳区',
    '朝阳区大望路公交站候车亭玻璃破损，座椅损坏，影响市民候车体验。',
    '交通委员会',
    'pending',
    1,
    5
  ),
  createMockTicket(
    'GD20240003',
    '小区物业管理问题投诉',
    '住房建设',
    '海淀区',
    '海淀区中关村某小区物业服务差，楼道卫生长期不打扫，电梯经常故障。',
    '住房和城乡建设委员会',
    'completed',
    10,
    15
  ),
  createMockTicket(
    'GD20240004',
    '社保缴费查询问题',
    '劳动社保',
    '西城区',
    '市民反映社保缴费记录查询不到，多次拨打社保电话打不通，希望帮忙解决。',
    '人力资源和社会保障局',
    'overdue',
    8,
    5
  ),
  createMockTicket(
    'GD20240005',
    '学校周边交通拥堵问题',
    '教育文化',
    '丰台区',
    '丰台区某小学上下学时段校门口交通拥堵严重，学生安全隐患大。',
    '教育委员会',
    'returned',
    5,
    10
  ),
  createMockTicket(
    'GD20240006',
    '医院排队挂号难问题',
    '医疗卫生',
    '通州区',
    '通州区某医院挂号难，预约挂号系统经常崩溃，现场排队时间太长。',
    '卫生健康委员会',
    'processing',
    3,
    7
  ),
  createMockTicket(
    'GD20240007',
    '工地噪音扰民投诉',
    '环境保护',
    '石景山区',
    '石景山区某工地夜间施工噪音大，影响周边居民休息。',
    '生态环境局',
    'pending',
    0,
    3
  ),
  createMockTicket(
    'GD20240008',
    '超市价格欺诈投诉',
    '市场监管',
    '昌平区',
    '昌平区某超市标价与结算价格不一致，涉嫌价格欺诈。',
    '市场监督管理局',
    'completed',
    12,
    10
  ),
  createMockTicket(
    'GD20240009',
    '道路坑洼不平问题',
    '城市管理',
    '朝阳区',
    '朝阳区望京地区多条道路坑洼不平，下雨天积水严重，影响通行。',
    '城市管理委员会',
    'processing',
    4,
    7
  ),
  createMockTicket(
    'GD20240010',
    '地铁线路运营时间调整建议',
    '交通运输',
    '海淀区',
    '建议地铁13号线延长运营时间，方便晚归市民出行。',
    '交通委员会',
    'pending',
    2,
    15
  ),
  createMockTicket(
    'GD20240011',
    '房屋漏水维修问题',
    '住房建设',
    '东城区',
    '东城区某老小区房屋漏水，多次报修物业不给维修。',
    '住房和城乡建设委员会',
    'overdue',
    15,
    10
  ),
  createMockTicket(
    'GD20240012',
    '餐厅卫生问题',
    '医疗卫生',
    '西城区',
    '西城区某餐厅卫生条件差，食品安全存卫生隐患。',
    '市场监督管理局',
    'completed',
    6,
    7
  ),
  createMockTicket(
    'GD20240013',
    '公园健身器材维修回访',
    '城市管理',
    '海淀区',
    '市民反映公园内部分健身器材松动，老人使用时存在安全隐患，希望尽快检修。',
    '城市管理委员会',
    'archived',
    18,
    7
  ),
  createMockTicket(
    'GD20240014',
    '社区卫生服务预约优化建议',
    '医疗卫生',
    '通州区',
    '市民建议社区卫生服务中心增加线上预约号源，减少现场排队时间。',
    '卫生健康委员会',
    'archived',
    20,
    10
  ),
];

function createMockContact(
  unit: HandlerUnit,
  name: string,
  phone: string,
  position: string,
  isOnDuty: boolean,
  remark?: string
): ContactPerson {
  return {
    id: generateId(),
    unit,
    name,
    phone,
    position,
    isOnDuty,
    remark,
  };
}

export const mockContacts: ContactPerson[] = [
  createMockContact('城市管理委员会', '张建国', '13800138001', '科长', true, '负责市容市貌管理工作'),
  createMockContact('城市管理委员会', '李晓华', '13800138002', '副科长', false, '分管环境卫生'),
  createMockContact('城市管理委员会', '王大勇', '13800138003', '科员', false, ''),

  createMockContact('交通委员会', '刘志强', '13800138004', '处长', true, '负责交通运输综合协调'),
  createMockContact('交通委员会', '陈美玲', '13800138005', '副处长', false, '分管公共交通'),
  createMockContact('交通委员会', '赵晓峰', '13800138006', '主任科员', false, ''),

  createMockContact('住房和城乡建设委员会', '孙伟华', '13800138007', '主任', true, '负责住建委全面工作'),
  createMockContact('住房和城乡建设委员会', '周丽娟', '13800138008', '副主任', false, '分管物业管理'),
  createMockContact('住房和城乡建设委员会', '吴建设', '13800138009', '科长', false, ''),

  createMockContact('人力资源和社会保障局', '郑晓东', '13800138010', '局长', true, '负责人社局全面工作'),
  createMockContact('人力资源和社会保障局', '钱秀兰', '13800138011', '副局长', false, '分管社保业务'),
  createMockContact('人力资源和社会保障局', '冯利民', '13800138012', '科长', false, ''),

  createMockContact('教育委员会', '褚卫东', '13800138013', '主任', true, '负责教委全面工作'),
  createMockContact('教育委员会', '卫老师', '13800138014', '副主任', false, '分管基础教育'),
  createMockContact('教育委员会', '蒋建国', '13800138015', '处长', false, ''),

  createMockContact('卫生健康委员会', '沈健康', '13800138016', '主任', true, '负责卫健委全面工作'),
  createMockContact('卫生健康委员会', '韩医生', '13800138017', '副主任', false, '分管医政医管'),
  createMockContact('卫生健康委员会', '杨护士', '13800138018', '处长', false, ''),

  createMockContact('生态环境局', '朱青山', '13800138019', '局长', true, '负责环保局全面工作'),
  createMockContact('生态环境局', '秦蓝天', '13800138020', '副局长', false, '分管环境监察'),
  createMockContact('生态环境局', '许绿水', '13800138021', '科长', false, ''),

  createMockContact('市场监督管理局', '何公平', '13800138022', '局长', true, '负责市监局全面工作'),
  createMockContact('市场监督管理局', '吕质量', '13800138023', '副局长', false, '分管食品安全'),
  createMockContact('市场监督管理局', '施维权', '13800138024', '科长', false, ''),
];

function createMockRule(
  name: string,
  category: TicketCategory | '',
  area: Area | '',
  keywords: string[],
  handlerUnit: HandlerUnit,
  deadlineDays: number,
  priority: number,
  description?: string
): DispatchRule {
  const nowStr = formatDateTime(new Date());
  return {
    id: generateId(),
    name,
    category,
    area,
    keywords,
    handlerUnit,
    deadlineDays,
    priority,
    enabled: true,
    description,
    createTime: nowStr,
    updateTime: nowStr,
  };
}

export const mockDispatchRules: DispatchRule[] = [
  createMockRule(
    '城市管理-东城区-路灯问题',
    '城市管理',
    '东城区',
    ['路灯', '照明', '灯不亮', '路灯损坏'],
    '城市管理委员会',
    3,
    100,
    '东城区路灯相关问题优先处理'
  ),
  createMockRule(
    '城市管理-朝阳区-道路问题',
    '城市管理',
    '朝阳区',
    ['道路', '坑洼', '积水', '路面', '井盖'],
    '城市管理委员会',
    7,
    90,
    '朝阳区道路养护相关问题'
  ),
  createMockRule(
    '交通运输-公交问题',
    '交通运输',
    '',
    ['公交', '公交车', '公交站', '候车亭', '站牌'],
    '交通委员会',
    5,
    80,
    '公共交通设施相关问题'
  ),
  createMockRule(
    '交通运输-地铁建议',
    '交通运输',
    '',
    ['地铁', '轨道交通', '运营时间', '地铁线路'],
    '交通委员会',
    15,
    70,
    '地铁运营相关建议'
  ),
  createMockRule(
    '住房建设-物业投诉',
    '住房建设',
    '',
    ['物业', '物业管理', '小区物业', '物业服务', '电梯'],
    '住房和城乡建设委员会',
    10,
    85,
    '物业管理相关投诉'
  ),
  createMockRule(
    '住房建设-房屋维修',
    '住房建设',
    '东城区',
    ['房屋漏水', '维修', '老小区', '房屋修缮'],
    '住房和城乡建设委员会',
    7,
    95,
    '东城区老旧小区房屋维修问题'
  ),
  createMockRule(
    '劳动社保-社保查询',
    '劳动社保',
    '',
    ['社保', '养老保险', '医疗保险', '缴费', '社保查询'],
    '人力资源和社会保障局',
    5,
    80,
    '社会保险相关问题'
  ),
  createMockRule(
    '教育文化-学校周边',
    '教育文化',
    '',
    ['学校', '小学', '中学', '校园', '学生安全', '交通拥堵'],
    '教育委员会',
    10,
    75,
    '学校周边环境问题'
  ),
  createMockRule(
    '医疗卫生-医院挂号',
    '医疗卫生',
    '',
    ['医院', '挂号', '排队', '预约', '看病难'],
    '卫生健康委员会',
    7,
    80,
    '医疗服务相关问题'
  ),
  createMockRule(
    '环境保护-噪音扰民',
    '环境保护',
    '',
    ['噪音', '噪声', '扰民', '施工噪音', '夜间施工'],
    '生态环境局',
    3,
    90,
    '噪音污染相关投诉，加急处理'
  ),
  createMockRule(
    '环境保护-石景山区工地',
    '环境保护',
    '石景山区',
    ['工地', '施工', '扬尘', '建筑垃圾'],
    '生态环境局',
    5,
    85,
    '石景山区工地环境问题'
  ),
  createMockRule(
    '市场监管-价格投诉',
    '市场监管',
    '',
    ['价格', '标价', '欺诈', '超市', '涨价', '乱收费'],
    '市场监督管理局',
    7,
    80,
    '价格相关投诉举报'
  ),
  createMockRule(
    '市场监管-食品安全',
    '市场监管',
    '',
    ['食品', '餐厅', '卫生', '食品安全', '变质', '过期'],
    '市场监督管理局',
    3,
    95,
    '食品安全问题，优先处理'
  ),
  createMockRule(
    '通用-紧急事项',
    '',
    '',
    ['紧急', '马上', '立刻', '严重', '安全隐患', '危险'],
    '城市管理委员会',
    1,
    200,
    '涉及安全的紧急事项'
  ),
];

function createMockKnowledgeEntry(
  title: string,
  category: TicketCategory,
  keywords: string[],
  handlerUnit: HandlerUnit,
  replyTemplate: string,
  handlingPoints: string[],
  enabled: boolean = true
): KnowledgeBaseEntry {
  const nowStr = formatDateTime(new Date());
  return {
    id: generateId(),
    title,
    category,
    keywords,
    handlerUnit,
    replyTemplate,
    handlingPoints,
    enabled,
    createTime: nowStr,
    updateTime: nowStr,
  };
}

export const mockKnowledgeBaseEntries: KnowledgeBaseEntry[] = [
  createMockKnowledgeEntry(
    '路灯损坏维修答复口径',
    '城市管理',
    ['路灯', '照明', '灯不亮', '路灯损坏', '夜间出行'],
    '城市管理委员会',
    '经核查，群众反映的路灯照明问题已安排养护单位到场排查。对确属设施故障的，将及时维修更换并做好夜间巡查；如涉及供电线路或施工条件限制，将同步协调相关单位处理并向群众反馈进展。',
    ['核实具体位置和灯杆编号', '确认是否存在安全隐患', '安排养护单位现场检修', '反馈维修完成时间']
  ),
  createMockKnowledgeEntry(
    '公交站亭设施破损办理口径',
    '交通运输',
    ['公交站', '候车亭', '站牌', '座椅', '玻璃破损'],
    '交通委员会',
    '关于公交站亭设施问题，已转交养护责任单位核实处理。对破损玻璃、座椅或站牌信息异常等情况，将按设施维护流程组织维修，并加强站点巡检，保障市民候车安全和出行体验。',
    ['确认站点名称和方向', '核对破损设施类型', '联系养护责任单位', '记录维修或更换结果']
  ),
  createMockKnowledgeEntry(
    '物业服务投诉答复口径',
    '住房建设',
    ['物业', '电梯', '楼道卫生', '物业服务', '小区管理'],
    '住房和城乡建设委员会',
    '已将群众反映的物业服务问题转属地住建部门核查。将督促物业服务企业按照合同约定履行保洁、维修和秩序维护职责；对整改不到位的，依法依规纳入行业监管并跟踪整改情况。',
    ['核实小区名称和物业公司', '区分公共区域保洁或设施维修问题', '督促物业限期整改', '保留整改前后材料']
  ),
  createMockKnowledgeEntry(
    '社保缴费查询办理口径',
    '劳动社保',
    ['社保', '缴费', '查询不到', '记录', '社保电话'],
    '人力资源和社会保障局',
    '针对社保缴费记录查询问题，已转社保经办机构核实参保缴费信息。工作人员将根据群众提供的身份信息、缴费时间和参保单位进行核对，并通过电话或线上渠道反馈查询结果及后续办理方式。',
    ['核实参保人基础信息', '确认缴费月份和参保单位', '排查系统同步或单位申报情况', '告知查询渠道和办理材料']
  ),
  createMockKnowledgeEntry(
    '夜间施工噪音投诉办理口径',
    '环境保护',
    ['噪音', '噪声', '夜间施工', '扰民', '工地'],
    '生态环境局',
    '群众反映的夜间施工噪声问题已转生态环境执法部门核查。将结合施工许可、作业时段和现场噪声情况进行检查，对违规施工扰民行为依法处置，并督促施工单位优化作业安排。',
    ['核实噪声发生时间和地点', '检查夜间施工许可情况', '开展现场或联合执法检查', '反馈处置措施和整改要求']
  ),
  createMockKnowledgeEntry(
    '食品安全投诉答复口径',
    '市场监管',
    ['食品安全', '餐厅', '卫生', '变质', '过期'],
    '市场监督管理局',
    '已将食品安全相关问题转市场监管部门办理。执法人员将对被反映经营主体开展现场检查，重点核查食品原料、加工环境、票证留存和从业人员管理情况；发现违法违规行为的，将依法处理并反馈结果。',
    ['核实经营主体名称和地址', '保留消费凭证或问题照片', '检查食品安全管理制度', '依法反馈检查处理结果']
  ),
];

function createMockHoliday(
  date: string,
  name: string,
  type: 'holiday' | 'workday'
): HolidayConfig {
  const nowStr = formatDateTime(new Date());
  const year = parseInt(date.split('-')[0]);
  return {
    id: generateId(),
    date,
    name,
    type,
    year,
    createTime: nowStr,
    updateTime: nowStr,
  };
}

export const mockHolidays: HolidayConfig[] = [
  createMockHoliday('2026-01-01', '元旦', 'holiday'),
  createMockHoliday('2026-02-16', '春节', 'holiday'),
  createMockHoliday('2026-02-17', '春节', 'holiday'),
  createMockHoliday('2026-02-18', '春节', 'holiday'),
  createMockHoliday('2026-02-19', '春节', 'holiday'),
  createMockHoliday('2026-02-20', '春节', 'holiday'),
  createMockHoliday('2026-02-14', '春节调休上班', 'workday'),
  createMockHoliday('2026-02-22', '春节调休上班', 'workday'),
  createMockHoliday('2026-04-04', '清明节', 'holiday'),
  createMockHoliday('2026-04-05', '清明节', 'holiday'),
  createMockHoliday('2026-04-06', '清明节', 'holiday'),
  createMockHoliday('2026-05-01', '劳动节', 'holiday'),
  createMockHoliday('2026-05-02', '劳动节', 'holiday'),
  createMockHoliday('2026-05-03', '劳动节', 'holiday'),
  createMockHoliday('2026-05-04', '劳动节', 'holiday'),
  createMockHoliday('2026-05-05', '劳动节', 'holiday'),
  createMockHoliday('2026-04-26', '劳动节调休上班', 'workday'),
  createMockHoliday('2026-05-09', '劳动节调休上班', 'workday'),
  createMockHoliday('2026-06-19', '端午节', 'holiday'),
  createMockHoliday('2026-06-20', '端午节', 'holiday'),
  createMockHoliday('2026-06-21', '端午节', 'holiday'),
  createMockHoliday('2026-10-01', '国庆节', 'holiday'),
  createMockHoliday('2026-10-02', '国庆节', 'holiday'),
  createMockHoliday('2026-10-03', '国庆节', 'holiday'),
  createMockHoliday('2026-10-04', '国庆节', 'holiday'),
  createMockHoliday('2026-10-05', '国庆节', 'holiday'),
  createMockHoliday('2026-10-06', '国庆节', 'holiday'),
  createMockHoliday('2026-10-07', '国庆节', 'holiday'),
  createMockHoliday('2026-09-27', '国庆节调休上班', 'workday'),
  createMockHoliday('2026-10-10', '国庆节调休上班', 'workday'),
];

function createMockSLARule(
  name: string,
  category: TicketCategory | '',
  handlerUnit: HandlerUnit | '',
  deadlineDays: number,
  priority: number,
  description?: string
): SLARule {
  const nowStr = formatDateTime(new Date());
  return {
    id: generateId(),
    name,
    category,
    handlerUnit,
    deadlineDays,
    priority,
    enabled: true,
    description,
    createTime: nowStr,
    updateTime: nowStr,
  };
}

export const mockSLARules: SLARule[] = [
  createMockSLARule(
    '紧急事项通用规则',
    '',
    '',
    1,
    200,
    '涉及安全的紧急事项，1个工作日内办结'
  ),
  createMockSLARule(
    '城市管理-常规',
    '城市管理',
    '',
    7,
    100,
    '城市管理类诉求，7个工作日内办结'
  ),
  createMockSLARule(
    '交通运输-常规',
    '交通运输',
    '',
    5,
    100,
    '交通运输类诉求，5个工作日内办结'
  ),
  createMockSLARule(
    '住房建设-常规',
    '住房建设',
    '',
    10,
    100,
    '住房建设类诉求，10个工作日内办结'
  ),
  createMockSLARule(
    '劳动社保-常规',
    '劳动社保',
    '',
    5,
    100,
    '劳动社保类诉求，5个工作日内办结'
  ),
  createMockSLARule(
    '教育文化-常规',
    '教育文化',
    '',
    10,
    100,
    '教育文化类诉求，10个工作日内办结'
  ),
  createMockSLARule(
    '医疗卫生-常规',
    '医疗卫生',
    '',
    7,
    100,
    '医疗卫生类诉求，7个工作日内办结'
  ),
  createMockSLARule(
    '环境保护-加急',
    '环境保护',
    '',
    3,
    120,
    '环境保护类诉求，3个工作日内办结'
  ),
  createMockSLARule(
    '市场监管-常规',
    '市场监管',
    '',
    7,
    100,
    '市场监管类诉求，7个工作日内办结'
  ),
  createMockSLARule(
    '生态环境局-特别加急',
    '环境保护',
    '生态环境局',
    2,
    150,
    '生态环境局承办的环保诉求，2个工作日内办结'
  ),
  createMockSLARule(
    '市场监管局-食品安全加急',
    '市场监管',
    '市场监督管理局',
    3,
    150,
    '市场监管局承办的食品安全诉求，3个工作日内办结'
  ),
  createMockSLARule(
    '默认规则',
    '',
    '',
    7,
    0,
    '默认办理期限，7个工作日'
  ),
];
