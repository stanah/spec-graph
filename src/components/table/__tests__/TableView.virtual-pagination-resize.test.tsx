import { render, screen } from '@testing-library/react';
import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { TableView } from '../TableView';

type Row = { id: string; name: string };

const makeData = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: String(i + 1), name: `Item-${i + 1}` }));

const columns: ColumnDef<Row, any>[] = [
  { header: 'ID', accessorKey: 'id' },
  { header: 'Name', accessorKey: 'name' },
];

describe('TableView pagination / virtualization / resize', () => {
  it('supports pagination state (pageIndex/pageSize)', () => {
    const data = makeData(5);
    render(
      <TableView<Row>
        data={data}
        columns={columns}
        pagination={{ pageIndex: 1, pageSize: 2 }}
      />
    );
    const rows = screen.getAllByRole('row').slice(1);
    // pageIndex=1, pageSize=2 => items 3-4 (1-based): 3rd and 4th rows
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Item-3');
    expect(rows[1].textContent).toContain('Item-4');
  });

  it('renders limited rows when virtualized (initial window)', () => {
    const data = makeData(100);
    render(
      <TableView<Row>
        data={data}
        columns={columns}
        virtualized
        containerHeight={100}
        rowHeight={20}
      />
    );
    const rows = screen.getAllByRole('row').slice(1);
    // Should render far fewer than 100 rows (approx 5 visible + overscan)
    expect(rows.length).toBeLessThanOrEqual(15);
    expect(screen.queryByText('Item-100')).toBeNull();
    expect(screen.getByText('Item-1')).toBeInTheDocument();
  });

  it('applies column sizing from state', () => {
    const data = makeData(3);
    render(
      <TableView<Row>
        data={data}
        columns={columns}
        columnSizing={{ name: 180 }}
      />
    );
    // Find Name header and check width style
    const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
    const width = (nameHeader as HTMLElement).style.width;
    expect(width).toBe('180px');
  });
});

