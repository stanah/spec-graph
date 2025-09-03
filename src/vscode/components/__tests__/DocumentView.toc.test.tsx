import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
      { id: 'c2', title: 'Child 2', description: 'B', children: [] },
    ],
  },
};

describe('DocumentView TOC', () => {
  beforeEach(async () => {
    useAppStore.getState().reset();
    await useAppStore.getState().parseContent(JSON.stringify(data));
  });

  it('TOCを表示し、クリックで該当セクションにスクロール', async () => {
    render(<DocumentView />);

    // TOCが出ている
    const toc = await screen.findByTestId('doc-toc');
    expect(toc).toBeInTheDocument();

    // 目次アイテムがある
    const item = await screen.findByTestId('toc-item-c2');
    expect(item).toBeInTheDocument();

    // クリックでscrollIntoViewが呼ばれる
    const spy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    await userEvent.click(item);
    expect(spy).toHaveBeenCalled();
  });
});

