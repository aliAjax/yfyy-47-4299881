import { useState, useRef, useMemo, useCallback } from 'react';
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
  Eye,
  AlertTriangle,
  Sparkles,
  Zap,
  Info,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTicketStore } from '@/store/useTicketStore';
import { useDispatchRuleStore } from '@/store/useDispatchRuleStore';
import { useSLARuleStore } from '@/store/useSLARuleStore';
import { parseCsv, generateSampleCsv, CsvParseResult, CsvRowWithRecommendation, calculateRowRecommendations } from '@/utils/csvParser';
import { TicketCategory, Area, HandlerUnit, CATEGORIES, AREAS, HANDLER_UNITS, DispatchInfo } from '@/types';
import { formatDate } from '@/utils/date';
import { useWorkday } from '@/hooks/useWorkday';
import { clsx } from 'clsx';

type InputMode = 'upload' | 'paste';

export default function BatchImport() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { batchAddTickets } = useTicketStore();
  const { getEnabledRules: getEnabledDispatchRules } = useDispatchRuleStore();
  const { getEnabledRules: getEnabledSLARules } = useSLARuleStore();
  const { calculateDeadline } = useWorkday();

  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [csvText, setCsvText] = useState('');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [isParsed, setIsParsed] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [useRecommendations, setUseRecommendations] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [rowsUsingCsvValue, setRowsUsingCsvValue] = useState<Set<number>>(new Set());

  const dispatchRules = useMemo(() => getEnabledDispatchRules(), [getEnabledDispatchRules]);
  const slaRules = useMemo(() => getEnabledSLARules(), [getEnabledSLARules]);

  const rowsWithRecommendations = useMemo<CsvRowWithRecommendation[]>(() => {
    if (!parseResult) return [];
    return calculateRowRecommendations(parseResult.rows, dispatchRules, slaRules);
  }, [parseResult, dispatchRules, slaRules]);

  const isRowUsingRecommendation = useCallback((rowIndex: number): boolean => {
    if (!useRecommendations) return false;
    const row = rowsWithRecommendations[rowIndex];
    if (!row?.recommendation?.recommendedHandlerUnit) return false;
    return !rowsUsingCsvValue.has(rowIndex);
  }, [rowsWithRecommendations, rowsUsingCsvValue, useRecommendations]);

  const toggleRowUseRecommendation = (rowIndex: number) => {
    setRowsUsingCsvValue(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  const recommendationStats = useMemo(() => {
    if (!parseResult) return { usingRec: 0, usingCsv: 0, hasRec: 0, noRec: 0 };
    let usingRec = 0;
    let usingCsv = 0;
    let hasRec = 0;
    let noRec = 0;

    rowsWithRecommendations.forEach((row, idx) => {
      const hasRecommendation = !!row.recommendation?.recommendedHandlerUnit;
      if (hasRecommendation) {
        hasRec++;
        if (isRowUsingRecommendation(idx)) {
          usingRec++;
        } else {
          usingCsv++;
        }
      } else {
        noRec++;
        usingCsv++;
      }
    });

    return { usingRec, usingCsv, hasRec, noRec };
  }, [rowsWithRecommendations, parseResult, isRowUsingRecommendation]);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvText(content);
      setIsParsed(false);
      setParseResult(null);
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
  };

  const handleImport = () => {
    if (!parseResult || parseResult.validRows === 0) return;

    const validRowIndices: number[] = [];
    parseResult.rows.forEach((_, index) => {
      const rowNum = index + 1;
      if (!parseResult.errors.some(e => e.row === rowNum)) {
        validRowIndices.push(index);
      }
    });

    const ticketsData = validRowIndices.map(rowIdx => {
      const row = rowsWithRecommendations[rowIdx];
      const rec = row.recommendation;
      const useRec = isRowUsingRecommendation(rowIdx);

      let handlerUnit: HandlerUnit;
      let deadlineDays: number;
      let dispatchInfo: DispatchInfo | undefined;

      if (useRec && rec) {
        handlerUnit = (rec.recommendedHandlerUnit || row.handlerUnit.trim()) as HandlerUnit;
        deadlineDays = rec.recommendedDeadlineDays;

        const isRecommendedUnit = rec.recommendedHandlerUnit !== null && rec.recommendedHandlerUnit === handlerUnit;
        const isRecommendedDeadline = rec.recommendedDeadlineDays === deadlineDays;
        const appliedRecommendation = isRecommendedUnit && isRecommendedDeadline;

        let dispatchMethod: 'auto' | 'manual' | 'recommended' = 'manual';
        if (isRecommendedUnit && isRecommendedDeadline) {
          dispatchMethod = 'recommended';
        }

        dispatchInfo = {
          matchedRules: rec.dispatchRecommendation?.matchedRules?.map(m => ({
            ruleId: m.rule.id,
            ruleName: m.rule.name,
            matchedFields: m.matchedFields,
            matchedKeywords: m.matchedKeywords,
            score: m.score,
          })) || [],
          recommendedUnit: rec.recommendedHandlerUnit,
          recommendedDeadlineDays: rec.recommendedDeadlineDays,
          appliedRecommendation,
          hasConflict: rec.hasConflict,
          dispatchMethod,
          dispatchOperator: '批量导入',
          dispatchTime: formatDate(new Date()) + ' ' + new Date().toTimeString().slice(0, 5),
        };
      } else {
        handlerUnit = row.handlerUnit.trim() as HandlerUnit;
        deadlineDays = row.deadline ? parseInt(row.deadline) : 7;

        if (rec) {
          dispatchInfo = {
            matchedRules: rec.dispatchRecommendation?.matchedRules?.map(m => ({
              ruleId: m.rule.id,
              ruleName: m.rule.name,
              matchedFields: m.matchedFields,
              matchedKeywords: m.matchedKeywords,
              score: m.score,
            })) || [],
            recommendedUnit: rec.recommendedHandlerUnit,
            recommendedDeadlineDays: rec.recommendedDeadlineDays,
            appliedRecommendation: false,
            hasConflict: rec.hasConflict,
            dispatchMethod: 'manual',
            dispatchOperator: '批量导入',
            dispatchTime: formatDate(new Date()) + ' ' + new Date().toTimeString().slice(0, 5),
          };
        }
      }

      return {
        title: row.title.trim(),
        category: row.category.trim() as TicketCategory,
        area: row.area.trim() as Area,
        content: row.content.trim(),
        handlerUnit,
        assignTime: formatDate(new Date()) + ' ' + new Date().toTimeString().slice(0, 5),
        deadline: calculateDeadline(new Date(), deadlineDays),
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
    setUseRecommendations(true);
    setExpandedRows(new Set());
    setRowsUsingCsvValue(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyAllRecommendations = () => {
    setRowsUsingCsvValue(new Set());
    setUseRecommendations(true);
  };

  const handleRejectAllRecommendations = () => {
    const allIndices = new Set<number>();
    rowsWithRecommendations.forEach((_, idx) => {
      if (rowsWithRecommendations[idx].recommendation?.recommendedHandlerUnit) {
        allIndices.add(idx);
      }
    });
    setRowsUsingCsvValue(allIndices);
  };

  const toggleRowExpand = (rowIndex: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
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
                  <li>必需字段：诉求标题、诉求类型、所属区域、诉求内容、承办单位</li>
                  <li>可选字段：办理期限（工作日，默认为 7 个工作日）</li>
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">数据预览与智能推荐</h3>
                  <p className="text-xs text-gray-500">
                    共 {parseResult.totalRows} 条数据，
                    <span className={parseResult.validRows > 0 ? 'text-green-600' : ''}>
                      {parseResult.validRows} 条有效
                    </span>
                    ，
                    <span className={parseResult.invalidRows > 0 ? 'text-red-600' : ''}>
                      {parseResult.invalidRows} 条异常
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 flex-wrap gap-2">
                <div className="flex items-center space-x-3 text-xs">
                  <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-violet-50 text-violet-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>使用推荐 {recommendationStats.usingRec} 条</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-gray-100 text-gray-600">
                    <FileText className="h-3.5 w-3.5" />
                    <span>保留原值 {recommendationStats.usingCsv} 条</span>
                  </span>
                  {recommendationStats.noRec > 0 && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>无匹配 {recommendationStats.noRec} 条</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleApplyAllRecommendations}
                    disabled={!useRecommendations || recommendationStats.usingRec === recommendationStats.hasRec}
                    className="text-xs px-3 py-1.5 rounded-md border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    全部应用推荐
                  </button>
                  <button
                    onClick={handleRejectAllRecommendations}
                    disabled={recommendationStats.usingCsv === parseResult.totalRows}
                    className="text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    全部保留原值
                  </button>
                </div>
                <div className="h-6 w-px bg-gray-200" />
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <div
                    className={clsx(
                      'relative w-11 h-6 rounded-full transition-colors',
                      useRecommendations ? 'bg-violet-600' : 'bg-gray-300'
                    )}
                    onClick={() => setUseRecommendations(!useRecommendations)}
                  >
                    <div
                      className={clsx(
                        'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                        useRecommendations ? 'translate-x-5' : 'translate-x-0.5'
                      )}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <Zap className="h-4 w-4 text-violet-500" />
                    <span>智能推荐</span>
                  </span>
                </label>
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
                  <th className="w-10 px-3 py-3"></th>
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
                    办理期限
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rowsWithRecommendations.slice(0, 50).map((row, idx) => {
                  const hasError = hasRowErrors(idx);
                  const errorFields = getRowErrorFields(idx);
                  const isExpanded = expandedRows.has(idx);
                  const rec = row.recommendation;
                  const hasRecommendation = rec && rec.recommendedHandlerUnit;
                  const useRecForRow = isRowUsingRecommendation(idx);

                  const displayHandlerUnit = useRecForRow && rec?.recommendedHandlerUnit
                    ? rec.recommendedHandlerUnit
                    : row.handlerUnit;

                  const displayDeadlineDays = useRecForRow && rec
                    ? rec.recommendedDeadlineDays
                    : (row.deadline ? parseInt(row.deadline) : 7);

                  const unitDiffers = rec?.recommendedHandlerUnit && rec.recommendedHandlerUnit !== row.handlerUnit;
                  const deadlineDiffers = rec && rec.recommendedDeadlineDays !== (row.deadline ? parseInt(row.deadline) : 7);

                  return (
                    <>
                      <tr
                        key={idx}
                        className={clsx(
                          'hover:bg-gray-50 transition-colors',
                          hasError && 'bg-red-50',
                          useRecForRow && hasRecommendation && !hasError && 'bg-violet-50/30'
                        )}
                      >
                        <td className="px-3 py-3">
                          {!hasError && rec && rec.matchReasons.length > 0 && (
                            <button
                              onClick={() => toggleRowExpand(idx)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title={isExpanded ? '收起详情' : '查看匹配原因'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>
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
                          <div className="flex flex-col space-y-0.5">
                            <span className={clsx(
                              'font-medium',
                              useRecForRow && unitDiffers && 'text-violet-700'
                            )}>
                              {displayHandlerUnit || <span className="text-gray-300">（空）</span>}
                              {useRecForRow && hasRecommendation && !errorFields.includes('handlerUnit') && (
                                <span className="ml-1.5 inline-flex items-center text-xs text-violet-500 font-normal">
                                  <Sparkles className="h-3 w-3 mr-0.5" />
                                  智能推荐
                                </span>
                              )}
                            </span>
                            {useRecForRow && unitDiffers && (
                              <span className="text-xs text-gray-400">
                                原CSV值：{row.handlerUnit || '（空）'}
                              </span>
                            )}
                            {!useRecForRow && unitDiffers && (
                              <span className="text-xs text-violet-500">
                                推荐：{rec?.recommendedHandlerUnit}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={clsx(
                          'px-4 py-3',
                          errorFields.includes('deadline') && 'text-red-600'
                        )}>
                          <div className="flex flex-col space-y-0.5">
                            <span className={clsx(
                              'font-medium',
                              useRecForRow && deadlineDiffers && 'text-violet-700'
                            )}>
                              {displayDeadlineDays} 个工作日
                              {useRecForRow && hasRecommendation && !errorFields.includes('deadline') && (
                                <span className="ml-1.5 inline-flex items-center text-xs text-violet-500 font-normal">
                                  <Clock className="h-3 w-3 mr-0.5" />
                                  SLA推荐
                                </span>
                              )}
                            </span>
                            {useRecForRow && deadlineDiffers && (
                              <span className="text-xs text-gray-400">
                                原CSV值：{row.deadline || '默认 7'} 个工作日
                              </span>
                            )}
                            {!useRecForRow && deadlineDiffers && (
                              <span className="text-xs text-violet-500">
                                推荐：{rec?.recommendedDeadlineDays} 个工作日
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {hasError ? (
                            <span className="inline-flex items-center space-x-1 text-xs text-red-600">
                              <XCircle className="h-3.5 w-3.5" />
                              <span>异常</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-xs text-green-600">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>正常</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasRecommendation && !hasError ? (
                            <button
                              onClick={() => toggleRowUseRecommendation(idx)}
                              className={clsx(
                                'inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md transition-colors',
                                useRecForRow
                                  ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              )}
                            >
                              {useRecForRow ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>使用推荐</span>
                                </>
                              ) : (
                                <>
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>保留原值</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && rec && !hasError && (
                        <tr key={`${idx}-detail`} className="bg-violet-50/50">
                          <td colSpan={9} className="px-8 py-3">
                            <div className="space-y-2">
                              {rec.matchReasons.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-gray-700 mb-1.5 flex items-center space-x-1">
                                    <Info className="h-3.5 w-3.5 text-violet-500" />
                                    <span>匹配原因</span>
                                  </p>
                                  <div className="space-y-1">
                                    {rec.matchReasons.map((reason, rIdx) => (
                                      <p key={rIdx} className="text-xs text-gray-600 flex items-start space-x-1.5">
                                        <span className="text-violet-400 mt-0.5">•</span>
                                        <span>{reason}</span>
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {rec.hasConflict && rec.conflictReason && (
                                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
                                  <div className="flex items-start space-x-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-medium text-amber-800">分派冲突提示</p>
                                      <p className="text-xs text-amber-700 mt-0.5">
                                        {rec.conflictReason}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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

          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center space-x-1">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                <span>
                  将导入 <span className="font-medium text-violet-700">{recommendationStats.usingRec}</span> 条推荐值 +{' '}
                  <span className="font-medium text-gray-700">{recommendationStats.usingCsv}</span> 条CSV原值
                </span>
              </div>
              {recommendationStats.noRec > 0 && (
                <div className="text-amber-600">
                  * {recommendationStats.noRec} 条无匹配规则，将使用CSV原值
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 w-full sm:w-auto">
              <button
                onClick={handleReset}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                重新输入
              </button>
              <button
                onClick={handleImport}
                disabled={parseResult.validRows === 0}
                className={clsx(
                  'inline-flex items-center space-x-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors',
                  parseResult.validRows > 0
                    ? recommendationStats.usingRec > 0
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
              >
                {recommendationStats.usingRec > 0 ? (
                  <Zap className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>确认导入 ({parseResult.validRows} 条)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
