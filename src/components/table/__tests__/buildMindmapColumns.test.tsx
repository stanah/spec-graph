import { render, screen } from '@testing-library/react';
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

describe('buildMindmapColumns', () => {
  const nodes: MindmapNode[] = [
    makeNode({
      id: 'A',
      title: 'Alpha',
      status: 'in-progress',
      priority: 'high',
      tags: ['t1', 't2'],
      customFields: { owner: 'Alice', estimate: 3 },
    }),
    makeNode({
      id: 'B',
      title: 'Beta',
      status: 'pending',
      priority: 'medium',
      tags: ['t3'],
      customFields: { owner: 'Bob' },
    }),
  ];

  it('generates base and custom field columns and renders values', () => {
    const columns = buildMindmapColumns(nodes);

    // Render using TableView to validate integration
    render(<TableView<MindmapNode> data={nodes} columns={columns} />);

    // headers should include base fields and custom fields
    expect(screen.getByRole('columnheader', { name: 'Id' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Priority' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tags' })).toBeInTheDocument();

    expect(screen.getByRole('columnheader', { name: 'estimate' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'owner' })).toBeInTheDocument();

    // body should contain custom field values and joined tags
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('t1, t2')).toBeInTheDocument();
  });
});

