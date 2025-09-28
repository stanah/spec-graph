import React from 'react';
import type { DesignDoc, ComponentItem } from '../../../services/docTypes';

const chipStyle: React.CSSProperties = { display: 'inline-block', border: '1px solid var(--vscode-panel-border)', borderRadius: 4, padding: '2px 6px', marginRight: 6, fontSize: 12 };

function ComponentTree({ node }: { node: ComponentItem }) {
  return (
    <li>
      <strong>{node.id || '(no id)'}: {node.name || '(no name)'} </strong>
      {node.type && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>[{node.type}]</span>}
      {node.responsibilities && <div style={{ marginTop: 4, opacity: 0.9 }}>{node.responsibilities}</div>}
      {(node.dependencies && node.dependencies.length > 0) && (
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>依存: {node.dependencies.join(', ')}</div>
      )}
      {(node.interfaces && node.interfaces.length > 0) && (
        <div style={{ marginTop: 4, fontSize: 12 }}>
          <span style={{ fontWeight: 600, opacity: 0.8 }}>インターフェース:</span>{' '}
          {node.interfaces.map((itf, i: number) => (
            <span key={i} style={{ display: 'inline-block', marginRight: 8 }}>{itf}</span>
          ))}
        </div>
      )}
      {(node.dataModels && node.dataModels.length > 0) && (
        <div style={{ marginTop: 4, fontSize: 12 }}>
          <span style={{ fontWeight: 600, opacity: 0.8 }}>データモデル:</span>{' '}
          {node.dataModels.map((m, i: number) => (
            <span key={i} style={{ display: 'inline-block', marginRight: 8 }}>{m}</span>
          ))}
        </div>
      )}
      {(node.techStack && node.techStack.length > 0) && (
        <div style={{ marginTop: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginRight: 6 }}>Tech</span>
          {node.techStack.map((t, i: number) => (
            <span key={i} style={chipStyle}>{t}</span>
          ))}
        </div>
      )}
      {node.criticality && (
        <div style={{ marginTop: 4, fontSize: 12 }}>
          <span style={{ fontWeight: 600, opacity: 0.8 }}>criticality:</span>{' '}
          <span>{node.criticality}</span>
        </div>
      )}
      {(node.risks && node.risks.length > 0) && (
        <div style={{ marginTop: 4, fontSize: 12 }}>
          <span style={{ fontWeight: 600, opacity: 0.8 }}>リスク:</span>{' '}
          {node.risks.map((r, i: number) => <span key={i} style={{ marginRight: 8 }}>{r}</span>)}
        </div>
      )}
      {Array.isArray(node.children) && node.children.length > 0 && (
        <ul style={{ marginTop: 6, paddingLeft: 16 }}>
          {node.children.map((c, idx: number) => <ComponentTree key={c.id || idx} node={c} />)}
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
