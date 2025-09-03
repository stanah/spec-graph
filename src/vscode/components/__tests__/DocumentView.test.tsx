import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentView } from '../DocumentView';
import { useAppStore } from '../../../stores/appStore';

const sampleData = {
  version: '1.0.0',
  title: 'Doc Test',
  root: {
    id: 'root',
    title: 'Root',
    description: 'Intro',
    children: [
      { id: 'c1', title: 'Child', description: 'Body', children: [] },
    ],
  },
};

describe('DocumentView', () => {
  beforeEach(async () => {
    useAppStore.getState().reset();
    await useAppStore.getState().parseContent(JSON.stringify(sampleData));
  });

  it('アウトライン（見出し・段落）を描画する', async () => {
    render(<DocumentView />);
    expect(await screen.findByText('Root')).toBeInTheDocument();
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('子セクションを折りたたみ可能', async () => {
    render(<DocumentView />);
    const toggle = await screen.findByTestId('dv-toggle-c1');
    await userEvent.click(toggle);
    expect(screen.queryByText('Body')).not.toBeInTheDocument();
  });
});
