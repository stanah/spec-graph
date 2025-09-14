import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BreadcrumbNavigation } from '../BreadcrumbNavigation';
import { useAppStore } from '../../../stores/appStore';

const setData = () => {
  useAppStore.setState((s) => ({
    parse: {
      ...s.parse,
      parsedData: {
        version: '1.0',
        title: 'Doc',
        schema: { version: '1.0' },
        root: {
          id: 'ROOT',
          title: 'Root',
          children: [
            { id: 'A', title: 'A', children: [] },
            { id: 'B', title: 'B', children: [ { id: 'B-1', title: 'B-1', children: [] } ] },
          ]
        }
      }
    }
  }));
};

describe('BreadcrumbNavigation', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    setData();
  });

  it('選択なしの場合はルートのみ表示', () => {
    render(<BreadcrumbNavigation />);
    const crumbs = screen.getByTestId('breadcrumbs');
    expect(crumbs).toBeInTheDocument();
    expect(screen.getByTestId('crumb-0').textContent).toBe('Root');
  });

  it('選択に応じてルートからの経路を表示', () => {
    useAppStore.getState().selectNode('B-1');
    render(<BreadcrumbNavigation />);
    expect(screen.getByTestId('crumb-0').textContent).toBe('Root');
    expect(screen.getByTestId('crumb-1').textContent).toBe('B');
    expect(screen.getByTestId('crumb-2').textContent).toBe('B-1');
  });

  it('クリックでselectNodeが呼ばれ、選択が更新される', () => {
    useAppStore.getState().selectNode('B-1');
    render(<BreadcrumbNavigation />);
    fireEvent.click(screen.getByTestId('crumb-1'));
    expect(useAppStore.getState().ui.selectedNodeId).toBe('B');
  });
});

