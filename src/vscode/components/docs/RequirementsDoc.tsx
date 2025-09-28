import React from 'react';
import { StatusBadge, PriorityBadge } from '../../../components/table/Badges';
import type { RequirementsDoc, RequirementItem } from '../../../services/docTypes';

export const RequirementsDocView: React.FC<{ doc: RequirementsDoc }> = ({ doc }) => {
  const Section: React.FC<{ title: string }>=({ title, children })=> (
    <section style={{ padding: '12px 16px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
      <h3 style={{ margin: '0 0 8px 0' }}>{title}</h3>
      <div>{children}</div>
    </section>
  );

  const chip: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid var(--vscode-panel-border)',
    marginRight: 6,
    fontSize: 12,
    opacity: 0.9,
  };

  const metaRow: React.CSSProperties = { marginTop: 4, fontSize: 12, opacity: 0.8 };

  const ReqList: React.FC<{ items?: RequirementItem[] }>=({ items }) => {
    if (!items || items.length === 0) return <div style={{ opacity: 0.7 }}>なし</div>;
    return (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((r, idx) => (
          <li key={r.id || idx} style={{ marginBottom: 6 }}>
            <strong>{r.id ? `${r.id}: ` : ''}{r.title || '(無題)'}</strong>
            {/* バッジ表示 */}
            <span style={{ marginLeft: 8 }}>
              {r.status ? <StatusBadge status={r.status} /> : null}
            </span>
            <span style={{ marginLeft: 6 }}>
              {r.priority ? <PriorityBadge priority={r.priority} /> : null}
            </span>
            {r.description && <div style={{ marginTop: 4, opacity: 0.9 }}>{r.description}</div>}
            {/* メタ情報 */}
            <div style={metaRow}>
              {r.owner && (<><span style={{ fontWeight: 600 }}>owner:</span> <span>{r.owner}</span>{' '}</>)}
              {r.component && (<><span style={{ fontWeight: 600, marginLeft: 8 }}>component:</span> <span>{r.component}</span>{' '}</>)}
              {typeof r.effort === 'number' && (<><span style={{ fontWeight: 600, marginLeft: 8 }}>effort:</span> <span>{r.effort}</span>{' '}</>)}
              {r.risk && (<><span style={{ fontWeight: 600, marginLeft: 8 }}>risk:</span> <span>{r.risk}</span></>)}
            </div>
            {/* 受け入れ条件 */}
            {Array.isArray(r.acceptanceCriteria) && r.acceptanceCriteria.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>受け入れ条件</div>
                <ul style={{ margin: '2px 0 0 18px', padding: 0 }}>
                  {r.acceptanceCriteria.map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            {/* 依存/関連 */}
            {Array.isArray(r.dependsOn) && r.dependsOn.length > 0 && (
              <div style={metaRow}>依存: {r.dependsOn.join(', ')}</div>
            )}
            {Array.isArray(r.relatesTo) && r.relatesTo.length > 0 && (
              <div style={metaRow}>関連: {r.relatesTo.map((rel) => `${rel.type}:${rel.id}`).join(', ')}</div>
            )}
            {/* タグ */}
            {Array.isArray(r.tags) && r.tags.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginRight: 6 }}>タグ</span>
                {r.tags.map((t: string, i: number) => (
                  <span key={i} style={chip}>{t}</span>
                ))}
              </div>
            )}
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

      {Array.isArray(doc.glossary) && doc.glossary.length > 0 && (
        <Section title="用語集">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>用語</th>
                <th>定義</th>
              </tr>
            </thead>
            <tbody>
              {doc.glossary.map((g, i: number) => (
                <tr key={i}>
                  <td style={{ verticalAlign: 'top' }}>{g.term}</td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{g.definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
