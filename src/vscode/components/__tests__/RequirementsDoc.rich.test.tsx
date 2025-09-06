import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { RequirementsDocView } from '../docs/RequirementsDoc';

describe('RequirementsDocView (rich)', () => {
  it('拡張フィールドを含めてリッチに表示できる', () => {
    const doc = {
      title: '要件定義書',
      version: '1.2.3',
      goals: ['UX改善', 'パフォーマンス向上'],
      userRequirements: [
        {
          id: 'FR-ABC-001',
          title: '検索機能',
          description: '全文検索を提供する',
          owner: 'STK-001',
          priority: 'high',
          status: 'in-progress',
          component: 'core',
          effort: 3,
          risk: 'high',
          acceptanceCriteria: ['キーワード一致', '日本語形態素'],
          dependsOn: ['FR-ABC-000'],
          relatesTo: [
            { type: 'task', id: 'TASK-PRJ-001' },
            { type: 'design', id: 'DSG-ABC-001' },
          ],
          tags: ['search', 'frontend'],
        },
      ],
      systemRequirements: [
        {
          id: 'FR-ABC-002',
          title: 'インデックス作成',
          description: 'バックグラウンドでのインデックス',
          priority: 'medium',
          status: 'pending',
        },
      ],
      nonFunctionalRequirements: [
        { id: 'NFR-ABC-100', title: 'レスポンス', description: 'p95 < 200ms' },
      ],
      glossary: [
        { term: 'NFR', definition: '非機能要件' },
        { term: 'FR', definition: '機能要件' },
      ],
      traceability: [{ from: 'FR-ABC-001', to: 'TASK-PRJ-001' }],
    } as any;

    render(<RequirementsDocView doc={doc} />);

    // ヘッダー
    expect(screen.getByText(/要件定義書/)).toBeInTheDocument();
    expect(screen.getByText(/v1.2.3/)).toBeInTheDocument();

    // 目標
    expect(screen.getByText('UX改善')).toBeInTheDocument();
    expect(screen.getByText('パフォーマンス向上')).toBeInTheDocument();

    // ユーザー要求のリッチ情報
    const req = screen.getAllByText(/FR-ABC-001/)[0].closest('li')!;
    const withinReq = within(req);
    expect(withinReq.getByText(/検索機能/)).toBeInTheDocument();
    expect(withinReq.getByText(/全文検索を提供する/)).toBeInTheDocument();
    expect(withinReq.getByTestId('priority-badge')).toHaveTextContent('high');
    expect(withinReq.getByTestId('status-badge')).toHaveTextContent('in-progress');
    expect(withinReq.getByText(/owner/i)).toBeInTheDocument();
    expect(withinReq.getByText(/STK-001/)).toBeInTheDocument();
    expect(withinReq.getByText(/component/i)).toBeInTheDocument();
    expect(withinReq.getByText(/core/)).toBeInTheDocument();
    expect(withinReq.getByText(/effort/i)).toBeInTheDocument();
    expect(withinReq.getByText(/3/)).toBeInTheDocument();
    expect(withinReq.getByText(/risk/i)).toBeInTheDocument();
    const riskTextElement = withinReq.getByText(/risk:/i).parentElement;
    expect(riskTextElement).toHaveTextContent('high');
    expect(withinReq.getByText(/受け入れ条件/)).toBeInTheDocument();
    expect(withinReq.getByText('キーワード一致')).toBeInTheDocument();
    expect(withinReq.getByText('日本語形態素')).toBeInTheDocument();
    expect(withinReq.getByText(/依存/)).toBeInTheDocument();
    expect(withinReq.getByText(/FR-ABC-000/)).toBeInTheDocument();
    expect(withinReq.getByText(/関連/)).toBeInTheDocument();
    expect(withinReq.getByText(/TASK-PRJ-001/)).toBeInTheDocument();
    expect(withinReq.getByText(/DSG-ABC-001/)).toBeInTheDocument();
    expect(withinReq.getByText(/タグ/)).toBeInTheDocument();
    expect(withinReq.getByText(/search/)).toBeInTheDocument();
    expect(withinReq.getByText(/frontend/)).toBeInTheDocument();

    // 用語集
    expect(screen.getByText(/用語集/)).toBeInTheDocument();
    expect(screen.getByText('NFR')).toBeInTheDocument();
    const glossaryTable = screen.getByRole('table');
    expect(glossaryTable).toHaveTextContent('非機能要件');
  });
});

