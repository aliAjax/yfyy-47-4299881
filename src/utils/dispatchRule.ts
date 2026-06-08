import { DispatchRule, MatchResult, DispatchRecommendation, TicketCategory, Area, HandlerUnit } from '@/types';

const CATEGORY_WEIGHT = 30;
const AREA_WEIGHT = 20;
const KEYWORD_WEIGHT_PER_MATCH = 15;
const PRIORITY_BONUS = 0.1;

export function matchRules(
  rules: DispatchRule[],
  params: {
    title: string;
    content: string;
    category?: TicketCategory | '';
    area?: Area | '';
  }
): MatchResult[] {
  const { title, content, category, area } = params;
  const fullText = `${title} ${content}`.toLowerCase();

  const results: MatchResult[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const matchedFields: string[] = [];
    const matchedKeywords: string[] = [];
    let score = 0;

    if (rule.category && category && rule.category === category) {
      matchedFields.push('category');
      score += CATEGORY_WEIGHT;
    }

    if (rule.area && area && rule.area === area) {
      matchedFields.push('area');
      score += AREA_WEIGHT;
    }

    if (rule.keywords.length > 0) {
      for (const keyword of rule.keywords) {
        if (keyword && fullText.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
          score += KEYWORD_WEIGHT_PER_MATCH;
        }
      }
    }

    if (matchedFields.length > 0 || matchedKeywords.length > 0) {
      score += score * (rule.priority / 100) * PRIORITY_BONUS;
      results.push({
        rule,
        matchedFields,
        matchedKeywords,
        score: Math.round(score * 100) / 100,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function getDispatchRecommendation(
  rules: DispatchRule[],
  params: {
    title: string;
    content: string;
    category?: TicketCategory | '';
    area?: Area | '';
  }
): DispatchRecommendation {
  const matchedRules = matchRules(rules, params);

  if (matchedRules.length === 0) {
    return {
      handlerUnit: null,
      deadlineDays: null,
      matchedRules: [],
      hasConflict: false,
    };
  }

  const topMatches = matchedRules.slice(0, 3);
  const topHandler = topMatches[0].rule.handlerUnit;
  const topDeadline = topMatches[0].rule.deadlineDays;

  const otherHandlers = topMatches
    .slice(1)
    .filter(m => m.rule.handlerUnit !== topHandler && m.score > topMatches[0].score * 0.7);

  const hasConflict = otherHandlers.length > 0;
  const conflictReason = hasConflict
    ? `存在多个高匹配度的承办单位建议：${topMatches.map(m => m.rule.handlerUnit).join('、')}，请根据实际情况选择。`
    : undefined;

  return {
    handlerUnit: topHandler,
    deadlineDays: topDeadline,
    matchedRules: topMatches,
    hasConflict,
    conflictReason,
  };
}

export function getMatchReasonText(result: MatchResult): string {
  const reasons: string[] = [];

  if (result.matchedFields.includes('category')) {
    reasons.push(`诉求类型匹配`);
  }
  if (result.matchedFields.includes('area')) {
    reasons.push(`所属区域匹配`);
  }
  if (result.matchedKeywords.length > 0) {
    reasons.push(`关键词命中：${result.matchedKeywords.join('、')}`);
  }

  return reasons.join('；');
}

export function validateRule(rule: Omit<DispatchRule, 'id' | 'createTime' | 'updateTime'>): string[] {
  const errors: string[] = [];

  if (!rule.name.trim()) {
    errors.push('规则名称不能为空');
  }
  if (!rule.handlerUnit) {
    errors.push('承办单位不能为空');
  }
  if (rule.deadlineDays <= 0 || rule.deadlineDays > 365) {
    errors.push('办理期限必须在 1-365 天之间');
  }
  if (!rule.category && !rule.area && rule.keywords.length === 0) {
    errors.push('至少需要配置一项匹配条件（诉求类型、所属区域或关键词）');
  }

  return errors;
}

export function checkRuleConflict(
  rules: DispatchRule[],
  newRule: DispatchRule,
  excludeId?: string
): DispatchRule[] {
  return rules.filter(rule => {
    if (excludeId && rule.id === excludeId) return false;
    if (!rule.enabled) return false;
    if (rule.handlerUnit === newRule.handlerUnit) return false;

    const categoryMatch = !rule.category || !newRule.category || rule.category === newRule.category;
    const areaMatch = !rule.area || !newRule.area || rule.area === newRule.area;

    const keywordOverlap = rule.keywords.some(kw =>
      newRule.keywords.some(newKw => kw.toLowerCase() === newKw.toLowerCase())
    );

    return categoryMatch && areaMatch && (keywordOverlap || rule.keywords.length === 0 || newRule.keywords.length === 0);
  });
}
