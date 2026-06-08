import { useCallback, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Copy, 
  Download,
  Table,
  Eye,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  BadgeCheck
} from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import { useDispatchRuleStore } from '@/store/useDispatchRuleStore';
import { useSLARuleStore } from '@/store/useSLARuleStore';
import { parseCsv, generateSampleCsv, CsvParseResult } from '@/utils/csvParser';
import { TicketCategory, Area, HandlerUnit, CATEGORIES, AREAS, HANDLER_UNITS, DispatchInfo, MatchResult, SLAMatchResult } from '@/types';
import { formatDate } from '@/utils/date';
import { getDispatchRecommendation, getMatchReasonText } from '@/utils/dispatchRule';
import { getSLARecommendation, getSLAMatchReasonText } from '@/utils/slaRule';
import { useWorkday } from '@/hooks/useWorkday';
import { clsx } from 'clsx';

type InputMode = 'upload' | 'paste';
type RowValueSource = 'recommended' | 'csv';

interface RowRecommendation {
  rowIndex: number;
  recommendedUnit: HandlerUnit | null;
  recommendedDeadlineDays: number;
  dispatchMatches: MatchResult[];
  slaMatches: SLAMatchResult[];
  hasConflict: boolean;
  conflictReason?: string;
  reasonText: string;
}

export default function BatchImport() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { batchAddTickets } = useTicketStore();
  const { getEnabledRules } = useDispatchRuleStore();
  const { getEnabledRules: getEnabledSLARules } = useSLARuleStore();
  const { calculateDeadline } = useWorkday();

  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [csvText, setCsvText] = useState('');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [isParsed, setIsParsed] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [rowValueSources, setRowValueSources] = useState<Record<number, RowValueSource>>({});

  const dispatchRules = useMemo(() => getEnabledRules(), [getEnabledRules]);
  const slaRules = useMemo(() => getEnabledSLARules(), [getEnabledSLARules]);

  const rowRecommendations = useMemo(() => {
    if (!parseResult) return [] as RowRecommendation[];

    return parseResult.rows.map((row, index) => {
      const category = row.category.trim() as TicketCategory | '';
      const area = row.area.trim() as Area | '';
      const csvUnit = row.handlerUnit.trim() as HandlerUnit | '';

      const dispatchRecommendation = getDispatchRecommendation(dispatchRules, {
        title: row.title,
        content: row.content,
        category,
        area,
      });

      const unitForSLA = dispatchRecommendation.handlerUnit || csvUnit;
      const slaRecommendation = getSLARecommendation(slaRules, {
        category,
        handlerUnit: unitForSLA,
      });

      const recommendedDeadlineDays =
        slaRecommendation.deadlineDays ||
        dispatchRecommendation.deadlineDays ||
        7;

      const dispatchReason = dispatchRecommendation.matchedRules
        .map(match => `${match.rule.name}：${getMatchReasonText(match) || '规则匹配'}（${match.score}分）`);
      const slaReason = slaRecommendation.matchedRules.slice(0, 2)
        .map(match => `${match.rule.name}：${getSLAMatchReasonText(match) || 'SLA规则匹配'}（${match.rule.deadlineDays}个工作日）`);

      return {
        rowIndex: index,
        recommendedUnit: dispatchRecommendation.handlerUnit,
        recommendedDeadlineDays,
        dispatchMatches: dispatchRecommendation.matchedRules,
        slaMatches: slaRecommendation.matchedRules,
        hasConflict: dispatchRecommendation.hasConflict,
        conflictReason: dispatchRecommendation.conflictReason,
        reasonText: [...dispatchReason, ...slaReason].join('；') || '未命中分派规则，使用默认办理期限',
      };
    });
  }, [dispatchRules, parseResult, slaRules]);

  const validRowIndexes = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.rows
      .map((_, index) => index)
      .filter(index => !parseResult.errors.some(e => e.row === index + 1));
  }, [parseResult]);

  const recommendationMap = useMemo(() => {
    return new Map(rowRecommendations.map(item => [item.rowIndex, item]));
  }, [rowRecommendations]);

  const getRowValueSource = useCallback((rowIndex: number): RowValueSource => {
    return rowValueSources[rowIndex] || 'recommended';
  }, [rowValueSources]);

  const getEffectiveRowValues = useCallback((rowIndex: number) => {
    const row = parseResult?.rows[rowIndex];
    const recommendation = recommendationMap.get(rowIndex);
    const source = getRowValueSource(rowIndex);
    const csvUnit = row?.handlerUnit.trim() as HandlerUnit | '';
    const csvDeadlineDays = row?.deadline ? parseInt(row.deadline) : null;
    const hasCsvValue = Boolean(csvUnit) || Boolean(csvDeadlineDays);
    const shouldPreserveCsv = source === 'csv' && hasCsvValue;
    const canUseCsvValue = shouldPreserveCsv || (!recommendation?.recommendedUnit && Boolean(csvUnit));
    const handlerUnit = (canUseCsvValue && csvUnit ? csvUnit : recommendation?.recommendedUnit || csvUnit) || '';
    const deadlineDays = canUseCsvValue
      ? csvDeadlineDays || recommendation?.recommendedDeadlineDays || 7
      : recommendation?.recommendedDeadlineDays || csvDeadlineDays || 7;

    return {
      handlerUnit,
      deadlineDays,
      source: canUseCsvValue ? 'csv' as RowValueSource : 'recommended' as RowValueSource,
      hasImportValue: Boolean(handlerUnit),
    };
  }, [getRowValueSource, parseResult, recommendationMap]);

  const importableRowIndexes = useMemo(() => {
    return validRowIndexes.filter(index => getEffectiveRowValues(index).hasImportValue);
  }, [getEffectiveRowValues, validRowIndexes]);

  const recommendationStats = useMemo(() => {
    const validRecommendations = validRowIndexes
      .map(index => recommendationMap.get(index))
      .filter((item): item is RowRecommendation => Boolean(item));
    const recommendedRows = validRecommendations.filter(item => item.recommendedUnit).length;
    const csvRows = validRowIndexes.filter(index => getRowValueSource(index) === 'csv').length;

    return {
      recommendedRows,
      csvRows,
      importableRows: importableRowIndexes.length,
      conflictRows: validRecommendations.filter(item => item.hasConflict).length,
      slaRows: validRecommendations.filter(item => item.slaMatches.length > 0).length,
    };
  }, [getRowValueSource, importableRowIndexes.length, recommendationMap, validRowIndexes]);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvText(content);
      setIsParsed(false);
      setParseResult(null);
      setRowValueSources({});
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleParse = () => {
    if (!csvText.trim()) return;
    const result = parseCsv(csvText);
    setParseResult(result);
    setIsParsed(true);
    setRowValueSources({});
  };

  const handleImport = () => {
    if (!parseResult || importableRowIndexes.length === 0) return;

    const now = new Date();
    const assignTime = formatDate(now) + ' ' + now.toTimeString().slice(0, 5);

    const ticketsData = importableRowIndexes.map(index => {
      const row = parseResult.rows[index];
      const recommendation = recommendationMap.get(index);
      const effectiveValues = getEffectiveRowValues(index);
      const useCsvValue = effectiveValues.source === 'csv';
      const handlerUnit = effectiveValues.handlerUnit as HandlerUnit;
      const deadlineDays = effectiveValues.deadlineDays;
      const appliedRecommendation = !useCsvValue && Boolean(recommendation?.recommendedUnit);

      const dispatchInfo: DispatchInfo | undefined = recommendation ? {
        matchedRules: recommendation.dispatchMatches.map(match => ({
          ruleId: match.rule.id,
          ruleName: match.rule.name,
          matchedFields: match.matchedFields,
          matchedKeywords: match.matchedKeywords,
          score: match.score,
        })),
        recommendedUnit: recommendation.recommendedUnit,
        recommendedDeadlineDays: recommendation.recommendedDeadlineDays,
        appliedRecommendation,
        hasConflict: recommendation.hasConflict,
        dispatchMethod: appliedRecommendation ? 'recommended' : 'manual',
        dispatchOperator: '工单调度员',
        dispatchTime: assignTime,
      } : undefined;

      return {
        title: row.title.trim(),
        category: row.category.trim() as TicketCategory,
        area: row.area.trim() as Area,
        content: row.content.trim(),
        handlerUnit,
        assignTime,
        deadline: calculateDeadline(now, deadlineDays),
        dispatchInfo,
      };
    });

    const count = batchAddTickets(ticketsData);
    setImportedCount(count);
    setImportSuccess(true);
  };

  const handleDownloadSample = () => {
    const sampleCsv = generateSampleCsv();
    const blob = new Blob(['\uFEFF' + sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '工单批量导出示例.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySample = async () => {
    try {
      await navigator.clipboard.writeText(generateSampleCsv());
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleReset = () => {
    setCsvText('');
    setParseResult(null);
    setIsParsed(false);
    setImportSuccess(false);
    setImportedCount(0);
    setRowValueSources({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const setAllRowSources = (source: RowValueSource) => {
    const next = validRowIndexes.reduce<Record<number, RowValueSource>>((acc, index) => {
      const row = parseResult?.rows[index];
      const hasCsvValue = Boolean(row?.handlerUnit.trim()) || Boolean(row?.deadline.trim());
      acc[index] = source === 'csv' && !hasCsvValue ? 'recommended' : source;
      return acc;
    }, {});
    setRowValueSources(next);
  };

  const setRowSource = (rowIndex: number, source: RowValueSource) => {
    setRowValueSources(prev => ({ ...prev, [rowIndex]: source }));
  };

  const getRowErrorFields = (rowIndex: number): string[] => {
    if (!parseResult) return [];
    const rowNum = rowIndex + 1;
    return parseResult.errors
      .filter(e => e.row === rowNum)
      .map(e => e.field);
  };

  const hasRowErrors = (rowIndex: number): boolean => {
    return getRowErrorFields(rowIndex).length > 0;
  };

  if (importSuccess) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>返回列表</span>
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">导入成功</h2>
                <p className="text-sm text-green-200">工单已批量导入系统</p>
              </div>
            </div>
          </div>

          <div className="p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              成功导入 {importedCount} 条工单
            </h3>
            <p className="text-gray-500 mb-6">
              所有工单已成功添加到工单列表中，您可以在工单列表中查看。
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleReset}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                继续导入
              </button>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>查看工单列表</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>返回列表</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopySample}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Copy className="h-4 w-4" />
            <span>复制示例</span>
          </button>
          <button
            onClick={handleDownloadSample}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>下载模板</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">批量导入工单</h2>
              <p className="text-sm text-primary-200">上传 CSV 文件或粘贴 CSV 内容，批量创建工单</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 w-fit">
            <button
              onClick={() => setInputMode('upload')}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-md transition-all',
                inputMode === 'upload'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Upload className="inline h-4 w-4 mr-1.5" />
              文件上传
            </button>
            <button
              onClick={() => setInputMode('paste')}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-md transition-all',
                inputMode === 'paste'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <FileText className="inline h-4 w-4 mr-1.5" />
              粘贴文本
            </button>
          </div>

          {inputMode === 'upload' ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition-all',
                isDragging
                  ? 'border-primary-500 bg-primary-50'
                  : csvText
                  ? 'border-green-300 bg-green-50/50'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              {csvText ? (
                <div className="space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">已选择文件</p>
                  <p className="text-xs text-gray-500">点击可重新选择文件</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="text-sm text-gray-600">点击或拖拽 CSV 文件到此处</p>
                  <p className="text-xs text-gray-400">支持 .csv 格式文件</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                CSV 内容
              </label>
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setIsParsed(false);
                  setParseResult(null);
                  setRowValueSources({});
                }}
                placeholder="请粘贴 CSV 格式的工单数据，第一行为表头..."
                rows={10}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
              />
            </div>
          )}

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 space-y-1">
                <p className="font-medium">CSV 文件格式说明</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>必需字段：诉求标题、诉求类型、所属区域、诉求内容</li>
                  <li>可选字段：承办单位、办理期限（未填写时优先使用规则推荐）</li>
                  <li>诉求类型可选值：{CATEGORIES.join('、')}</li>
                  <li>所属区域可选值：{AREAS.join('、')}</li>
                  <li>承办单位可选值：{HANDLER_UNITS.join('、')}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleReset}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              清空
            </button>
            <button
              onClick={handleParse}
              disabled={!csvText.trim()}
              className={clsx(
                'inline-flex items-center space-x-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors',
                csvText.trim()
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              <Eye className="h-4 w-4" />
              <span>解析预览</span>
            </button>
          </div>
        </div>
      </div>

      {isParsed && parseResult && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                  <Table className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">数据预览</h3>
                  <p className="text-xs text-gray-500">
                    共 {parseResult.totalRows} 条数据，
                    <span className={parseResult.validRows > 0 ? 'text-green-600' : ''}>
                      {parseResult.validRows} 条有效
                    </span>
                    ，
                    <span className={parseResult.invalidRows > 0 ? 'text-red-600' : ''}>
                      {parseResult.invalidRows} 条异常
                    </span>
                    ，
                    <span className={recommendationStats.importableRows > 0 ? 'text-primary-600' : 'text-red-600'}>
                      {recommendationStats.importableRows} 条可导入
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-700">
                  推荐单位 {recommendationStats.recommendedRows} 条
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                  SLA匹配 {recommendationStats.slaRows} 条
                </span>
                {recommendationStats.conflictRows > 0 && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                    冲突 {recommendationStats.conflictRows} 条
                  </span>
                )}
                <button
                  onClick={() => setAllRowSources('recommended')}
                  className="inline-flex items-center space-x-1 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs text-violet-700 hover:bg-violet-50 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>全部用推荐</span>
                </button>
                <button
                  onClick={() => setAllRowSources('csv')}
                  className="inline-flex items-center space-x-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>保留CSV人工值</span>
                </button>
              </div>
            </div>
          </div>

          {parseResult.errors.length > 0 && (
            <div className="border-b border-gray-100 bg-red-50 px-6 py-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    发现 {parseResult.errors.length} 个问题
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                    {parseResult.errors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="text-xs text-red-700 flex items-start space-x-1">
                        <span className="text-red-500">•</span>
                        <span>{error.message}</span>
                      </div>
                    ))}
                    {parseResult.errors.length > 10 && (
                      <div className="text-xs text-red-500">
                        还有 {parseResult.errors.length - 10} 个问题...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    行号
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    诉求标题
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    诉求类型
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    所属区域
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    承办单位
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    办理期限（工作日）
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    推荐结果
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    匹配原因
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    导入值
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parseResult.rows.slice(0, 50).map((row, idx) => {
                  const hasError = hasRowErrors(idx);
                  const errorFields = getRowErrorFields(idx);
                  const recommendation = recommendationMap.get(idx);
                  const effectiveValues = getEffectiveRowValues(idx);
                  const hasCsvUnit = Boolean(row.handlerUnit.trim());
                  const hasCsvValue = hasCsvUnit || Boolean(row.deadline.trim());
                  const canImport = !hasError && effectiveValues.hasImportValue;
                  return (
                    <tr
                      key={idx}
                      className={clsx(
                        'hover:bg-gray-50 transition-colors',
                        hasError && 'bg-red-50',
                        !hasError && !canImport && 'bg-amber-50'
                      )}
                    >
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className={clsx(
                        'px-4 py-3 max-w-xs truncate',
                        errorFields.includes('title') && 'text-red-600'
                      )}>
                        {row.title || <span className="text-gray-300">（空）</span>}
                      </td>
                      <td className={clsx(
                        'px-4 py-3',
                        errorFields.includes('category') && 'text-red-600'
                      )}>
                        {row.category || <span className="text-gray-300">（空）</span>}
                      </td>
                      <td className={clsx(
                        'px-4 py-3',
                        errorFields.includes('area') && 'text-red-600'
                      )}>
                        {row.area || <span className="text-gray-300">（空）</span>}
                      </td>
                      <td className={clsx(
                        'px-4 py-3',
                        errorFields.includes('handlerUnit') && 'text-red-600'
                      )}>
                        {row.handlerUnit || <span className="text-gray-300">（空）</span>}
                      </td>
                      <td className={clsx(
                        'px-4 py-3',
                        errorFields.includes('deadline') && 'text-red-600'
                      )}>
                        {row.deadline ? `${row.deadline} 个工作日` : <span className="text-gray-400">默认 7 个工作日</span>}
                      </td>
                      <td className="px-4 py-3 min-w-48">
                        {recommendation?.recommendedUnit ? (
                          <div className="space-y-1">
                            <p className="font-medium text-gray-900">{recommendation.recommendedUnit}</p>
                            <p className="text-xs text-gray-500">
                              {recommendation.recommendedDeadlineDays} 个工作日
                              {recommendation.slaMatches.length > 0 && (
                                <span className="ml-1 text-primary-600">SLA</span>
                              )}
                            </p>
                            {recommendation.hasConflict && (
                              <p className="text-xs text-amber-600">存在分派冲突</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">暂无推荐单位</span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-72 max-w-md">
                        <p className="line-clamp-3 text-xs text-gray-600" title={recommendation?.reasonText}>
                          {recommendation?.reasonText || '暂无匹配原因'}
                        </p>
                        {recommendation?.conflictReason && (
                          <p className="mt-1 text-xs text-amber-600" title={recommendation.conflictReason}>
                            {recommendation.conflictReason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-56">
                        <div className="space-y-2">
                          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                            <button
                              type="button"
                              onClick={() => setRowSource(idx, 'recommended')}
                              disabled={!recommendation?.recommendedUnit}
                              className={clsx(
                                'inline-flex items-center space-x-1 rounded-md px-2.5 py-1 text-xs transition-colors',
                                effectiveValues.source === 'recommended'
                                  ? 'bg-violet-600 text-white'
                                  : 'text-gray-600 hover:bg-white',
                                !recommendation?.recommendedUnit && 'cursor-not-allowed opacity-40'
                              )}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>推荐</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRowSource(idx, 'csv')}
                              disabled={!hasCsvValue}
                              className={clsx(
                                'inline-flex items-center space-x-1 rounded-md px-2.5 py-1 text-xs transition-colors',
                                effectiveValues.source === 'csv'
                                  ? 'bg-gray-700 text-white'
                                  : 'text-gray-600 hover:bg-white',
                                !hasCsvValue && 'cursor-not-allowed opacity-40'
                              )}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>CSV</span>
                            </button>
                          </div>
                          {effectiveValues.hasImportValue ? (
                            <p className="text-xs text-gray-600">
                              {effectiveValues.handlerUnit}，{effectiveValues.deadlineDays} 个工作日
                            </p>
                          ) : (
                            <p className="text-xs text-amber-600">缺少可导入承办单位</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {hasError ? (
                          <span className="inline-flex items-center space-x-1 text-xs text-red-600">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>异常</span>
                          </span>
                        ) : !canImport ? (
                          <span className="inline-flex items-center space-x-1 text-xs text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>待确认</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-xs text-green-600">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            <span>可导入</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {parseResult.rows.length > 50 && (
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 text-center text-xs text-gray-500">
              仅显示前 50 条记录，共 {parseResult.rows.length} 条
            </div>
          )}

          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={handleReset}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              重新输入
            </button>
            <button
              onClick={handleImport}
              disabled={recommendationStats.importableRows === 0}
              className={clsx(
                'inline-flex items-center space-x-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors',
                recommendationStats.importableRows > 0
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              <CheckCircle className="h-4 w-4" />
              <span>确认导入 ({recommendationStats.importableRows} 条)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
