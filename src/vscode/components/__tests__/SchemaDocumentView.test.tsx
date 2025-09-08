import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { SchemaDocumentView } from '../schema/SchemaDocumentView';

describe('SchemaDocumentView', () => {
  it('スキーマのヒントに基づき見出しと配列オブジェクトをリッチ表示できる', () => {
    const schema: any = {
      $id: 'urn:test:requirements-lite',
      title: 'Requirements Document (Lite)',
      type: 'object',
      required: ['title', 'version', 'systemRequirements'],
      properties: {
        title: { type: 'string' },
        version: { type: 'string' },
        goals: { type: 'array', items: { type: 'string' }, 'x-ui': { display: 'list', section: 'meta' } },
        userRequirements: {
          type: 'array',
          title: 'ユーザー要求',
          items: {
            type: 'object',
            required: ['id', 'title'],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              status: { enum: ['draft', 'in-progress', 'done'], 'x-ui': { display: 'badge' } },
              priority: { enum: ['critical', 'high', 'medium', 'low'], 'x-ui': { display: 'badge' } },
              acceptanceCriteria: { type: 'array', items: { type: 'string' } }
            },
            additionalProperties: true
          },
          'x-ui': { display: 'list', section: 'main', order: 1 }
        },
        systemRequirements: {
          type: 'array',
          title: 'システム要件',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { enum: ['pending', 'in-progress', 'done'], 'x-ui': { display: 'badge' } }
            },
            additionalProperties: true
          },
          'x-ui': { display: 'list', section: 'main', order: 2 }
        },
        glossary: {
          type: 'array',
          title: '用語集',
          items: {
            type: 'object',
            required: ['term', 'definition'],
            properties: {
              term: { type: 'string' },
              definition: { type: 'string' }
            }
          },
          'x-ui': { display: 'table', section: 'appendix', order: 99 }
        }
      },
      additionalProperties: true
    };

    const doc = {
      title: '要件定義書（Lite）',
      version: '1.0.0',
      goals: ['UX改善', 'パフォーマンス向上'],
      userRequirements: [
        {
          id: 'FR-ABC-001',
          title: '検索機能',
          description: '全文検索を提供する',
          priority: 'high',
          status: 'in-progress',
          acceptanceCriteria: ['キーワード一致', '日本語形態素']
        }
      ],
      systemRequirements: [
        { id: 'FR-ABC-002', title: 'インデックス作成', status: 'pending' }
      ],
      glossary: [
        { term: 'NFR', definition: '非機能要件' }
      ]
    } as any;

    render(<SchemaDocumentView data={doc} schema={schema} />);

    // ヘッダー（タイトル + バージョン）
    expect(screen.getByText(/要件定義書（Lite）/)).toBeInTheDocument();
    expect(screen.getByText(/v1.0.0/)).toBeInTheDocument();

    // ユーザー要求 → リスト表示 + バッジ
    const li = screen.getAllByText(/FR-ABC-001/)[0].closest('li')!;
    const withinLi = within(li);
    // バッジはタイトルより前に表示される
    const header = withinLi.getByTestId('item-header');
    const headerChildren = Array.from(header.children) as HTMLElement[];
    expect(headerChildren[0]).toHaveAttribute('data-testid', 'status-badge');
    expect(headerChildren[1]).toHaveAttribute('data-testid', 'priority-badge');
    expect(withinLi.getByText(/検索機能/)).toBeInTheDocument();
    expect(withinLi.getByText(/全文検索を提供する/)).toBeInTheDocument();
    expect(withinLi.getByTestId('priority-badge')).toHaveTextContent('high');
    expect(withinLi.getByTestId('status-badge')).toHaveTextContent('in-progress');
    // 受け入れ条件の表示（ボックス化あり）
    expect(withinLi.getByText('キーワード一致')).toBeInTheDocument();
    expect(withinLi.getByText('日本語形態素')).toBeInTheDocument();
    expect(withinLi.getByTestId('ac-box')).toBeInTheDocument();

    // システム要件の項目一つ
    expect(screen.getByText(/FR-ABC-002/)).toBeInTheDocument();
    expect(screen.getByText(/インデックス作成/)).toBeInTheDocument();

    // 用語集はテーブル表示
    const glossaryTable = screen.getByRole('table');
    expect(glossaryTable).toHaveTextContent('NFR');
    expect(glossaryTable).toHaveTextContent('非機能要件');
  });
});
