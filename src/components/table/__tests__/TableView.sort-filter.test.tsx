import { render, screen, cleanup } from '@testing-library/react';
import React, { useState } from 'react';
import type { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { TableView } from '../TableView';

type Row = { id: string; name: string; status: string };

const data: Row[] = [
  { id: '1', name: 'Charlie', status: 'open' },
  { id: '2', name: 'Alpha', status: 'closed' },
  { id: '3', name: 'Beta', status: 'open' },
];

const columns: ColumnDef<Row, any>[] = [
  { header: 'ID', accessorKey: 'id' },
  { header: 'Name', accessorKey: 'name' },
  { header: 'Status', accessorKey: 'status' },
];

describe('TableView sorting and filtering', () => {
  afterEach(() => cleanup());

  it('applies sorting state (name asc/desc)', async () => {
    const Wrapper = ({ initial }: { initial: SortingState }) => {
      const [sorting, setSorting] = useState<SortingState>(initial);
      return (
        <TableView<Row>
          data={data}
          columns={columns}
          sorting={sorting}
          onSortingChange={setSorting}
        />
      );
    };

    const { rerender } = render(<Wrapper initial={[{ id: 'name', desc: false }]} />);

    const rowsAsc = screen.getAllByRole('row').slice(1);
    expect(rowsAsc.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Alpha'),
      expect.stringContaining('Beta'),
      expect.stringContaining('Charlie'),
    ]);

    rerender(<Wrapper initial={[{ id: 'name', desc: true }]} />);

    const rowsDesc = screen.getAllByRole('row').slice(1);
    expect(rowsDesc.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Charlie'),
      expect.stringContaining('Beta'),
      expect.stringContaining('Alpha'),
    ]);
  });

  it('filters rows by column filter (status includes "open")', () => {
    const Wrapper = ({ initial }: { initial: ColumnFiltersState }) => {
      const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initial);
      return (
        <TableView<Row>
          data={data}
          columns={columns}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
        />
      );
    };

    render(<Wrapper initial={[{ id: 'status', value: 'open' }]} />);

    const rows = screen.getAllByRole('row').slice(1);
    const texts = rows.map((r) => r.textContent || '');
    expect(texts.some((t) => t.includes('closed'))).toBe(false);
    expect(texts.filter((t) => t.includes('open')).length).toBe(2);
  });

  it('applies globalFilter to all columns', () => {
    const Wrapper = ({ gf }: { gf: string }) => {
      const [globalFilter, setGlobalFilter] = useState<string>(gf);
      return (
        <TableView<Row>
          data={data}
          columns={columns}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
        />
      );
    };

    const { rerender } = render(<Wrapper gf="Alpha" />);
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Alpha');

    rerender(<Wrapper gf="open" />);
    rows = screen.getAllByRole('row').slice(1);
    expect(rows.length).toBe(2);
    rows.forEach((r) => expect(r.textContent).toMatch(/open/));
  });
});

