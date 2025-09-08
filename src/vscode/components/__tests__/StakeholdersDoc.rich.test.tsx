import { render, screen } from '@testing-library/react';
import React from 'react';
import { StakeholdersDocView } from '../docs/StakeholdersDoc';

describe('StakeholdersDocView (rich)', () => {
  it('責務や担当コンポーネント、メモを表示できる', () => {
    const doc = {
      title: '関係者一覧',
      version: '0.1.0',
      stakeholders: [
        {
          id: 'STK-001',
          name: 'Alice',
          role: 'product-owner',
          responsibilities: 'ロードマップ策定',
          contact: 'alice@example.com',
          availability: 'full-time',
          components: ['ui', 'core'],
          notes: '意思決定者'
        },
      ],
    } as any;

    render(<StakeholdersDocView doc={doc} />);

    expect(screen.getByText(/関係者一覧/)).toBeInTheDocument();
    // 新しい列の見出しがあること
    expect(screen.getByText('責務')).toBeInTheDocument();
    expect(screen.getByText('担当コンポーネント')).toBeInTheDocument();
    expect(screen.getByText('メモ')).toBeInTheDocument();

    // 値が表示されること
    expect(screen.getByText('ロードマップ策定')).toBeInTheDocument();
    expect(screen.getByText(/ui/)).toBeInTheDocument();
    expect(screen.getByText(/core/)).toBeInTheDocument();
    expect(screen.getByText('意思決定者')).toBeInTheDocument();
  });
});

