import { RiskLevel } from '@/types';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getDaysRemaining(deadline: string): number {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getRiskLevel(deadline: string, status: string): RiskLevel {
  if (status === 'completed') return 'low';
  const daysRemaining = getDaysRemaining(deadline);
  if (daysRemaining < 0 || status === 'overdue') return 'high';
  if (daysRemaining <= 1) return 'high';
  if (daysRemaining <= 3) return 'medium';
  return 'low';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function getDeadlineLabel(deadline: string, status: string): string {
  if (status === 'completed') return '已办结';
  const days = getDaysRemaining(deadline);
  if (days < 0) return `超期${Math.abs(days)}天`;
  if (days === 0) return '今天到期';
  if (days === 1) return '明天到期';
  return `剩余${days}天`;
}
