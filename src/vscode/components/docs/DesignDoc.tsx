import React from 'react';
import type { DesignDoc } from '../../../services/docTypes';

function ComponentTree({ node }: { node: any }) {
  return (
    <li>
      <strong>{node.id || '(no id)'}: {node.name || '(no name)'} </strong>
      {node.type && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>[{node.type}]</span>}
      {node.responsibilities && <div style={{ marginTop: 4, opacity: 0.9 }}>{node.responsibilities}</div>}
      {(node.dependencies && node.dependencies.length > 0) && (
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>依存: {node.dependencies.join(', ')}</div>
      )}
      {Array.isArray(node.children) && node.children.length > 0 && (
        <ul style={{ marginTop: 6, paddingLeft: 16 }}>
          {node.children.map((c: any, idx: number) => <ComponentTree key={c.id || idx} node={c} />)}
        </ul>
      )}
    </li>
  );
}

export const DesignDocView: React.FC<{ doc: DesignDoc }> = ({ doc }) => {
  return (
    <div>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
        <h2 style={{ margin: 0 }}>{doc.title} <span style={{ fontSize: 12, opacity: 0.7 }}>(v{doc.version})</span></h2>
      </header>
      <section style={{ padding: '12px 16px' }}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(doc.components || []).map((c, i) => <ComponentTree key={c.id || i} node={c} />)}
        </ul>
      </section>
    </div>
  );
};

