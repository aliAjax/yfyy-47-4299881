import { KnowledgeBaseEntry, KnowledgeMatchResult, TicketCategory } from '@/types';

const CATEGORY_WEIGHT = 30;
const UNIT_WEIGHT = 20;
const KEYWORD_WEIGHT_PER_MATCH = 18;
const TITLE_WEIGHT = 12;
const POINT_WEIGHT = 6;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function matchKnowledgeEntries(
  entries: KnowledgeBaseEntry[],
  params: {
    title?: string;
    content?: string;
    result?: string;
    category?: TicketCategory | '';
    handlerUnit?: string;
  }
): KnowledgeMatchResult[] {
  const fullText = normalizeText(`${params.title || ''} ${params.content || ''} ${params.result || ''}`);
  const results: KnowledgeMatchResult[] = [];

  for (const entry of entries) {
    if (!entry.enabled) continue;

    const matchedFields: string[] = [];
    const matchedKeywords: string[] = [];
    let score = 0;

    if (entry.category && params.category && entry.category === params.category) {
      matchedFields.push('category');
      score += CATEGORY_WEIGHT;
    }

    if (params.handlerUnit && entry.handlerUnit === params.handlerUnit) {
      matchedFields.push('handlerUnit');
      score += UNIT_WEIGHT;
    }

    for (const keyword of entry.keywords) {
      if (keyword && fullText.includes(normalizeText(keyword))) {
        matchedKeywords.push(keyword);
        score += KEYWORD_WEIGHT_PER_MATCH;
      }
    }

    if (entry.title && fullText.includes(normalizeText(entry.title))) {
      matchedFields.push('title');
      score += TITLE_WEIGHT;
    }

    const matchedPoint = entry.handlingPoints.some(point => point && fullText.includes(normalizeText(point)));
    if (matchedPoint) {
      matchedFields.push('handlingPoints');
      score += POINT_WEIGHT;
    }

    if (score > 0) {
      results.push({
        entry,
        matchedFields,
        matchedKeywords,
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function getKnowledgeMatchReasonText(result: KnowledgeMatchResult): string {
  const reasons: string[] = [];

  if (result.matchedFields.includes('category')) {
    reasons.push('诉求类型匹配');
  }
  if (result.matchedFields.includes('handlerUnit')) {
    reasons.push('承办单位匹配');
  }
  if (result.matchedKeywords.length > 0) {
    reasons.push(`关键词命中：${result.matchedKeywords.join('、')}`);
  }
  if (result.matchedFields.includes('title')) {
    reasons.push('标题口径匹配');
  }
  if (result.matchedFields.includes('handlingPoints')) {
    reasons.push('办理要点匹配');
  }

  return reasons.join('；');
}

export function validateKnowledgeEntry(
  entry: Omit<KnowledgeBaseEntry, 'id' | 'createTime' | 'updateTime'>
): string[] {
  const errors: string[] = [];

  if (!entry.title.trim()) {
    errors.push('条目标题不能为空');
  }
  if (!entry.category) {
    errors.push('适用诉求类型不能为空');
  }
  if (entry.keywords.length === 0) {
    errors.push('关键词不能为空');
  }
  if (!entry.handlerUnit) {
    errors.push('推荐承办单位不能为空');
  }
  if (!entry.replyTemplate.trim()) {
    errors.push('答复模板不能为空');
  }
  if (entry.handlingPoints.length === 0) {
    errors.push('办理要点不能为空');
  }

  return errors;
}
