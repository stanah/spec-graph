import React from 'react';
import { useViewMode } from '../../hooks/useViewMode';
import type { ViewMode } from '../../types/store';

const tabs: { key: ViewMode; label: string }[] = [
  { key: 'document', label: 'ドキュメント' },
  { key: 'table', label: 'テーブル' },
  { key: 'mindmap', label: 'マインドマップ' },
];

export const ViewSwitcher: React.FC = () => {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div 
      className="view-switcher" 
      style={{ 
        display: 'flex', 
        padding: '8px 12px', 
        borderBottom: '1px solid var(--vscode-panel-border)',
        background: 'var(--vscode-editor-background)'
      }}
    >
      <div
        style={{
          display: 'flex',
          background: 'var(--vscode-input-background)',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: '6px',
          padding: '2px',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setViewMode(t.key)}
            aria-pressed={viewMode === t.key}
            style={{
              padding: '4px 8px',
              borderRadius: '3px',
              border: 'none',
              background: viewMode === t.key 
                ? 'var(--vscode-button-background)' 
                : 'transparent',
              color: viewMode === t.key 
                ? 'var(--vscode-button-foreground)' 
                : 'var(--vscode-foreground)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: viewMode === t.key ? '500' : '400',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              boxShadow: viewMode === t.key 
                ? '0 1px 2px rgba(0, 0, 0, 0.15)' 
                : 'none',
            }}
            onMouseEnter={(e) => {
              if (viewMode !== t.key) {
                e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)';
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode !== t.key) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};

