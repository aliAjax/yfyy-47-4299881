import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface ScrollListProps {
  children: React.ReactNode;
  height?: number;
  speed?: number;
}

export function ScrollList({ children, height = 300, speed = 50 }: ScrollListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const animationRef = useRef<number>();
  const scrollTop = useRef(0);

  useEffect(() => {
    const list = listRef.current;
    const content = contentRef.current;
    if (!list || !content) return;

    const animate = () => {
      if (isPaused) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      scrollTop.current += speed / 60;
      const contentHeight = content.scrollHeight / 2;

      if (scrollTop.current >= contentHeight) {
        scrollTop.current = 0;
      }

      list.scrollTop = scrollTop.current;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, speed]);

  return (
    <div
      ref={listRef}
      className="overflow-hidden"
      style={{ height }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div ref={contentRef}>
        {children}
        {children}
      </div>
    </div>
  );
}

interface RiskItemProps {
  title: string;
  area: string;
  unit: string;
  deadline: string;
  remainingDays: number;
  onClick?: () => void;
}

export function RiskItem({ title, area, unit, deadline, remainingDays, onClick }: RiskItemProps) {
  const isOverdue = remainingDays < 0;
  const isUrgent = remainingDays >= 0 && remainingDays <= 2;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'p-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50',
        isOverdue && 'bg-red-50/50'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-gray-800 line-clamp-2 flex-1">{title}</span>
        <span className={clsx(
          'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
          isOverdue
            ? 'bg-red-100 text-red-600'
            : isUrgent
            ? 'bg-orange-100 text-orange-600'
            : 'bg-yellow-100 text-yellow-600'
        )}>
          {isOverdue ? `超期${Math.abs(remainingDays)}天` : `剩余${remainingDays}天`}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          {area}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
          {unit}
        </span>
        <span className="ml-auto">截止：{deadline}</span>
      </div>
    </div>
  );
}

interface DynamicItemProps {
  type: 'urge' | 'return';
  title: string;
  content: string;
  operator: string;
  time: string;
  onClick?: () => void;
}

export function DynamicItem({ type, title, content, operator, time, onClick }: DynamicItemProps) {
  return (
    <div
      onClick={onClick}
      className="p-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50"
    >
      <div className="flex items-start gap-2 mb-1">
        <span className={clsx(
          'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 mt-0.5',
          type === 'urge' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
        )}>
          {type === 'urge' ? '催办' : '退回'}
        </span>
        <span className="text-sm font-medium text-gray-800 line-clamp-1 flex-1">{title}</span>
      </div>
      <p className="text-xs text-gray-500 line-clamp-1 mb-1.5 ml-10">{content}</p>
      <div className="flex items-center justify-between text-xs text-gray-400 ml-10">
        <span>{operator}</span>
        <span>{time}</span>
      </div>
    </div>
  );
}
