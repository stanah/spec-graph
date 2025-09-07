import React, { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { MindmapNode } from '../../types';
import { TableView, type TableViewProps } from './TableView';
import { flattenWithHierarchy, groupByRootNode, type HierarchicalNodeInfo } from './hierarchyUtils';
import './HierarchicalTable.css';

export interface HierarchicalTableViewProps extends Omit<TableViewProps<HierarchicalNodeInfo>, 'data' | 'columns'> {
  /** 階層構造を持つMindmapNodeデータ */
  data: MindmapNode[];
  /** カラム定義（HierarchicalNodeInfo用） */
  columns: ColumnDef<HierarchicalNodeInfo, any>[];
  /** 階層グループ表示を有効にするかどうか */
  enableHierarchicalGrouping?: boolean;
  /** グループ化の種類 */
  groupingType?: 'root' | 'level';
  /** 階層インデントのピクセル数 */
  hierarchyIndentPx?: number;
  /** グループヘッダーを表示するかどうか */
  showGroupHeaders?: boolean;
}

export function HierarchicalTableView({
  data,
  columns,
  enableHierarchicalGrouping = true,
  groupingType = 'root',
  hierarchyIndentPx = 20,
  showGroupHeaders = true,
  className,
  ...rest
}: HierarchicalTableViewProps) {
  // 階層構造を平坦化し、階層情報を付加
  const flattenedData = useMemo(() => {
    return flattenWithHierarchy(data);
  }, [data]);

  // カラム定義を階層インデント対応に拡張
  const hierarchicalColumns = useMemo(() => {
    return columns.map((column, index) => {
      // 最初のカラム（通常はtitle）に階層インデントを適用
      if (index === 0) {
        return {
          ...column,
          cell: (info: any) => {
            const node = info.row.original as HierarchicalNodeInfo;
            const indentLevel = node._level;
            const hasChildren = node._hasChildren;
            
            // 元のセル内容を取得
            const originalCell = typeof column.cell === 'function'
              ? (column.cell as any)(info)
              : info.getValue();

            return (
              <div 
                className="hierarchy-cell"
                style={{ paddingLeft: `${indentLevel * hierarchyIndentPx}px` }}
              >
                <div className="hierarchy-indent">
                  {/* 階層レベルインジケーター */}
                  {indentLevel > 0 && (
                    <span className={`hierarchy-connector level-${Math.min(indentLevel, 3)}`}>
                      {'├─'.repeat(Math.min(indentLevel, 1))}
                      {indentLevel > 1 && '└─'}
                    </span>
                  )}
                  
                  {/* 子ノードアイコン */}
                  {hasChildren && (
                    <span className={`hierarchy-folder-icon ${hasChildren ? 'has-children' : ''}`}>
                      📁
                    </span>
                  )}
                  
                  {/* セル内容 */}
                  <span>{originalCell}</span>
                </div>
                
                {/* 階層レベル表示 */}
                <span className={`hierarchy-level-badge level-${Math.min(indentLevel, 3)}`}>
                  L{indentLevel}
                </span>
              </div>
            );
          }
        };
      }
      return column;
    });
  }, [columns, hierarchyIndentPx]);

  // グループ化されたデータを作成
  const { groupedData, groupHeaders } = useMemo(() => {
    if (!enableHierarchicalGrouping) {
      return { groupedData: flattenedData, groupHeaders: [] };
    }

    const groups = groupByRootNode(flattenedData);
    const headers: { key: string; title: string; count: number }[] = [];
    const grouped: HierarchicalNodeInfo[] = [];

    groups.forEach((nodes, rootKey) => {
      const rootNode = nodes.find(n => n._level === 0);
      headers.push({
        key: rootKey,
        title: rootNode?.title || rootKey,
        count: nodes.length
      });
      grouped.push(...nodes);
    });

    return { groupedData: grouped, groupHeaders: headers };
  }, [flattenedData, enableHierarchicalGrouping, groupingType]);

  // グループヘッダー付きのテーブル内容を生成
  if (enableHierarchicalGrouping && showGroupHeaders) {
    return (
      <div className={className}>
        {groupHeaders.map((header) => {
          const groupNodes = groupedData.filter(node => node._groupKey === header.key);
          
          return (
            <div key={header.key} style={{ marginBottom: '24px' }}>
              {/* グループヘッダー */}
              <div className="group-header">
                <h3>
                  <span>📂</span>
                  {header.title}
                  <span className="item-count">
                    {header.count} items
                  </span>
                </h3>
              </div>
              
              {/* グループのテーブル */}
              <TableView
                data={groupNodes}
                columns={hierarchicalColumns}
                {...rest}
                className="border-t-0 rounded-t-none"
              />
            </div>
          );
        })}
      </div>
    );
  }

  // 通常の階層表示（グループヘッダーなし）
  return (
    <TableView
      data={groupedData}
      columns={hierarchicalColumns}
      className={className}
      {...rest}
    />
  );
}

export type { HierarchicalNodeInfo };