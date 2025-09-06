import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentView } from '../DocumentView';
import { useAppStore } from '../../../stores/appStore';

const data = {
  version: '1.0.0',
  title: 'Badges Doc',
  root: {
    id: 'root',
    title: 'Root',
    status: 'in-progress',
    priority: 'high',
    children: [
      { id: 'c1', title: 'Child', status: 'pending', priority: 'medium', children: [] },
    ],
  },
};

describe('DocumentView badges', () => {
  beforeEach(async () => {
    useAppStore.getState().reset();
    await useAppStore.getState().parseContent(JSON.stringify(data));
  });

  it('見出し行にステータス・優先度バッジを表示する', async () => {
    render(<DocumentView />);
    // ルートと子要素のバッジ
    const statusBadges = await screen.findAllByTestId('status-badge');
    const priorityBadges = await screen.findAllByTestId('priority-badge');
    expect(statusBadges[0]).toBeInTheDocument();
    expect(priorityBadges[0]).toBeInTheDocument();
    // 子要素（2個目のバッジ群も描画されているはず）
    expect(statusBadges.length).toBeGreaterThan(1);
    expect(priorityBadges.length).toBeGreaterThan(1);
  });
});

