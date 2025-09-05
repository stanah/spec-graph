import React from 'react';
import { useViewMode } from '../../hooks/useViewMode';
import { MindmapViewer } from './MindmapViewer';
import { DocumentView } from './DocumentView';
import { AnyDocumentView } from './AnyDocumentView';
import { useAppStore } from '../../stores/appStore';

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ padding: 24 }}>
    <h3 style={{ margin: 0 }}>{title}</h3>
    <p style={{ opacity: 0.8 }}>このビューは今後実装予定です。</p>
  </div>
);

export const ViewContainer: React.FC = () => {
  const { viewMode } = useViewMode();
  const parsedData = useAppStore(s => s.parse.parsedData);

  switch (viewMode) {
    case 'mindmap':
      return <MindmapViewer />;
    case 'table':
      return <Placeholder title="テーブルビュー" />;
    case 'document':
      // Mindmap がパースできている場合は従来の DocumentView を優先。
      // パースできていない場合は、任意スキーマの汎用レンダラーで表示する。
      return parsedData ? <DocumentView /> : <AnyDocumentView />;
    default:
      return null;
  }
};
