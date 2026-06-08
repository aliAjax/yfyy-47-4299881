import { Ticket, TicketCategory, Area, HandlerUnit, ProgressLog, ContactPerson } from '@/types';
import { addDays, formatDate, generateId } from '@/utils/date';

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
    result: status === 'completed' ? '已妥善处理群众反映的问题，相关情况如下：...' : undefined,
    progressLogs,
    attachments: status === 'completed' ? [
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
