import { useState } from 'react';
import { X, Star, CheckCircle2 } from 'lucide-react';
import { SatisfactionLevel, QualityLevel, ProblemTag, PROBLEM_TAGS, Ticket } from '@/types';
import { clsx } from 'clsx';

interface ArchiveModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    satisfaction: SatisfactionLevel;
    quality: QualityLevel;
    problemTags: ProblemTag[];
    reviewNote: string;
  }) => void;
}

export function ArchiveModal({ ticket, isOpen, onClose, onSubmit }: ArchiveModalProps) {
  const [satisfaction, setSatisfaction] = useState<SatisfactionLevel>('satisfied');
  const [quality, setQuality] = useState<QualityLevel>('good');
  const [selectedTags, setSelectedTags] = useState<ProblemTag[]>([]);
  const [reviewNote, setReviewNote] = useState('');

  if (!isOpen) return null;

  const handleTagToggle = (tag: ProblemTag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    onSubmit({
      satisfaction,
      quality,
      problemTags: selectedTags,
      reviewNote,
    });
  };

  const satisfactionOptions: { value: SatisfactionLevel; label: string; color: string }[] = [
    { value: 'very_satisfied', label: '非常满意', color: 'text-green-600' },
    { value: 'satisfied', label: '满意', color: 'text-blue-600' },
    { value: 'neutral', label: '一般', color: 'text-gray-600' },
    { value: 'dissatisfied', label: '不满意', color: 'text-orange-600' },
    { value: 'very_dissatisfied', label: '非常不满意', color: 'text-red-600' },
  ];

  const qualityOptions: { value: QualityLevel; label: string; color: string }[] = [
    { value: 'excellent', label: '优秀', color: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'good', label: '良好', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'average', label: '一般', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    { value: 'poor', label: '较差', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { value: 'very_poor', label: '很差', color: 'bg-red-100 text-red-700 border-red-300' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">工单归档复盘</h3>
            <p className="text-sm text-gray-500 mt-1">{ticket.id} - {ticket.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <span className="flex items-center">
                <Star className="h-4 w-4 mr-1.5 text-yellow-500" />
                满意度评价
              </span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {satisfactionOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSatisfaction(option.value)}
                  className={clsx(
                    'flex flex-col items-center justify-center py-3 px-2 rounded-lg border-2 transition-all',
                    satisfaction === option.value
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <div className="flex mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={clsx(
                          'h-3.5 w-3.5',
                          i < (5 - satisfactionOptions.findIndex(s => s.value === option.value))
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                  <span className={clsx('text-xs font-medium', option.color)}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <span className="flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-500" />
                办结质量
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {qualityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setQuality(option.value)}
                  className={clsx(
                    'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                    quality === option.value
                      ? option.color + ' ring-2 ring-offset-1'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              问题标签
            </label>
            <div className="flex flex-wrap gap-2">
              {PROBLEM_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                    selectedTags.includes(tag)
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              复盘备注
            </label>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="请填写复盘总结、经验教训、改进建议等..."
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end space-x-3 border-t border-gray-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            确认归档
          </button>
        </div>
      </div>
    </div>
  );
}
