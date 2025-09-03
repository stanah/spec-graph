import React from 'react';
import { useViewMode } from '../../hooks/useViewMode';
import { MindmapViewer } from './MindmapViewer';
import { DocumentView } from './DocumentView';

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ padding: 24 }}>
    <h3 style={{ margin: 0 }}>{title}</h3>
    <p style={{ opacity: 0.8 }}>このビューは今後実装予定です。</p>
  </div>
);

export const ViewContainer: React.FC = () => {
  const { viewMode } = useViewMode();

  switch (viewMode) {
    case 'mindmap':
      return <MindmapViewer />;
    case 'table':
      return <Placeholder title="テーブルビュー" />;
    case 'document':
      return <DocumentView />;
    default:
      return null;
  }
};
