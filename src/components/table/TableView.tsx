import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
  type OnChangeFn,
  useReactTable,
} from '@tanstack/react-table';

export type TableViewProps<T extends object> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  className?: string;
  // Sorting
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  // Column filters
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  // Global filter (applied before table for simplicity)
  globalFilter?: string;
  onGlobalFilterChange?: OnChangeFn<string>;
};

export function TableView<T extends object>({ data, columns, className, sorting, onSortingChange, columnFilters, onColumnFiltersChange, globalFilter }: TableViewProps<T>) {
  const preFiltered = applyGlobalFilter(data, columns, globalFilter);
  const table = useReactTable<T>({
    data: preFiltered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange,
    onColumnFiltersChange,
  });

  return (
    <table className={className}>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} scope="col">
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(
                  // Fallback to value rendering when no custom cell renderer is provided
                  (cell.column.columnDef.cell as any) ?? ((info: any) => info.getValue?.()),
                  cell.getContext(),
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export type { ColumnDef };

function applyGlobalFilter<T extends object>(rows: T[], columns: ColumnDef<T, any>[], q?: string): T[] {
  const query = (q ?? '').trim().toLowerCase();
  if (!query) return rows;
  const keys: string[] = [];
  for (const col of columns as any[]) {
    const key = (col as any).accessorKey as string | undefined;
    if (key) keys.push(key);
  }
  if (keys.length === 0) return rows;
  return rows.filter((row: any) => {
    return keys.some((k) => String(row[k] ?? '').toLowerCase().includes(query));
  });
}
