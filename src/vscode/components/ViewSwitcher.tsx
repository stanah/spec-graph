import React from 'react';
import { useViewMode } from '../../hooks/useViewMode';
import type { ViewMode } from '../../types/store';

const tabs: { key: ViewMode; label: string }[] = [
  { key: 'mindmap', label: 'マインドマップ' },
  { key: 'table', label: 'テーブル' },
  { key: 'document', label: 'ドキュメント' },
];

export const ViewSwitcher: React.FC = () => {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div className="view-switcher" style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setViewMode(t.key)}
          aria-pressed={viewMode === t.key}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid var(--vscode-button-border, transparent)',
            background: viewMode === t.key ? 'var(--vscode-button-background)' : 'transparent',
            color: viewMode === t.key ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
            cursor: 'pointer',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

