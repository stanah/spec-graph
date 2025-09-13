import React from 'react';
import { useViewMode } from '../../hooks/useViewMode';
import { useColorMode } from '../../hooks/useColorMode';
import { MindmapViewer } from './MindmapViewer';
import { DocumentView } from './DocumentView';
import { AnyDocumentView } from './AnyDocumentView';
import { HierarchicalTableViewConnected } from '../../components/table/HierarchicalTableViewConnected';
import { DependencyGraphView } from './DependencyGraphView';
import type { MindmapNode } from '../../types';
import { useAppStore } from '../../stores/appStore';

const _Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ padding: 24 }}>
    <h3 style={{ margin: 0 }}>{title}</h3>
    <p style={{ opacity: 0.8 }}>このビューは今後実装予定です。</p>
  </div>
);

export const ViewContainer: React.FC = () => {
  const { viewMode } = useViewMode();
  const { resolvedMode } = useColorMode();
  const parsedData = useAppStore(s => s.parse.parsedData);
  const parseErrors = useAppStore(s => s.parse.parseErrors);

  switch (viewMode) {
    case 'mindmap':
      return (
        <div data-color-mode={resolvedMode} className={`view-container ${resolvedMode}-mode`}>
          <MindmapViewer />
        </div>
      );
    case 'table': {
      // パース済みデータから階層構造を維持したまま配列を生成（なければ空配列）
      const hierarchicalNodes: MindmapNode[] = parsedData?.root ? [parsedData.root] : [];
      
      return (
        <div 
          data-color-mode={resolvedMode} 
          className={`view-container ${resolvedMode}-mode`}
          style={{ padding: 8 }}
        >
          <HierarchicalTableViewConnected 
            data={hierarchicalNodes}
            enableHierarchicalGrouping={true}
            showGroupHeaders={true}
            hierarchyIndentPx={24}
            columnOptions={{
              showHierarchyInfo: true,
              showParentInfo: true
            }}
          />
        </div>
      );
    }
    case 'document':
      // Mindmapパースにエラーがある場合は、任意スキーマの汎用レンダラーを使用
      if (parseErrors && parseErrors.length > 0) {
        return (
          <div data-color-mode={resolvedMode} className={`view-container ${resolvedMode}-mode`}>
            <AnyDocumentView />
          </div>
        );
      }
      // パース済みデータがある場合はアウトラインドキュメントビュー
      if (parsedData) {
        return (
          <div data-color-mode={resolvedMode} className={`view-container ${resolvedMode}-mode`}>
            <DocumentView />
          </div>
        );
      }
      // それ以外は汎用レンダラー
      return (
        <div data-color-mode={resolvedMode} className={`view-container ${resolvedMode}-mode`}>
          <AnyDocumentView />
        </div>
      );
    case 'deps':
      return (
        <div data-color-mode={resolvedMode} className={`view-container ${resolvedMode}-mode`}>
          <DependencyGraphView />
        </div>
      );
    default:
      return null;
  }
};
