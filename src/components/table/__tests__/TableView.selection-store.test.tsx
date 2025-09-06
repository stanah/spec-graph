import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { TableViewConnected } from '../TableViewConnected';
import type { MindmapNode } from '../../../types';
import { useAppStore } from '../../../stores/appStore';

const makeNode = (id: string, title: string): MindmapNode => ({ id, title, children: [] });

describe('TableViewConnected selection sync with store', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('highlights selected row by selectedNodeId and updates store on click', () => {
    const nodes: MindmapNode[] = [
      makeNode('A', 'Alpha'),
      makeNode('B', 'Beta'),
    ];

    render(<TableViewConnected data={nodes} />);

    // Initially no selection
    const rowA = document.querySelector('[data-rowid="A"]') as HTMLTableRowElement;
    const rowB = document.querySelector('[data-rowid="B"]') as HTMLTableRowElement;
    expect(rowA.getAttribute('data-selected')).toBeNull();
    expect(rowB.getAttribute('data-selected')).toBeNull();

    // Set selection in store and expect B to be marked
    useAppStore.getState().selectNode('B');
    // Wait microtask for React to re-render
    // eslint-disable-next-line @typescript-eslint/await-thenable
    return Promise.resolve().then(() => {
      const rowBAfter = document.querySelector('[data-rowid="B"]') as HTMLTableRowElement;
      expect(rowBAfter.getAttribute('data-selected')).toBe('true');

      // Click on Alpha to update selection via component
      fireEvent.click(rowA);
      expect(useAppStore.getState().ui.selectedNodeId).toBe('A');
    });
  });
});
