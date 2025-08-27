import { render, screen, within } from '@testing-library/react';
import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
// Intentionally import from the component path for 25.1; index export can come later
import { TableView } from '../TableView';

type Row = { id: string; name: string; status: string };

const data: Row[] = [
  { id: '1', name: 'Alpha', status: 'open' },
  { id: '2', name: 'Beta', status: 'closed' },
];

const columns: ColumnDef<Row, any>[] = [
  { header: 'ID', accessorKey: 'id' },
  { header: 'Name', accessorKey: 'name' },
  { header: 'Status', accessorKey: 'status' },
];

describe('TableView basic rendering', () => {
  it('renders headers and rows with provided columns and data', () => {
    render(<TableView<Row> data={data} columns={columns} />);

    // headers
    expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();

    // rows
    const rows = screen.getAllByRole('row');
    // one header row + 2 data rows
    expect(rows.length).toBe(3);

    const bodyRows = rows.slice(1);
    expect(within(bodyRows[0]).getByText('Alpha')).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText('Beta')).toBeInTheDocument();
  });
});

