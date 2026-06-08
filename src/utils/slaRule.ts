import { SLARule, SLAMatchResult, SLARecommendation, TicketCategory, HandlerUnit } from '@/types';

export interface SLAMatchInput {
  category?: TicketCategory | '';
  handlerUnit?: HandlerUnit | '';
  title?: string;
  content?: string;
}

export function matchSLARules(
  rules: SLARule[],
  input: SLAMatchInput
): SLAMatchResult[] {
  const results: SLAMatchResult[] = [];
  
  for (const rule of rules) {
    if (!rule.enabled) continue;
    
    const matchedFields: string[] = [];
    let score = 0;
    
    if (rule.category) {
      if (input.category && input.category === rule.category) {
        matchedFields.push('category');
        score += 30;
      } else {
        continue;
      }
    }
    
    if (rule.handlerUnit) {
      if (input.handlerUnit && input.handlerUnit === rule.handlerUnit) {
        matchedFields.push('handlerUnit');
        score += 40;
      } else {
        continue;
      }
    }
    
    score += rule.priority * 0.1;
    
    if (matchedFields.length > 0 || (rule.category === '' && rule.handlerUnit === '')) {
      if (rule.category === '' && rule.handlerUnit === '') {
        score += 10;
      }
      results.push({
        rule,
        matchedFields,
        score: Math.round(score * 100) / 100,
      });
    }
  }
  
  return results.sort((a, b) => b.score - a.score);
}

export function getSLARecommendation(
  rules: SLARule[],
  input: SLAMatchInput
): SLARecommendation {
  const matchedRules = matchSLARules(rules, input);
  
  if (matchedRules.length === 0) {
    return {
      deadlineDays: 7,
      matchedRules: [],
    };
  }
  
  const topRule = matchedRules[0];
  
  return {
    deadlineDays: topRule.rule.deadlineDays,
    matchedRules,
  };
}

export function getSLAMatchReasonText(match: SLAMatchResult): string {
  const reasons: string[] = [];
  
  if (match.matchedFields.includes('category')) {
    reasons.push(`诉求类型匹配`);
  }
  if (match.matchedFields.includes('handlerUnit')) {
    reasons.push(`承办单位匹配`);
  }
  
  if (reasons.length === 0 && match.rule.category === '' && match.rule.handlerUnit === '') {
    reasons.push('通用规则');
  }
  
  return reasons.join('、');
}

export function validateSLARule(rule: Partial<SLARule>): string[] {
  const errors: string[] = [];
  
  if (!rule.name?.trim()) {
    errors.push('请输入规则名称');
  }
  if (rule.deadlineDays === undefined || rule.deadlineDays === null || rule.deadlineDays <= 0) {
    errors.push('办理期限必须大于0');
  }
  if (rule.priority === undefined || rule.priority === null || rule.priority < 0) {
    errors.push('优先级不能为负数');
  }
  
  return errors;
}
