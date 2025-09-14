import React, { useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { findParentNode } from '../../utils/helpers';

export const BreadcrumbNavigation: React.FC = () => {
  const parsed = useAppStore((s) => s.parse.parsedData);
  const selected = useAppStore((s) => s.ui.selectedNodeId);
  const selectNode = useAppStore((s) => s.selectNode);

  const items = useMemo(() => {
    const result: { id: string; title: string }[] = [];
    const root = parsed?.root;
    if (!root) return result;
    if (!selected) return [{ id: root.id, title: root.title }];
    // 選択ノードから親を辿ってルートまで
    let currentId: string | null = selected;
    while (currentId) {
      const node = findNode(root, currentId);
      if (!node) break;
      result.push({ id: node.id, title: node.title });
      const parent = findParentNode(root, currentId);
      currentId = parent ? parent.id : null;
    }
    return result.reverse();
  }, [parsed, selected]);

  if (!parsed) return null;

  return (
    <nav aria-label="breadcrumbs" data-testid="breadcrumbs" style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
      {items.map((it, idx) => (
        <span key={it.id}>
          <button
            data-testid={`crumb-${idx}`}
            onClick={() => selectNode(it.id)}
            style={{ background: 'transparent', border: 'none', color: 'var(--vscode-textLink-foreground)', cursor: 'pointer', padding: 0 }}
          >{it.title}</button>
          {idx < items.length - 1 ? <span style={{ margin: '0 4px', opacity: 0.6 }}>&gt;</span> : null}
        </span>
      ))}
    </nav>
  );
};

function findNode(root: any, id: string): any | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (Array.isArray(root.children)) {
    for (const c of root.children) {
      const found = findNode(c, id);
      if (found) return found;
    }
  }
  return null;
}

