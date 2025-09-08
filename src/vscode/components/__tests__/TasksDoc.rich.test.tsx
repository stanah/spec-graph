import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { TasksDocView } from '../docs/TasksDoc';

describe('TasksDocView (rich)', () => {
  it('タイプ/優先度/見積/期限/タグ/関連/メモを表示できる', () => {
    const doc = {
      title: 'タスク一覧',
      version: '1.0.0',
      epics: [
        {
          id: 'TASK-PRJ-001',
          title: '検索機能の実装',
          type: 'feature',
          status: 'in-progress',
          priority: 'high',
          assignee: 'STK-001',
          estimate: 5,
          dueDate: '2024-08-01T00:00:00Z',
          relatesTo: [
            { type: 'requirement', id: 'FR-ABC-001' },
            { type: 'design', id: 'DSG-ABC-001' },
          ],
          notes: '検索クエリのUIを先に',
          tags: ['frontend', 'search'],
        },
      ],
    } as any;

    render(<TasksDocView doc={doc} />);

    const item = screen.getByText(/TASK-PRJ-001/).closest('li')!;
    const w = within(item);
    expect(w.getByText(/feature/i)).toBeInTheDocument();
    expect(w.getByText(/high/i)).toBeInTheDocument();
    expect(w.getByText(/見積/)).toBeInTheDocument();
    expect(w.getByText(/5/)).toBeInTheDocument();
    expect(w.getByText(/期限/)).toBeInTheDocument();
    expect(w.getByText(/2024/)).toBeInTheDocument();
    expect(w.getByText(/タグ/)).toBeInTheDocument();
    expect(w.getByText(/frontend/)).toBeInTheDocument();
    expect(w.getByText(/search/)).toBeInTheDocument();
    expect(w.getByText(/関連/)).toBeInTheDocument();
    expect(w.getByText(/FR-ABC-001/)).toBeInTheDocument();
    expect(w.getByText(/DSG-ABC-001/)).toBeInTheDocument();
    expect(w.getByText(/検索クエリのUIを先に/)).toBeInTheDocument();
  });
});

