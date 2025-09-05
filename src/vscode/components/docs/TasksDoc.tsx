import React from 'react';
import type { TasksDoc } from '../../../services/docTypes';

function TaskTree({ item }: { item: any }) {
  return (
    <li>
      <strong>{item.id || '(no id)'}: {item.title || '(no title)'}</strong>
      {item.status && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>{item.status}</span>}
      {item.assignee && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>@{item.assignee}</span>}
      {item.relatesTo && item.relatesTo.length > 0 && (
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>関連: {item.relatesTo.map((r: any)=>`${r.type}:${r.id}`).join(', ')}</div>
      )}
      {Array.isArray(item.children) && item.children.length > 0 && (
        <ul style={{ marginTop: 6, paddingLeft: 16 }}>
          {item.children.map((c: any, idx: number) => <TaskTree key={c.id || idx} item={c} />)}
        </ul>
      )}
    </li>
  );
}

export const TasksDocView: React.FC<{ doc: TasksDoc }> = ({ doc }) => {
  return (
    <div>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
        <h2 style={{ margin: 0 }}>{doc.title} <span style={{ fontSize: 12, opacity: 0.7 }}>(v{doc.version})</span></h2>
      </header>
      <section style={{ padding: '12px 16px' }}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(doc.epics || []).map((e, i) => <TaskTree key={e.id || i} item={e} />)}
        </ul>
      </section>
    </div>
  );
};

