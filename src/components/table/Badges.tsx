import React from 'react';

export type StatusType = 'draft' | 'pending' | 'in-progress' | 'review' | 'done' | 'cancelled' | 'deferred' | string;
export type PriorityType = 'critical' | 'high' | 'medium' | 'low' | string;

const STATUS_COLOR: Record<string, string> = {
  draft: '#6b7280',
  pending: '#f59e0b',
  'in-progress': '#3b82f6',
  review: '#8b5cf6',
  done: '#10b981',
  cancelled: '#ef4444',
  deferred: '#a3a3a3',
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export function StatusBadge({ status }: { status: StatusType }) {
  const color = STATUS_COLOR[status] ?? '#64748b';
  const style: React.CSSProperties = {
    backgroundColor: color,
    color: '#fff',
    padding: '2px 6px',
    borderRadius: 6,
    fontSize: 12,
    display: 'inline-block',
  };
  return (
    <span role="status" data-testid="status-badge" data-status={status} style={style}>
      {String(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: PriorityType }) {
  const color = PRIORITY_COLOR[priority] ?? '#64748b';
  const style: React.CSSProperties = {
    backgroundColor: color,
    color: '#fff',
    padding: '2px 6px',
    borderRadius: 6,
    fontSize: 12,
    display: 'inline-block',
  };
  return (
    <span data-testid="priority-badge" data-priority={priority} style={style}>
      {String(priority)}
    </span>
  );
}

