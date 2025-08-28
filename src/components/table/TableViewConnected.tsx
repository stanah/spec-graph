import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { MindmapNode } from '../../types';
import { buildMindmapColumns } from './buildMindmapColumns';
import { TableView } from './TableView';
import { useAppStore } from '../../stores/appStore';

export type TableViewConnectedProps = {
  data: MindmapNode[];
  columns?: ColumnDef<MindmapNode, any>[];
  className?: string;
  autoColumns?: boolean; // if true and columns not provided, build from data
};

export function TableViewConnected({ data, columns, className, autoColumns = true }: TableViewConnectedProps) {
  const selectedNodeId = useAppStore((s) => s.ui.selectedNodeId);
  const selectNode = useAppStore((s) => s.selectNode);

  const cols = columns ?? (autoColumns ? buildMindmapColumns(data) : []);

  return (
    <TableView<MindmapNode>
      data={data}
      columns={cols}
      className={className}
      selectedRowId={selectedNodeId ?? undefined}
      onRowSelect={(id) => selectNode(id)}
      getRowId={(row) => row.id}
    />
  );
}

