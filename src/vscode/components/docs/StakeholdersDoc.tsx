import React from 'react';
import type { StakeholdersDoc } from '../../../services/docTypes';

export const StakeholdersDocView: React.FC<{ doc: StakeholdersDoc }> = ({ doc }) => {
  const chipStyle: React.CSSProperties = { display: 'inline-block', border: '1px solid var(--vscode-panel-border)', borderRadius: 4, padding: '2px 6px', marginRight: 6, fontSize: 12 };
  return (
    <div>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
        <h2 style={{ margin: 0 }}>{doc.title} <span style={{ fontSize: 12, opacity: 0.7 }}>(v{doc.version})</span></h2>
      </header>
      <section style={{ padding: '12px 16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>ID</th>
              <th>名前</th>
              <th>役割</th>
              <th>連絡先</th>
              <th>可用性</th>
              <th>責務</th>
              <th>担当コンポーネント</th>
              <th>メモ</th>
            </tr>
          </thead>
          <tbody>
            {(doc.stakeholders || []).map((s, i) => (
              <tr key={s.id || i}>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>{s.role}</td>
                <td>{s.contact || '-'}</td>
                <td>{s.availability || '-'}</td>
                <td>{s.responsibilities || '-'}</td>
                <td>
                  {Array.isArray(s.components) && s.components.length > 0 ? (
                    s.components.map((c: string, idx: number) => (
                      <span key={idx} style={chipStyle}>{c}</span>
                    ))
                  ) : (
                    '-'
                  )}
                </td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{s.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};
