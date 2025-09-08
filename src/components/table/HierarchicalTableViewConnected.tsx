import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { MindmapNode } from '../../types';
import { HierarchicalTableView, type HierarchicalTableViewProps } from './HierarchicalTableView';
import { buildHierarchicalMindmapColumns, type BuildHierarchicalColumnsOptions } from './buildHierarchicalMindmapColumns';
import { useAppStore } from '../../stores/appStore';
import type { HierarchicalNodeInfo } from './hierarchyUtils';

export interface HierarchicalTableViewConnectedProps extends Omit<HierarchicalTableViewProps, 'data' | 'columns' | 'selectedRowId' | 'onRowSelect' | 'getRowId'> {
  /** 階層構造を持つMindmapNodeデータ */
  data: MindmapNode[];
  /** カラム定義（オプション、未指定の場合は自動生成） */
  columns?: ColumnDef<HierarchicalNodeInfo, any>[];
  /** 自動カラム生成を有効にするかどうか */
  autoColumns?: boolean;
  /** 階層カラム生成オプション */
  columnOptions?: BuildHierarchicalColumnsOptions;
}

export function HierarchicalTableViewConnected({
  data,
  columns,
  autoColumns = true,
  columnOptions = {},
  className = '',
  ...rest
}: HierarchicalTableViewConnectedProps) {
  const selectedNodeId = useAppStore((s) => s.ui.selectedNodeId);
  const selectNode = useAppStore((s) => s.selectNode);

  // データが空の場合は階層情報を含む空データでカラムを生成
  const samplesForColumns = React.useMemo(() => {
    if (data.length === 0) return [];
    
    // データを平坦化してサンプルとして使用
    const flatten = (nodes: MindmapNode[], level: number = 0, parentId: string | null = null): HierarchicalNodeInfo[] => {
      const result: HierarchicalNodeInfo[] = [];
      nodes.forEach((node, index) => {
        const hierarchicalNode: HierarchicalNodeInfo = {
          ...node,
          _level: level,
          _parentId: parentId,
          _nodePath: parentId ? [parentId, node.id] : [node.id],
          _hasChildren: Boolean(node.children && node.children.length > 0),
          _siblingIndex: index,
          _groupKey: level === 0 ? node.id : (parentId || node.id),
        };
        result.push(hierarchicalNode);
        
        if (node.children && node.children.length > 0) {
          result.push(...flatten(node.children, level + 1, node.id));
        }
      });
      return result;
    };
    
    return flatten(data);
  }, [data]);

  const cols = columns ?? (autoColumns ? buildHierarchicalMindmapColumns(samplesForColumns, columnOptions) : []);

  return (
    <HierarchicalTableView
      data={data}
      columns={cols}
      className={`hierarchical-table ${className}`.trim()}
      selectedRowId={selectedNodeId ?? undefined}
      onRowSelect={(id) => selectNode(id)}
      getRowId={(row) => row.id}
      {...rest}
    />
  );
}