import React from 'react';
import type { BaseDocumentType } from '../../services/documentTypes';

export interface DocumentTypeSelectorProps {
  types: BaseDocumentType[];
  selectedKey?: string;
  onSelect?: (key: string) => void;
}

export const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({ types, selectedKey, onSelect }) => {
  const sorted = React.useMemo(() => [...types].sort((a, b) => a.key.localeCompare(b.key)), [types]);

  return (
    <div role="tablist" aria-label="Document Types" aria-orientation="horizontal" style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
      {sorted.map((t) => {
        const selected = selectedKey === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect?.(t.key)}
            title={t.label}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--vscode-button-border, transparent)',
              background: selected ? 'var(--vscode-button-background)' : 'transparent',
              color: selected ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
};
