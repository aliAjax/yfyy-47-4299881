import { Ticket, TicketCategory, Area, HandlerUnit, ProgressLog, ContactPerson, DispatchRule, HolidayConfig, SLARule, ArchiveInfo, SatisfactionLevel, QualityLevel, ProblemTag, KnowledgeEntry, CoOrganizer } from '@/types';
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

  let archiveInfo: ArchiveInfo | undefined;
  if (status === 'archived') {
    const archiveDate = addDays(assignTime, deadlineDays + 1);
    const satisfaction: SatisfactionLevel = 'satisfied';
    const quality: QualityLevel = 'good';
    const problemTags: ProblemTag[] = ['响应及时', '处理专业', '结果满意'];
    
    archiveInfo = {
      id: generateId(),
      ticketId: id,
      satisfaction,
      quality,
      problemTags,
      reviewNote: '该工单办理及时，处理专业，群众满意度高。建议总结经验，形成标准化处理流程。',
      operator: '李督办',
      archiveTime: formatDate(archiveDate) + ' 10:30',
    };
    
    progressLogs.push({
      id: generateId(),
      ticketId: id,
      content: '已完成办理，提交办理结果',
      operator: '承办单位经办人',
      createTime: formatDate(addDays(assignTime, deadlineDays - 1)) + ' 16:45',
      type: 'complete' as const,
    });
    progressLogs.push({
      id: generateId(),
      ticketId: id,
      content: `【归档复盘】工单已归档，满意度：${satisfaction}，办结质量：${quality}`,
      operator: '李督办',
      createTime: formatDate(archiveDate) + ' 10:30',
      type: 'archive' as const,
    });
  }

  const isCompletedOrArchived = status === 'completed' || status === 'archived';

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
    result: isCompletedOrArchived ? '已妥善处理群众反映的问题，相关情况如下：...' : undefined,
    progressLogs,
    attachments: isCompletedOrArchived ? [
      {
        id: generateId(),
        ticketId: id,
        name: '办理结果报告.pdf',
        size: '2.3MB',
        uploadTime: formatDate(addDays(assignTime, deadlineDays - 1)) + ' 16:40',
      },
    ] : [],
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
    coOrganizers: [],
    archiveInfo,
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
    '社区健身器材损坏问题',
    '城市管理',
    '朝阳区',
    '朝阳区某社区健身器材损坏严重，存在安全隐患，希望及时维修更换。',
    '城市管理委员会',
    'archived',
    20,
    7
  ),
  createMockTicket(
    'GD20240014',
    '公交线路优化建议',
    '交通运输',
    '海淀区',
    '海淀区中关村地区公交线路覆盖不足，建议增加班次或优化线路。',
    '交通委员会',
    'archived',
    35,
    15
  ),
  createMockTicket(
    'GD20240015',
    '老旧小区电梯改造申请',
    '住房建设',
    '东城区',
    '东城区某老旧小区没有电梯，老人上下楼不便，希望能加装电梯。',
    '住房和城乡建设委员会',
    'archived',
    50,
    30
  ),
  createMockTicket(
    'GD20240016',
    '校园周边食品安全问题',
    '市场监管',
    '丰台区',
    '丰台区某小学周边小卖部售卖三无食品，影响学生健康。',
    '市场监督管理局',
    'archived',
    15,
    5
  ),
  createMockTicket(
    'GD20240017',
    '医保报销流程繁琐问题',
    '劳动社保',
    '通州区',
    '通州区医保报销流程繁琐，需要提交很多材料，建议简化流程。',
    '人力资源和社会保障局',
    'archived',
    45,
    10
  ),
];

function enrichArchivedTickets(tickets: Ticket[]): Ticket[] {
  const archivedConfigs: Record<string, Partial<ArchiveInfo> & { reviewNote: string }> = {
    'GD20240013': {
      satisfaction: 'very_satisfied',
      quality: 'excellent',
      problemTags: ['响应及时', '处理专业', '结果满意', '服务态度好'],
      reviewNote: '该工单响应迅速，24小时内完成维修。处理过程专业规范，群众反馈非常满意。建议作为典型案例推广。',
    },
    'GD20240014': {
      satisfaction: 'satisfied',
      quality: 'good',
      problemTags: ['沟通顺畅', '结果满意'],
      reviewNote: '公交线路优化建议已纳入下季度规划，已与群众沟通并取得理解。整体办理质量良好。',
    },
    'GD20240015': {
      satisfaction: 'neutral',
      quality: 'average',
      problemTags: ['办理时间长', '流程繁琐', '需要改进'],
      reviewNote: '老旧小区电梯改造涉及多方协调，办理周期较长。群众表示理解但希望能加快进度。建议优化跨部门协作流程。',
    },
    'GD20240016': {
      satisfaction: 'very_satisfied',
      quality: 'excellent',
      problemTags: ['响应及时', '处理专业', '结果满意', '服务态度好', '沟通顺畅'],
      reviewNote: '食品安全问题处理迅速，执法到位，有效保障了学生饮食安全。群众满意度很高，值得表扬。',
    },
    'GD20240017': {
      satisfaction: 'dissatisfied',
      quality: 'poor',
      problemTags: ['办理时间长', '流程繁琐', '结果不理想', '沟通不畅'],
      reviewNote: '医保报销流程优化涉及政策调整，短期内难以解决。群众不太满意，需要持续跟进并做好解释工作。',
    },
  };

  return tickets.map(ticket => {
    if (ticket.status !== 'archived' || !ticket.archiveInfo) return ticket;
    
    const config = archivedConfigs[ticket.id];
    if (!config) return ticket;

    const newArchiveInfo: ArchiveInfo = {
      ...ticket.archiveInfo,
      satisfaction: config.satisfaction as SatisfactionLevel,
      quality: config.quality as QualityLevel,
      problemTags: config.problemTags as ProblemTag[],
      reviewNote: config.reviewNote,
    };

    return {
      ...ticket,
      archiveInfo: newArchiveInfo,
      progressLogs: ticket.progressLogs.map(log => {
        if (log.type === 'archive') {
          return {
            ...log,
            content: `【归档复盘】工单已归档，满意度：${config.satisfaction}，办结质量：${config.quality}`,
          };
        }
        return log;
      }),
    };
  });
}

function enrichCoOrganizerTickets(tickets: Ticket[]): Ticket[] {
  const coOrgConfigs: Record<string, CoOrganizer[]> = {
    'GD20240005': [
      {
        id: generateId() + '-co1',
        ticketId: 'GD20240005',
        unit: '交通委员会',
        status: 'processing',
        requirement: '请协助制定校园周边交通疏导方案，优化上下学时段交通组织',
        deadline: formatDate(addDays(new Date(), 3)),
        assignee: '赵晓峰',
        progressLogs: [
          {
            id: generateId() + '-log1',
            coOrganizerId: '',
            ticketId: 'GD20240005',
            content: '已派员现场勘查校园周边交通状况，正在制定疏导方案',
            operator: '交通委员会经办人',
            createTime: formatDate(addDays(new Date(), -1)) + ' 10:30',
          },
        ],
        assignTime: formatDate(addDays(new Date(), -2)) + ' 09:00',
      },
      {
        id: generateId() + '-co2',
        ticketId: 'GD20240005',
        unit: '城市管理委员会',
        status: 'completed',
        requirement: '请协助清理校园周边占道经营和违规停车',
        deadline: formatDate(addDays(new Date(), 5)),
        assignee: '王大勇',
        result: '已完成校园周边占道经营清理，查处违规停车23起，设置临时禁停标志',
        progressLogs: [
          {
            id: generateId() + '-log2',
            coOrganizerId: '',
            ticketId: 'GD20240005',
            content: '已开展校园周边环境整治行动，清理占道经营',
            operator: '城管委经办人',
            createTime: formatDate(addDays(new Date(), -3)) + ' 14:00',
          },
        ],
        assignTime: formatDate(addDays(new Date(), -4)) + ' 11:00',
        completeTime: formatDate(addDays(new Date(), -1)) + ' 16:30',
      },
    ],
    'GD20240001': [
      {
        id: generateId() + '-co3',
        ticketId: 'GD20240001',
        unit: '住房和城乡建设委员会',
        status: 'pending',
        requirement: '请协助确认该路段路灯产权归属和维护责任',
        deadline: formatDate(addDays(new Date(), 2)),
        progressLogs: [],
        assignTime: formatDate(addDays(new Date(), -1)) + ' 15:00',
      },
    ],
  };

  return tickets.map(ticket => {
    const config = coOrgConfigs[ticket.id];
    if (!config) return ticket;
    
    const coOrganizers = config.map(co => ({
      ...co,
      progressLogs: co.progressLogs.map(log => ({
        ...log,
        coOrganizerId: co.id,
      })),
    }));

    const additionalLogs: ProgressLog[] = coOrganizers.map(co => ({
      id: generateId() + '-mainlog',
      ticketId: ticket.id,
      content: `【发起协办】已将工单协办至${co.unit}，协办要求：${co.requirement}`,
      operator: '督办员',
      createTime: co.assignTime,
      type: 'coorg_assign' as const,
    }));

    return {
      ...ticket,
      coOrganizers,
      progressLogs: [...ticket.progressLogs, ...additionalLogs],
    };
  });
}

mockTickets.splice(0, mockTickets.length, ...enrichArchivedTickets(mockTickets));
mockTickets.splice(0, mockTickets.length, ...enrichCoOrganizerTickets(mockTickets));

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

function createMockKnowledge(
  title: string,
  category: TicketCategory | '',
  keywords: string[],
  synonyms: string[],
  recommendedUnit: HandlerUnit,
  replyTemplate: string,
  keyPoints: string,
  useCount: number = 0,
  enabled: boolean = true
): KnowledgeEntry {
  const nowStr = formatDateTime(new Date());
  return {
    id: generateId(),
    title,
    category,
    keywords,
    synonyms,
    recommendedUnit,
    replyTemplate,
    keyPoints,
    enabled,
    useCount,
    createTime: nowStr,
    updateTime: nowStr,
    lastUsedTime: useCount > 0 ? nowStr : undefined,
  };
}

export const mockKnowledgeEntries: KnowledgeEntry[] = [
  createMockKnowledge(
    '路灯损坏投诉处理',
    '城市管理',
    ['路灯', '照明', '灯不亮', '路灯损坏', '夜间照明'],
    ['路灯坏了', '灯不亮了', '路灯不亮', '街灯', '路灯维修', '路灯故障'],
    '城市管理委员会',
    '您好，关于您反映的路灯损坏问题，我们已安排工作人员现场核实，具体处理情况如下：\n\n一、核实情况\n经现场勘查，您反映的路段确实存在路灯损坏现象，具体位置为{area}XX路XX号附近，共涉及X盏路灯。\n\n二、处理措施\n1. 已将该问题纳入维修计划，预计3个工作日内完成修复；\n2. 安排专人对该路段进行夜间巡查，确保居民出行安全；\n3. 维修完成后将第一时间反馈。\n\n三、后续跟进\n我们将持续关注该路段路灯运行情况，如您有其他问题，欢迎随时联系我们。感谢您对城市管理工作的监督与支持！',
    '1. 需现场核实具体位置和损坏数量；2. 一般3个工作日内修复；3. 修复后需反馈；4. 涉及安全隐患的需加急处理',
    128,
    true
  ),
  createMockKnowledge(
    '道路坑洼投诉处理',
    '城市管理',
    ['道路', '坑洼', '积水', '路面', '井盖', '道路损坏'],
    ['路不平', '路坏了', '路面破损', '道路破损', '坑坑洼洼', '道路塌陷'],
    '城市管理委员会',
    '您好，关于您反映的道路坑洼问题，我们已安排道路养护部门现场核查，处理情况如下：\n\n一、问题核实\n经现场勘查，您反映的{area}XX路段确实存在路面坑洼问题，坑洼面积约XX平方米，主要原因为车辆长期碾压及雨水冲刷。\n\n二、处理方案\n1. 立即在坑洼周边设置警示标志，提醒过往车辆注意安全；\n2. 制定路面修复方案，预计7个工作日内完成修复；\n3. 修复后进行质量验收，确保修复效果。\n\n三、温馨提示\n请过往车辆和行人注意避让，注意安全。感谢您对城市道路管理工作的关心与支持！',
    '1. 需设置警示标志确保安全；2. 一般7个工作日内修复；3. 涉及主干道的优先处理；4. 修复后需质量验收',
    96,
    true
  ),
  createMockKnowledge(
    '公交候车亭破损处理',
    '交通运输',
    ['公交', '公交车', '公交站', '候车亭', '站牌', '公交设施'],
    ['公交车站', '公交站台', '公交站牌', '候车亭坏了', '公交候车', '公共汽车'],
    '交通委员会',
    '您好，关于您反映的公交候车亭破损问题，我们已安排相关单位现场核实，处理情况如下：\n\n一、核实情况\n经现场查看，您反映的XX公交站候车亭确实存在玻璃破损/座椅损坏问题，影响市民候车体验。\n\n二、处理措施\n1. 已通知公交设施维护单位尽快维修，预计5个工作日内完成修复；\n2. 对破损部位采取临时防护措施，避免伤及乘客；\n3. 对全市公交候车亭进行全面排查，及时发现并处理类似问题。\n\n感谢您对公共交通事业的关注与监督！',
    '1. 需先核实破损情况和位置；2. 一般5个工作日内修复；3. 涉及安全的需设置防护；4. 修复后及时反馈',
    54,
    true
  ),
  createMockKnowledge(
    '物业管理投诉处理',
    '住房建设',
    ['物业', '物业管理', '小区物业', '物业服务', '物业投诉'],
    ['物业公司', '小区管理', '物业差', '物业不好', '物业纠纷', '业主投诉'],
    '住房和城乡建设委员会',
    '您好，关于您反映的小区物业管理问题，我们已安排工作人员与物业公司对接，核实处理情况如下：\n\n一、问题核实\n经向物业公司了解，您反映的XX问题情况属实，物业公司存在服务不到位的情况。\n\n二、处理措施\n1. 已要求物业公司限期整改，整改期限为X个工作日；\n2. 安排专人跟进整改进度，确保整改落实到位；\n3. 整改完成后将对整改效果进行复查。\n\n三、法律依据\n根据《物业管理条例》相关规定，物业公司应当按照物业服务合同约定提供相应服务。如物业公司服务质量持续不达标，业主可通过业主大会决定更换物业公司。\n\n感谢您对物业管理工作的监督！',
    '1. 需核实物业服务合同约定；2. 先要求物业限期整改；3. 整改期限一般7-15个工作日；4. 可引导业主通过业主大会维权',
    156,
    true
  ),
  createMockKnowledge(
    '社保缴费查询问题处理',
    '劳动社保',
    ['社保', '养老保险', '医疗保险', '缴费', '社保查询', '社保记录'],
    ['社会保险', '养老金', '医保', '社保怎么查', '社保缴费记录', '五险一金'],
    '人力资源和社会保障局',
    '您好，关于您咨询的社保缴费查询问题，现答复如下：\n\n一、查询方式\n1. 线上查询：可通过"社保APP"或"人社服务"微信公众号，注册登录后查询个人缴费记录；\n2. 线下查询：携带本人身份证到就近的社保经办机构服务大厅查询；\n3. 电话查询：拨打12333社保服务热线查询。\n\n二、常见问题\n1. 如查询不到近期缴费记录，可能是单位尚未缴费或缴费信息未及时同步，建议稍后再试；\n2. 如发现缴费记录有误，可携带相关证明材料到社保经办机构申请核实更正。\n\n三、温馨提示\n建议您定期查询社保缴费情况，确保缴费记录完整准确。如有其他问题，欢迎拨打12333热线咨询。',
    '1. 提供线上线下多种查询方式；2. 记录同步可能有延迟；3. 信息有误需携带证明材料更正；4. 引导使用官方渠道',
    203,
    true
  ),
  createMockKnowledge(
    '学校周边交通拥堵问题',
    '教育文化',
    ['学校', '小学', '中学', '校园', '学生安全', '交通拥堵', '校门口'],
    ['上学堵', '放学堵', '学校门口', '接送孩子', '校园周边', '学生安全'],
    '教育委员会',
    '您好，关于您反映的学校周边交通拥堵问题，我们已协调相关部门研究处理，具体措施如下：\n\n一、已采取措施\n1. 协调交管部门在上下学高峰期加派警力，维护校门口交通秩序；\n2. 要求学校优化上下学接送方案，实行错峰放学；\n3. 设置临时接送区域，引导家长规范停车。\n\n二、长期规划\n1. 协调规划部门研究学校周边交通优化方案；\n2. 探索增设校园周边人行天桥或地下通道的可行性；\n3. 加强学生交通安全教育，鼓励绿色出行。\n\n感谢您对教育事业的关心和支持！',
    '1. 需协调交管、规划等多部门；2. 短期措施+长期规划结合；3. 引导错峰和绿色出行；4. 涉及学生安全要重视',
    78,
    true
  ),
  createMockKnowledge(
    '医院挂号难问题处理',
    '医疗卫生',
    ['医院', '挂号', '排队', '预约', '看病难', '挂号难'],
    ['医院挂号', '预约挂号', '排队挂号', '医院排队', '看病挂号', '预约难'],
    '卫生健康委员会',
    '您好，关于您反映的医院挂号难问题，我们已向相关医院了解情况，现答复如下：\n\n一、预约挂号方式\n1. 线上预约：可通过医院官方APP、微信公众号、114预约挂号平台等渠道提前预约；\n2. 电话预约：拨打医院预约电话或114进行预约；\n3. 现场挂号：医院设有自助挂号机和人工挂号窗口。\n\n二、缓解措施\n1. 医院已推行分时段预约诊疗，建议您选择非高峰时段就诊；\n2. 部分科室开设了夜间门诊和周末门诊，可错峰就医；\n3. 常见小病建议先到社区卫生服务中心就诊，实行分级诊疗。\n\n三、温馨提示\n建议您提前预约，按预约时间就诊，减少排队等待时间。感谢您对医疗卫生工作的理解与支持！',
    '1. 提供多种预约挂号方式；2. 引导错峰就诊和分级诊疗；3. 推广线上预约；4. 解释挂号难的客观原因',
    145,
    true
  ),
  createMockKnowledge(
    '噪音扰民投诉处理',
    '环境保护',
    ['噪音', '噪声', '扰民', '施工噪音', '夜间施工', '噪音污染'],
    ['太吵了', '声音大', '噪声污染', '扰民噪音', '晚上吵', '噪音举报'],
    '生态环境局',
    '您好，关于您反映的噪音扰民问题，我们已安排环境执法人员现场查处，处理情况如下：\n\n一、现场检查\n执法人员于XX年XX月XX日XX时到现场检查，经查，XX单位（工地）在XX时段施工作业，产生噪声扰民情况属实。\n\n二、处理措施\n1. 现场责令该单位（工地）立即停止夜间违规施工行为；\n2. 依据《环境噪声污染防治法》相关规定，对该单位作出行政处罚；\n3. 要求该单位合理安排施工时间，严格遵守夜间施工规定。\n\n三、后续监管\n我们将加强对该区域的夜间巡查力度，发现问题及时查处。如您再次发现噪音扰民问题，欢迎拨打12369环保举报热线。\n\n感谢您对环境保护工作的监督与支持！',
    '1. 需现场检查取证；2. 夜间施工（22:00-6:00）需审批；3. 可依法行政处罚；4. 加强后续巡查',
    189,
    true
  ),
  createMockKnowledge(
    '食品安全投诉处理',
    '市场监管',
    ['食品', '餐厅', '卫生', '食品安全', '变质', '过期', '三无食品'],
    ['食品卫生', '吃饭拉肚子', '食品变质', '食品过期', '餐厅卫生', '食品问题'],
    '市场监督管理局',
    '您好，关于您反映的食品安全问题，我们已安排执法人员调查处理，情况如下：\n\n一、调查情况\n执法人员对您反映的XX餐厅（商家）进行了现场检查，重点检查了食品原材料、加工过程、从业人员健康证等方面。\n\n二、处理措施\n1. 对检查中发现的问题，当场责令商家限期整改；\n2. 对涉嫌违法违规行为，依法立案查处；\n3. 对问题食品进行抽样送检，根据检验结果作出进一步处理。\n\n三、消费提示\n外出就餐时，请注意选择持有《食品经营许可证》、卫生条件好的餐厅；购买食品时，注意查看生产日期、保质期和QS标志。如发现食品安全问题，请保存好相关证据，及时拨打12315投诉举报。\n\n感谢您对食品安全工作的监督！',
    '1. 需现场检查和抽样取证；2. 责令整改+行政处罚结合；3. 引导消费者保存证据；4. 涉及食品安全优先处理',
    112,
    true
  ),
  createMockKnowledge(
    '价格欺诈投诉处理',
    '市场监管',
    ['价格', '标价', '欺诈', '超市', '涨价', '乱收费', '价格欺诈'],
    ['价格问题', '乱涨价', '价格欺骗', '标价不符', '收费不合理', '价格投诉'],
    '市场监督管理局',
    '您好，关于您反映的价格问题，我们已安排执法人员调查核实，处理情况如下：\n\n一、核实情况\n经调查，您反映的XX商家（超市）确实存在标价与结算价格不一致/乱收费的情况，违反了《价格法》相关规定。\n\n二、处理措施\n1. 责令商家立即整改，明码标价，退还多收款项；\n2. 依据《价格法》和《价格违法行为行政处罚规定》，对商家作出行政处罚；\n3. 要求商家加强价格管理，杜绝类似问题再次发生。\n\n三、消费者维权提示\n1. 购物时注意查看商品标价，保留好购物凭证；\n2. 如发现价格问题，可先与商家协商解决；\n3. 协商不成的，可拨打12315热线向市场监管部门投诉。\n\n感谢您对价格监管工作的监督与支持！',
    '1. 需核实标价与结算价是否一致；2. 责令整改+退款+处罚；3. 引导消费者保留凭证；4. 按价格法处理',
    87,
    true
  ),
  createMockKnowledge(
    '房屋漏水维修问题',
    '住房建设',
    ['房屋漏水', '维修', '老小区', '房屋修缮', '漏雨', '渗水'],
    ['房顶漏水', '天花板漏水', '墙面渗水', '房子漏水', '房屋漏雨', '防水'],
    '住房和城乡建设委员会',
    '您好，关于您反映的房屋漏水问题，现答复如下：\n\n一、维修责任划分\n1. 保修期内（一般屋面防水5年）的房屋漏水，由建设单位负责维修；\n2. 超过保修期的，如属于公共部位，可申请使用住宅专项维修资金；\n3. 如属于业主专有部分，由业主自行负责维修。\n\n二、处理建议\n1. 请先确认房屋是否在保修期内，如在保修期内，可联系开发商或物业公司安排维修；\n2. 如已过保修期且属于公共部位，可向业主委员会或物业公司提出使用维修资金申请；\n3. 紧急情况下，可先行维修，保留好相关票据和证据，再按规定报销。\n\n三、温馨提示\n建议您平时注意维护房屋，发现问题及时处理，避免损失扩大。如有其他问题，欢迎继续咨询。',
    '1. 先划分保修责任；2. 区分公共部位和专有部位；3. 引导走维修资金渠道；4. 紧急情况可先修后报',
    134,
    true
  ),
  createMockKnowledge(
    '医保报销问题解答',
    '劳动社保',
    ['医保', '医疗保险', '报销', '医保报销', '医疗费用', '医保政策'],
    ['医保怎么报', '医疗报销', '看病报销', '医保比例', '医保政策', '医疗保险报销'],
    '人力资源和社会保障局',
    '您好，关于您咨询的医保报销问题，现答复如下：\n\n一、医保报销范围\n1. 参保人员在定点医疗机构发生的符合医保目录内的医疗费用，可按规定报销；\n2. 门诊、住院、门诊慢特病等都有相应的报销政策。\n\n二、报销比例\n1. 门诊报销：统筹基金支付比例一般为50%-70%；\n2. 住院报销：根据医院级别不同，报销比例一般为70%-90%；\n3. 具体报销比例以当地医保政策为准。\n\n三、报销流程\n1. 持社保卡在定点医疗机构就医，可直接刷卡结算；\n2. 如因故未能直接结算，可携带相关材料到医保经办机构手工报销。\n\n四、咨询渠道\n1. 拨打12333社保服务热线咨询；\n2. 登录医保局官网或微信公众号查询；\n3. 到就近的医保经办机构窗口咨询。\n\n感谢您的咨询，祝您身体健康！',
    '1. 区分门诊、住院报销政策；2. 强调定点医疗机构；3. 提供多种咨询渠道；4. 引导持卡直接结算',
    176,
    true
  ),
];
