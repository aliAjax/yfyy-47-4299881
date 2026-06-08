import { TicketCategory, Area, HandlerUnit, CATEGORIES, AREAS, HANDLER_UNITS, DispatchRecommendation, SLARecommendation, DispatchRule, SLARule } from '@/types';
import { getDispatchRecommendation, getMatchReasonText } from './dispatchRule';
import { getSLARecommendation, getSLAMatchReasonText } from './slaRule';

export interface CsvRow {
  title: string;
  category: string;
  area: string;
  content: string;
  handlerUnit: string;
  deadline: string;
}

export interface RowRecommendation {
  dispatchRecommendation: DispatchRecommendation | null;
  slaRecommendation: SLARecommendation | null;
  recommendedHandlerUnit: HandlerUnit | null;
  recommendedDeadlineDays: number;
  matchReasons: string[];
  hasConflict: boolean;
  conflictReason?: string;
}

export interface CsvRowWithRecommendation extends CsvRow {
  recommendation?: RowRecommendation;
}

export interface CsvValidationError {
  row: number;
  field: string;
  message: string;
  type: 'missing' | 'invalid';
}

export interface CsvParseResult {
  rows: CsvRow[];
  errors: CsvValidationError[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

const REQUIRED_FIELDS = ['title', 'category', 'area', 'content', 'handlerUnit'];

const FIELD_LABELS: Record<string, string> = {
  title: '诉求标题',
  category: '诉求类型',
  area: '所属区域',
  content: '诉求内容',
  handlerUnit: '承办单位',
  deadline: '办理期限',
};

export function parseCsv(csvContent: string): CsvParseResult {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ row: 0, field: 'general', message: 'CSV 文件至少需要包含表头和一行数据', type: 'invalid' }],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
    };
  }

  const headers = parseCsvLine(lines[0]);
  const headerMap = buildHeaderMap(headers);
  
  const missingHeaders = REQUIRED_FIELDS.filter(field => !headerMap.has(field));
  
  const errors: CsvValidationError[] = [];
  
  if (missingHeaders.length > 0) {
    missingHeaders.forEach(field => {
      errors.push({
        row: 0,
        field,
        message: `缺少必需字段：${FIELD_LABELS[field] || field}`,
        type: 'missing',
      });
    });
  }

  const rows: CsvRow[] = [];
  let validRows = 0;
  let invalidRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const rowNum = i;
    const values = parseCsvLine(line);
    
    const row: CsvRow = {
      title: getValue(values, headerMap, 'title'),
      category: getValue(values, headerMap, 'category'),
      area: getValue(values, headerMap, 'area'),
      content: getValue(values, headerMap, 'content'),
      handlerUnit: getValue(values, headerMap, 'handlerUnit'),
      deadline: getValue(values, headerMap, 'deadline'),
    };

    const rowErrors = validateRow(row, rowNum);
    
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      invalidRows++;
    } else {
      validRows++;
    }
    
    rows.push(row);
  }

  return {
    rows,
    errors,
    totalRows: rows.length,
    validRows,
    invalidRows,
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === ',') {
        result.push(current.trim());
        current = '';
      } else if (char === '"') {
        inQuotes = true;
      } else {
        current += char;
      }
    }
  }
  
  result.push(current.trim());
  return result;
}

function buildHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  
  const headerAliases: Record<string, string[]> = {
    title: ['title', '诉求标题', '标题', 'topic'],
    category: ['category', '诉求类型', '类型', '工单类型', 'type'],
    area: ['area', '所属区域', '区域', '地区', 'region'],
    content: ['content', '诉求内容', '内容', '详情', 'description'],
    handlerUnit: ['handlerUnit', '承办单位', '办理单位', '处理单位', 'unit', 'handler'],
    deadline: ['deadline', '办理期限', '期限', '截止日期', '到期日', 'deadlineDays'],
  };

  headers.forEach((header, index) => {
    const normalizedHeader = header.trim().toLowerCase();
    
    for (const [key, aliases] of Object.entries(headerAliases)) {
      if (aliases.some(alias => alias.toLowerCase() === normalizedHeader)) {
        if (!map.has(key)) {
          map.set(key, index);
        }
      }
    }
  });

  return map;
}

function getValue(values: string[], headerMap: Map<string, number>, field: string): string {
  const index = headerMap.get(field);
  if (index === undefined || index >= values.length) return '';
  return values[index] || '';
}

function validateRow(row: CsvRow, rowNum: number): CsvValidationError[] {
  const errors: CsvValidationError[] = [];

  if (!row.title.trim()) {
    errors.push({
      row: rowNum,
      field: 'title',
      message: `第 ${rowNum} 行：诉求标题不能为空`,
      type: 'missing',
    });
  }

  if (!row.category.trim()) {
    errors.push({
      row: rowNum,
      field: 'category',
      message: `第 ${rowNum} 行：诉求类型不能为空`,
      type: 'missing',
    });
  } else if (!isValidCategory(row.category.trim())) {
    errors.push({
      row: rowNum,
      field: 'category',
      message: `第 ${rowNum} 行：诉求类型 "${row.category.trim()}" 不是有效的枚举值`,
      type: 'invalid',
    });
  }

  if (!row.area.trim()) {
    errors.push({
      row: rowNum,
      field: 'area',
      message: `第 ${rowNum} 行：所属区域不能为空`,
      type: 'missing',
    });
  } else if (!isValidArea(row.area.trim())) {
    errors.push({
      row: rowNum,
      field: 'area',
      message: `第 ${rowNum} 行：所属区域 "${row.area.trim()}" 不是有效的枚举值`,
      type: 'invalid',
    });
  }

  if (!row.content.trim()) {
    errors.push({
      row: rowNum,
      field: 'content',
      message: `第 ${rowNum} 行：诉求内容不能为空`,
      type: 'missing',
    });
  }

  if (!row.handlerUnit.trim()) {
    errors.push({
      row: rowNum,
      field: 'handlerUnit',
      message: `第 ${rowNum} 行：承办单位不能为空`,
      type: 'missing',
    });
  } else if (!isValidHandlerUnit(row.handlerUnit.trim())) {
    errors.push({
      row: rowNum,
      field: 'handlerUnit',
      message: `第 ${rowNum} 行：承办单位 "${row.handlerUnit.trim()}" 不是有效的枚举值`,
      type: 'invalid',
    });
  }

  if (row.deadline.trim()) {
    const deadlineDays = parseInt(row.deadline.trim());
    if (isNaN(deadlineDays) || deadlineDays <= 0) {
      errors.push({
        row: rowNum,
        field: 'deadline',
        message: `第 ${rowNum} 行：办理期限必须是正整数`,
        type: 'invalid',
      });
    }
  }

  return errors;
}

function isValidCategory(value: string): value is TicketCategory {
  return CATEGORIES.includes(value as TicketCategory);
}

function isValidArea(value: string): value is Area {
  return AREAS.includes(value as Area);
}

function isValidHandlerUnit(value: string): value is HandlerUnit {
  return HANDLER_UNITS.includes(value as HandlerUnit);
}

export function generateSampleCsv(): string {
  const headers = ['诉求标题', '诉求类型', '所属区域', '诉求内容', '承办单位', '办理期限'];
  const sampleData = [
    ['关于东城区路灯损坏的投诉', '城市管理', '东城区', '东城区建国门街道附近路灯损坏，夜间出行不便。', '城市管理委员会', '7'],
    ['公交站候车亭破损问题', '交通运输', '朝阳区', '朝阳区大望路公交站候车亭玻璃破损。', '交通委员会', '5'],
    ['小区物业管理投诉', '住房建设', '海淀区', '海淀区中关村某小区物业服务差。', '住房和城乡建设委员会', '10'],
    ['社保缴费查询问题', '劳动社保', '西城区', '社保缴费记录查询不到。', '人力资源和社会保障局', '3'],
  ];
  
  const lines = [headers.join(',')];
  sampleData.forEach(row => {
    const escaped = row.map(cell => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    });
    lines.push(escaped.join(','));
  });
  
  return lines.join('\n');
}

export function getErrorSummary(errors: CsvValidationError[]): { missingCount: number; invalidCount: number; fields: string[] } {
  const missingCount = errors.filter(e => e.type === 'missing').length;
  const invalidCount = errors.filter(e => e.type === 'invalid').length;
  const fields = [...new Set(errors.map(e => e.field))];
  
  return { missingCount, invalidCount, fields };
}

export function calculateRowRecommendations(
  rows: CsvRow[],
  dispatchRules: DispatchRule[],
  slaRules: SLARule[]
): CsvRowWithRecommendation[] {
  return rows.map(row => {
    const category = (row.category.trim() as TicketCategory) || '';
    const area = (row.area.trim() as Area) || '';
    const handlerUnit = (row.handlerUnit.trim() as HandlerUnit) || '';

    const dispatchRec = getDispatchRecommendation(dispatchRules, {
      title: row.title,
      content: row.content,
      category,
      area,
    });

    const effectiveHandlerUnit = dispatchRec.handlerUnit || handlerUnit;

    const slaRec = getSLARecommendation(slaRules, {
      category,
      handlerUnit: effectiveHandlerUnit,
    });

    const recommendedDeadlineDays = slaRec.deadlineDays ?? dispatchRec.deadlineDays ?? 7;

    const matchReasons: string[] = [];
    if (dispatchRec.matchedRules.length > 0) {
      const topDispatch = dispatchRec.matchedRules[0];
      matchReasons.push(`分派规则：${getMatchReasonText(topDispatch)}`);
    }
    if (slaRec.matchedRules.length > 0) {
      const topSla = slaRec.matchedRules[0];
      matchReasons.push(`SLA规则：${getSLAMatchReasonText(topSla)}`);
    }

    return {
      ...row,
      recommendation: {
        dispatchRecommendation: dispatchRec,
        slaRecommendation: slaRec,
        recommendedHandlerUnit: dispatchRec.handlerUnit,
        recommendedDeadlineDays,
        matchReasons,
        hasConflict: dispatchRec.hasConflict,
        conflictReason: dispatchRec.conflictReason,
      },
    };
  });
}
