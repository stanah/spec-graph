import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { buildMindmapColumns } from '../buildMindmapColumns';
import { TableView } from '../TableView';
import type { MindmapNode } from '../../../types';

const makeNode = (partial: Partial<MindmapNode>): MindmapNode => ({
  id: 'id',
  title: 'title',
  children: [],
  ...partial,
});

describe('TableView badges (status/priority)', () => {
  it('renders status and priority as badges via custom cell', () => {
    const nodes: MindmapNode[] = [
      makeNode({ id: 'A', title: 'Alpha', status: 'in-progress', priority: 'high' }),
      makeNode({ id: 'B', title: 'Beta', status: 'pending', priority: 'low' }),
    ];

    const columns = buildMindmapColumns(nodes);
    render(<TableView<MindmapNode> data={nodes} columns={columns} />);

    const rows = screen.getAllByRole('row').slice(1);

    const rowAlpha = rows[0];
    const alphaStatus = within(rowAlpha).getByTestId('status-badge');
    expect(alphaStatus).toHaveAttribute('data-status', 'in-progress');
    expect(alphaStatus.textContent).toContain('in-progress');

    const alphaPriority = within(rowAlpha).getByTestId('priority-badge');
    expect(alphaPriority).toHaveAttribute('data-priority', 'high');
    expect(alphaPriority.textContent).toContain('high');

    const rowBeta = rows[1];
    const betaStatus = within(rowBeta).getByTestId('status-badge');
    expect(betaStatus).toHaveAttribute('data-status', 'pending');
    const betaPriority = within(rowBeta).getByTestId('priority-badge');
    expect(betaPriority).toHaveAttribute('data-priority', 'low');
  });
});

