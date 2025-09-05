import React from 'react';
import type { RequirementsDoc } from '../../../services/docTypes';

export const RequirementsDocView: React.FC<{ doc: RequirementsDoc }> = ({ doc }) => {
  const Section: React.FC<{ title: string }>=({ title, children })=> (
    <section style={{ padding: '12px 16px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
      <h3 style={{ margin: '0 0 8px 0' }}>{title}</h3>
      <div>{children}</div>
    </section>
  );

  const ReqList: React.FC<{ items?: any[] }>=({ items }) => {
    if (!items || items.length === 0) return <div style={{ opacity: 0.7 }}>なし</div>;
    return (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((r, idx) => (
          <li key={r.id || idx} style={{ marginBottom: 6 }}>
            <strong>{r.id ? `${r.id}: ` : ''}{r.title || '(無題)'}</strong>
            {r.priority && <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>[{r.priority}]</span>}
            {r.status && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>{r.status}</span>}
            {r.description && <div style={{ marginTop: 4, opacity: 0.9 }}>{r.description}</div>}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
        <h2 style={{ margin: 0 }}>{doc.title} <span style={{ fontSize: 12, opacity: 0.7 }}>(v{doc.version})</span></h2>
      </header>

      {doc.goals && doc.goals.length > 0 && (
        <Section title="目標 / ゴール">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {doc.goals.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </Section>
      )}

      <Section title="ユーザー要求">
        <ReqList items={doc.userRequirements} />
      </Section>

      <Section title="システム要件">
        <ReqList items={doc.systemRequirements} />
      </Section>

      {doc.nonFunctionalRequirements && (
        <Section title="非機能要件">
          <ReqList items={doc.nonFunctionalRequirements} />
        </Section>
      )}

      {doc.traceability && doc.traceability.length > 0 && (
        <Section title="トレーサビリティ">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {doc.traceability.map((t, i) => (
              <li key={i}>{t.from} → {t.to}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
};

