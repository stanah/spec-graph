import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { HierarchicalNodeInfo } from './hierarchyUtils';
import { StatusBadge, PriorityBadge } from './Badges';
import './HierarchicalTable.css';

export type BuildHierarchicalColumnsOptions = {
  include?: string[]; // explicit base fields to include additionally
  exclude?: string[]; // base fields to exclude
  showHierarchyInfo?: boolean; // 階層情報カラムを表示するかどうか
  showParentInfo?: boolean; // 親ノード情報カラムを表示するかどうか
};

const BASE_ORDER: Array<keyof Omit<HierarchicalNodeInfo, '_level' | '_parentId' | '_nodePath' | '_hasChildren' | '_siblingIndex' | '_groupKey'>> = [
  'id',
  'title',
  'status',
  'priority',
  'tags',
  'deadline',
];

/**
 * 階層構造対応のテーブルカラム定義を生成します
 */
export function buildHierarchicalMindmapColumns(
  samples: HierarchicalNodeInfo[],
  options: BuildHierarchicalColumnsOptions = {}
): ColumnDef<HierarchicalNodeInfo>[] {
  const exclude = new Set(options.exclude ?? []);
  const include = new Set(options.include ?? []);
  const { showHierarchyInfo = true, showParentInfo = false } = options;

  const presentBase = new Set<string>();
  for (const node of samples) {
    for (const key of BASE_ORDER) {
      if (node[key] !== undefined && node[key] !== null) presentBase.add(key as string);
    }
  }

  // Always ensure id/title are present
  presentBase.add('id');
  presentBase.add('title');

  // Merge include
  for (const k of include) presentBase.add(k);

  const baseColumns: ColumnDef<HierarchicalNodeInfo>[] = [];
  
  for (const key of BASE_ORDER) {
    if (!presentBase.has(key as string)) continue;
    if (exclude.has(key as string)) continue;

    if (key === 'tags') {
      baseColumns.push({
        id: 'tags',
        header: 'Tags',
        accessorFn: (row) => Array.isArray(row.tags) ? row.tags.join(', ') : '',
      });
    } else if (key === 'status') {
      baseColumns.push({
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: (info) => React.createElement(StatusBadge, { status: String(info.getValue() ?? '') }),
      });
    } else if (key === 'priority') {
      baseColumns.push({
        id: 'priority',
        header: 'Priority',
        accessorKey: 'priority',
        cell: (info) => React.createElement(PriorityBadge, { priority: String(info.getValue() ?? '') }),
      });
    } else {
      baseColumns.push({
        id: key as string,
        header: capitalize(key as string),
        accessorKey: key as string,
      });
    }
  }

  // 階層情報カラムを追加
  const hierarchyColumns: ColumnDef<HierarchicalNodeInfo>[] = [];
  
  if (showHierarchyInfo) {
    hierarchyColumns.push({
      id: '_hierarchyLevel',
      header: 'Level',
      accessorKey: '_level',
      cell: (info) => {
        const level = info.getValue() as number;
        const hasChildren = (info.row.original as HierarchicalNodeInfo)._hasChildren;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className={`hierarchy-level-badge level-${Math.min(level, 3)}`}>
              L{level}
            </span>
            {hasChildren && (
              <span className="hierarchy-folder-icon has-children">
                📁
              </span>
            )}
          </div>
        );
      },
      size: 80,
    });
  }

  if (showParentInfo) {
    hierarchyColumns.push({
      id: '_parentInfo',
      header: 'Parent',
      accessorFn: (row) => {
        if (row._level === 0) return '';
        const parentId = row._parentId;
        const parent = samples.find(n => n.id === parentId);
        return parent?.title || parentId || '';
      },
      cell: (info) => {
        const value = info.getValue() as string;
        const node = info.row.original as HierarchicalNodeInfo;
        
        if (node._level === 0) {
          return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Root</span>;
        }
        
        return value ? (
          <div className="hierarchy-parent-info">
            <span className="hierarchy-parent-arrow">↳</span>
            <span>{value}</span>
          </div>
        ) : null;
      },
      size: 120,
    });
  }

  // customFields columns
  const customKeys = collectCustomFieldKeys(samples);
  const customColumns: ColumnDef<HierarchicalNodeInfo>[] = customKeys.map((ck) => ({
    id: `custom:${ck}`,
    header: ck,
    accessorFn: (row) => formatValue((row.customFields as Record<string, unknown> | undefined)?.[ck]),
  }));

  return [...hierarchyColumns, ...baseColumns, ...customColumns];
}

function collectCustomFieldKeys(samples: HierarchicalNodeInfo[]): string[] {
  const keys = new Set<string>();
  for (const node of samples) {
    const cf = node.customFields as Record<string, unknown> | undefined;
    if (!cf) continue;
    for (const k of Object.keys(cf)) keys.add(k);
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatValue(v: unknown): string | number | null {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return v as string | number;
}