import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentView } from '../DocumentView';
import { useAppStore } from '../../../stores/appStore';

const data = {
  version: '1.0.0',
  title: 'Doc Test',
  root: {
    id: 'root',
    title: 'Root',
    children: [
      { id: 'c1', title: 'Child 1', description: 'A', children: [] },
    ],
  },
};

describe('DocumentView print attributes', () => {
  beforeEach(async () => {
    useAppStore.getState().reset();
    await useAppStore.getState().parseContent(JSON.stringify(data));
  });

  it('印刷用にTOCやトグルボタンが非表示フラグを持つ', async () => {
    render(<DocumentView />);
    const toc = await screen.findByTestId('doc-toc');
    expect(toc).toHaveAttribute('data-print-hide', 'true');
    const toggle = await screen.findByTestId('dv-toggle-c1');
    expect(toggle).toHaveAttribute('data-print-hide', 'true');
  });

  it('印刷対象ルートが指定されている', async () => {
    render(<DocumentView />);
    const root = await screen.findByTestId('document-view');
    expect(root).toHaveAttribute('data-print-root', 'true');
  });
});

