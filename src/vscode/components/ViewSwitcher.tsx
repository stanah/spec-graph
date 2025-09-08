import React from 'react';
import { useViewMode } from '../../hooks/useViewMode';
import { useColorMode } from '../../hooks/useColorMode';
import type { ViewMode } from '../../types/store';

const tabs: { key: ViewMode; label: string }[] = [
  { key: 'document', label: 'ドキュメント' },
  { key: 'table', label: 'テーブル' },
  { key: 'mindmap', label: 'マインドマップ' },
];

const getColorModeIcon = (mode: 'light' | 'dark' | 'auto') => {
  switch (mode) {
    case 'light':
      return '☀️';
    case 'dark':
      return '🌙';
    case 'auto':
      return '🔄';
    default:
      return '🔄';
  }
};

const getNextColorMode = (current: 'light' | 'dark' | 'auto'): 'light' | 'dark' | 'auto' => {
  switch (current) {
    case 'auto':
      return 'light';
    case 'light':
      return 'dark';
    case 'dark':
      return 'auto';
    default:
      return 'auto';
  }
};

export const ViewSwitcher: React.FC = () => {
  const { viewMode, setViewMode } = useViewMode();
  const { colorMode, setColorMode } = useColorMode();

  return (
    <div 
      className="view-switcher" 
      style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px', 
        borderBottom: '1px solid var(--vscode-panel-border)',
        background: 'var(--vscode-editor-background)'
      }}
    >
      {/* 表示切り替えボタン */}
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

      {/* カラーモード切り替えボタン */}
      <button
        onClick={() => setColorMode(getNextColorMode(colorMode))}
        title={`カラーモード: ${colorMode} (クリックで切り替え)`}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: '4px',
          background: 'var(--vscode-input-background)',
          color: 'var(--vscode-foreground)',
          cursor: 'pointer',
          fontSize: '12px',
          transition: 'all 0.2s ease',
          minWidth: '32px',
          height: '24px',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--vscode-list-hoverBackground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--vscode-input-background)';
        }}
      >
        {getColorModeIcon(colorMode)}
      </button>
    </div>
  );
};

