import React from 'react';
import type { StakeholdersDoc } from '../../../services/docTypes';

export const StakeholdersDocView: React.FC<{ doc: StakeholdersDoc }> = ({ doc }) => {
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
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

