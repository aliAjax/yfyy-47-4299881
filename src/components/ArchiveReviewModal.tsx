import { useState } from 'react';
import { Archive, Check, X } from 'lucide-react';
import {
  ARCHIVE_ISSUE_TAGS,
  COMPLETION_QUALITY_LABELS,
  CompletionQuality,
  SATISFACTION_LABELS,
  SatisfactionLevel,
} from '@/types';
import { clsx } from 'clsx';

interface ArchiveReviewModalProps {
  ticketTitle: string;
  onClose: () => void;
  onSubmit: (review: {
    satisfaction: SatisfactionLevel;
    completionQuality: CompletionQuality;
    issueTags: string[];
    remark: string;
  }) => void;
}

export function ArchiveReviewModal({ ticketTitle, onClose, onSubmit }: ArchiveReviewModalProps) {
  const [satisfaction, setSatisfaction] = useState<SatisfactionLevel>('satisfied');
  const [completionQuality, setCompletionQuality] = useState<CompletionQuality>('qualified');
  const [issueTags, setIssueTags] = useState<string[]>(['材料完整']);
  const [remark, setRemark] = useState('');
  const [remarkTouched, setRemarkTouched] = useState(false);

  const isRemarkValid = remark.trim().length >= 6;

  const toggleTag = (tag: string) => {
    setIssueTags(prev =>
      prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    setRemarkTouched(true);
    if (!isRemarkValid) return;

    onSubmit({
      satisfaction,
      completionQuality,
      issueTags,
      remark: remark.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">归档复盘</h3>
              <p className="mt-0.5 max-w-lg truncate text-xs text-gray-500">{ticketTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">满意度</label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(SATISFACTION_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSatisfaction(value as SatisfactionLevel)}
                  className={clsx(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    satisfaction === value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">办结质量</label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(COMPLETION_QUALITY_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setCompletionQuality(value as CompletionQuality)}
                  className={clsx(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    completionQuality === value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">问题标签</label>
            <div className="flex flex-wrap gap-2">
              {ARCHIVE_ISSUE_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={clsx(
                    'inline-flex items-center space-x-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    issueTags.includes(tag)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {issueTags.includes(tag) && <Check className="h-3 w-3" />}
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">复盘备注</label>
            <textarea
              value={remark}
              onBlur={() => setRemarkTouched(true)}
              onChange={(e) => setRemark(e.target.value)}
              rows={4}
              placeholder="填写办结复盘要点、回访情况或后续关注事项..."
              className={clsx(
                'w-full rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2',
                remarkTouched && !isRemarkValid
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'
              )}
            />
            {remarkTouched && !isRemarkValid && (
              <p className="mt-1 text-xs text-red-500">请填写至少6个字的复盘备注</p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Archive className="h-4 w-4" />
            <span>确认归档</span>
          </button>
        </div>
      </div>
    </div>
  );
}
