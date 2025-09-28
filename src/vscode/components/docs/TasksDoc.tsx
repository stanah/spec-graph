import React from 'react';
import { StatusBadge, PriorityBadge } from '../../../components/table/Badges';
import type { TasksDoc, TaskItem } from '../../../services/docTypes';

const chipStyle: React.CSSProperties = { display: 'inline-block', border: '1px solid var(--vscode-panel-border)', borderRadius: 4, padding: '2px 6px', marginRight: 6, fontSize: 12 };

function TaskTree({ item }: { item: TaskItem }) {
  return (
    <li>
      <strong>{item.id || '(no id)'}: {item.title || '(no title)'}</strong>
      {item.type && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>{item.type}</span>}
      <span style={{ marginLeft: 6 }}>
        {item.status ? <StatusBadge status={item.status} /> : null}
      </span>
      <span style={{ marginLeft: 6 }}>
        {item.priority ? <PriorityBadge priority={item.priority} /> : null}
      </span>
      {item.assignee && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>@{item.assignee}</span>}
      {typeof item.estimate === 'number' && (
        <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>見積: {item.estimate}</span>
      )}
      {item.dueDate && (
        <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>期限: {String(item.dueDate)}</span>
      )}
      {item.relatesTo && item.relatesTo.length > 0 && (
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>関連: {item.relatesTo.map((r)=>`${r.type}:${r.id}`).join(', ')}</div>
      )}
      {Array.isArray(item.tags) && item.tags.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginRight: 6 }}>タグ</span>
          {item.tags.map((t: string, i: number) => (
            <span key={i} style={chipStyle}>{t}</span>
          ))}
        </div>
      )}
      {item.notes && (
        <div style={{ marginTop: 4, opacity: 0.9 }}>{item.notes}</div>
      )}
      {Array.isArray(item.children) && item.children.length > 0 && (
        <ul style={{ marginTop: 6, paddingLeft: 16 }}>
          {item.children.map((c, idx: number) => <TaskTree key={c.id || idx} item={c} />)}
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
