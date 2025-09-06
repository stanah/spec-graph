import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentView } from '../DocumentView';
import { useAppStore } from '../../../stores/appStore';

const data = {
  version: '1.0.0',
  title: 'Rich Doc',
  root: {
    id: 'root',
    title: '要件',
    description: 'イントロ',
    priority: 'high',
    status: 'in-progress',
    tags: ['req', 'v1'],
    deadline: '2025-08-01T00:00:00Z',
    createdAt: '2025-07-01T00:00:00Z',
    updatedAt: '2025-07-10T00:00:00Z',
    children: [
      {
        id: 'c1',
        title: '機能要件',
        description: '検索できること',
        priority: 'medium',
        status: 'pending',
        tags: ['search'],
      }
    ],
  },
};

describe('DocumentView (rich fields)', () => {
  beforeEach(async () => {
    useAppStore.getState().reset();
    await useAppStore.getState().parseContent(JSON.stringify(data));
  });

  it('優先度・ステータス・タグ・期限などのメタ情報を表示する', async () => {
    render(<DocumentView />);

    // 見出しと本文（TOCと重複するので見出しロールで判定）
    expect(await screen.findByRole('heading', { name: '要件' })).toBeInTheDocument();
    expect(screen.getByText('イントロ')).toBeInTheDocument();

    // メタ情報（root）
    expect(screen.getByText(/priority/i)).toBeInTheDocument();
    expect(screen.getByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText(/status/i)).toBeInTheDocument();
    expect(screen.getByText(/in-progress/i)).toBeInTheDocument();
    expect(screen.getByText('タグ')).toBeInTheDocument();
    expect(screen.getByText('req')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText(/期限/)).toBeInTheDocument();

    // 子要素のメタ情報
    expect(screen.getByText('機能要件')).toBeInTheDocument();
    expect(screen.getByText('検索できること')).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
    expect(screen.getByText('search')).toBeInTheDocument();
  });
});
