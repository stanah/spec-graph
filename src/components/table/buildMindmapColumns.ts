import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { MindmapNode } from '../../types';
import { StatusBadge, PriorityBadge } from './Badges';

export type BuildColumnsOptions = {
  include?: string[]; // explicit base fields to include additionally
  exclude?: string[]; // base fields to exclude
};

const BASE_ORDER: Array<keyof MindmapNode> = [
  'id',
  'title',
  'status',
  'priority',
  'tags',
  'deadline',
];

/**
 * Generate table ColumnDef definitions from MindmapNode samples.
 * - Always includes id/title
 * - Adds optional base fields if present in any sample
 * - Expands customFields keys present in any sample
 */
export function buildMindmapColumns(
  samples: MindmapNode[],
  options: BuildColumnsOptions = {}
): ColumnDef<MindmapNode, any>[] {
  const exclude = new Set(options.exclude ?? []);
  const include = new Set(options.include ?? []);

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

  const baseColumns: ColumnDef<MindmapNode, any>[] = [];
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

  // customFields columns
  const customKeys = collectCustomFieldKeys(samples);
  const customColumns: ColumnDef<MindmapNode, any>[] = customKeys.map((ck) => ({
    id: `custom:${ck}`,
    header: ck,
    accessorFn: (row) => formatValue((row.customFields as Record<string, unknown> | undefined)?.[ck]),
  }));

  return [...baseColumns, ...customColumns];
}

function collectCustomFieldKeys(samples: MindmapNode[]): string[] {
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

function formatValue(v: unknown): string | number | boolean | null {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return v as any;
}
