import { KnowledgeEntry, KnowledgeMatchResult, KnowledgeSearchParams, TemplateApplyOptions } from '@/types';

const CATEGORY_WEIGHT = 20;
const AREA_WEIGHT = 15;
const KEYWORD_TITLE_WEIGHT = 18;
const KEYWORD_CONTENT_WEIGHT = 10;
const SYNONYM_TITLE_WEIGHT = 10;
const SYNONYM_CONTENT_WEIGHT = 5;
const TITLE_MATCH_BONUS = 12;
const USE_COUNT_BONUS_MAX = 10;
const USE_COUNT_BONUS_THRESHOLD = 200;

export function matchKnowledge(
  entries: KnowledgeEntry[],
  params: KnowledgeSearchParams
): KnowledgeMatchResult[] {
  const { title = '', content = '', category, area } = params;
  const fullText = `${title} ${content}`.toLowerCase();
  const titleText = title.toLowerCase();

  const results: KnowledgeMatchResult[] = [];

  for (const entry of entries) {
    if (!entry.enabled) continue;

    const matchedFields: string[] = [];
    const matchedKeywords: string[] = [];
    const matchedSynonyms: string[] = [];
    let score = 0;
    const scoreBreakdown = {
      category: 0,
      area: 0,
      keywordTitle: 0,
      keywordContent: 0,
      synonymTitle: 0,
      synonymContent: 0,
      titleBonus: 0,
      useCountBonus: 0,
    };

    if (entry.category && category && entry.category === category) {
      matchedFields.push('category');
      scoreBreakdown.category = CATEGORY_WEIGHT;
      score += CATEGORY_WEIGHT;
    }

    if (area && entry.recommendedUnit) {
      const areaLower = area.toLowerCase();
      const entryLower = entry.recommendedUnit.toLowerCase();
      if (entryLower.includes(areaLower) || areaLower.includes(entryLower)) {
        matchedFields.push('area');
        scoreBreakdown.area = AREA_WEIGHT;
        score += AREA_WEIGHT;
      }
    }

    if (entry.keywords.length > 0) {
      for (const keyword of entry.keywords) {
        if (!keyword) continue;
        const kwLower = keyword.toLowerCase();

        if (titleText.includes(kwLower)) {
          matchedKeywords.push(keyword);
          scoreBreakdown.keywordTitle += KEYWORD_TITLE_WEIGHT;
          score += KEYWORD_TITLE_WEIGHT;
          if (entry.title.toLowerCase().includes(kwLower)) {
            scoreBreakdown.titleBonus += TITLE_MATCH_BONUS;
            score += TITLE_MATCH_BONUS;
          }
        } else if (fullText.includes(kwLower)) {
          matchedKeywords.push(keyword);
          scoreBreakdown.keywordContent += KEYWORD_CONTENT_WEIGHT;
          score += KEYWORD_CONTENT_WEIGHT;
        }
      }
    }

    if (entry.synonyms && entry.synonyms.length > 0) {
      for (const synonym of entry.synonyms) {
        if (!synonym) continue;
        const synLower = synonym.toLowerCase();

        if (titleText.includes(synLower)) {
          matchedSynonyms.push(synonym);
          scoreBreakdown.synonymTitle += SYNONYM_TITLE_WEIGHT;
          score += SYNONYM_TITLE_WEIGHT;
        } else if (fullText.includes(synLower)) {
          matchedSynonyms.push(synonym);
          scoreBreakdown.synonymContent += SYNONYM_CONTENT_WEIGHT;
          score += SYNONYM_CONTENT_WEIGHT;
        }
      }
    }

    if (entry.useCount > 0) {
      const useCountBonus = Math.min(
        (entry.useCount / USE_COUNT_BONUS_THRESHOLD) * USE_COUNT_BONUS_MAX,
        USE_COUNT_BONUS_MAX
      );
      scoreBreakdown.useCountBonus = Math.round(useCountBonus * 100) / 100;
      score += useCountBonus;
    }

    if (matchedFields.length > 0 || matchedKeywords.length > 0 || matchedSynonyms.length > 0) {
      results.push({
        entry,
        matchedFields,
        matchedKeywords,
        matchedSynonyms,
        score: Math.round(score * 100) / 100,
        scoreBreakdown,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function getKnowledgeRecommendations(
  entries: KnowledgeEntry[],
  params: KnowledgeSearchParams,
  limit: number = 5
): KnowledgeMatchResult[] {
  const matched = matchKnowledge(entries, params);
  return matched.slice(0, limit);
}

export function getKnowledgeMatchReasonText(result: KnowledgeMatchResult): string {
  const reasons: string[] = [];

  if (result.matchedFields.includes('category')) {
    reasons.push('诉求类型匹配');
  }
  if (result.matchedFields.includes('area')) {
    reasons.push('区域相关');
  }
  
  const allMatches = [...result.matchedKeywords];
  if (result.matchedSynonyms && result.matchedSynonyms.length > 0) {
    allMatches.push(...result.matchedSynonyms);
  }
  
  if (allMatches.length > 0) {
    const display = allMatches.slice(0, 3);
    const more = allMatches.length > 3 ? `等${allMatches.length}个` : '';
    reasons.push(`关键词命中：${display.join('、')}${more}`);
  }

  return reasons.length > 0 ? reasons.join('；') : '智能推荐';
}

export function validateKnowledgeEntry(
  entry: Omit<KnowledgeEntry, 'id' | 'createTime' | 'updateTime'>
): string[] {
  const errors: string[] = [];

  if (!entry.title.trim()) {
    errors.push('知识条目标题不能为空');
  }
  if (!entry.recommendedUnit) {
    errors.push('推荐承办单位不能为空');
  }
  if (!entry.replyTemplate.trim()) {
    errors.push('答复模板不能为空');
  }
  if (entry.keywords.length === 0) {
    errors.push('至少需要配置一个关键词');
  }
  if (entry.title.trim().length > 100) {
    errors.push('标题不能超过100个字符');
  }
  if (entry.replyTemplate.length > 5000) {
    errors.push('答复模板不能超过5000个字符');
  }

  return errors;
}

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

export function replaceTemplatePlaceholders(
  template: string,
  context: Record<string, string | undefined>
): string {
  return template.replace(PLACEHOLDER_PATTERN, (match, key) => {
    const value = context[key];
    return value !== undefined ? value : match;
  });
}

export function applyTemplateToContent(
  currentContent: string,
  template: string,
  options: TemplateApplyOptions
): string {
  const { mode, replacePlaceholders = true, context = {} } = options;
  
  let processedTemplate = template;
  if (replacePlaceholders && context) {
    processedTemplate = replaceTemplatePlaceholders(template, context);
  }

  switch (mode) {
    case 'replace':
      return processedTemplate;
    
    case 'append':
      if (!currentContent.trim()) {
        return processedTemplate;
      }
      return currentContent + (currentContent.endsWith('\n') ? '' : '\n\n') + processedTemplate;
    
    case 'prepend':
      if (!currentContent.trim()) {
        return processedTemplate;
      }
      return processedTemplate + (processedTemplate.endsWith('\n') ? '' : '\n\n') + currentContent;
    
    default:
      return processedTemplate;
  }
}

export function extractKeywordsFromText(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[，。！？、；：""''（）【】《》…—[\](){}<>,.?;:'"-]/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
  
  const stopWords = new Set([
    '的', '了', '是', '我', '你', '他', '她', '它', '们', '在', '有', '和',
    '问题', '情况', '一下', '可以', '我们', '你们', '他们', '这个', '那个',
    '什么', '怎么', '为什么', '如何', '已经', '现在', '今天', '昨天', '明天',
    '一个', '一些', '很多', '非常', '比较', '有点', '还是', '但是', '因为',
    '所以', '如果', '虽然', '不过', '然后', '还有', '就是', '都', '也',
    '就', '都', '又', '再', '又', '才', '只', '还', '又',
  ]);
  
  return words.filter(w => !stopWords.has(w));
}

export function getScoreLevel(score: number): { level: string; color: string; label: string } {
  if (score >= 60) {
    return { level: 'high', color: 'text-green-600', label: '高匹配' };
  }
  if (score >= 35) {
    return { level: 'medium', color: 'text-amber-600', label: '中匹配' };
  }
  return { level: 'low', color: 'text-gray-500', label: '低匹配' };
}

export function getScoreColor(score: number): string {
  if (score >= 60) return 'text-green-600';
  if (score >= 35) return 'text-amber-600';
  return 'text-gray-500';
}

export function getScoreBadgeColor(score: number): string {
  if (score >= 60) return 'bg-green-100 text-green-700';
  if (score >= 35) return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

export function incrementKnowledgeUseCount(entry: KnowledgeEntry): KnowledgeEntry {
  const now = new Date();
  const nowStr = formatDateTime(now);
  return {
    ...entry,
    useCount: entry.useCount + 1,
    lastUsedTime: nowStr,
    updateTime: nowStr,
  };
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
