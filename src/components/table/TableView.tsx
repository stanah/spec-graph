import React from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
  type OnChangeFn,
  getPaginationRowModel,
  type PaginationState,
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
  // Selection
  selectedRowId?: string | null;
  onRowSelect?: (rowId: string) => void;
  getRowId?: (row: T) => string;
  // Pagination
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  // Virtualization (simple initial windowing)
  virtualized?: boolean;
  containerHeight?: number;
  rowHeight?: number; // used for simple windowing calculation
  // Column sizing
  columnSizing?: Record<string, number>;
  onColumnSizingChange?: OnChangeFn<Record<string, number>>;
  columnResizeMode?: 'onChange' | 'onEnd';
};

export function TableView<T extends object>({ data, columns, className, sorting, onSortingChange, columnFilters, onColumnFiltersChange, globalFilter, selectedRowId, onRowSelect, getRowId, pagination, onPaginationChange, virtualized, containerHeight, rowHeight = 32, columnSizing, onColumnSizingChange, columnResizeMode = 'onChange' }: TableViewProps<T>) {
  const preFiltered = applyGlobalFilter(data, columns, globalFilter);
  const table = useReactTable<T>({
    data: preFiltered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      pagination,
      columnSizing,
    },
    onSortingChange,
    onColumnFiltersChange,
    onPaginationChange,
    onColumnSizingChange,
    columnResizeMode,
  });

  const headerContent = (
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                scope="col"
                style={{
                  width:
                    columnSizing && (header as any).column?.id && columnSizing[(header as any).column.id]
                      ? `${columnSizing[(header as any).column.id]}px`
                      : undefined,
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
                {header.column?.getCanResize?.() && (
                  <div
                    onMouseDown={header.getResizeHandler?.()}
                    onTouchStart={header.getResizeHandler?.()}
                    style={{
                      display: 'inline-block',
                      width: 6,
                      marginLeft: 4,
                      cursor: 'col-resize',
                      userSelect: 'none',
                    }}
                  />
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
  );

  const fullRows = pagination ? table.getPaginationRowModel().rows : table.getRowModel().rows;
  const windowedRows = (() => {
    if (!virtualized || !containerHeight) return fullRows;
    const visible = Math.ceil(containerHeight / rowHeight) + 10; // overscan = 10
    return fullRows.slice(0, Math.min(visible, fullRows.length));
  })();

  const bodyContent = (
      <tbody>
        {windowedRows.map((row) => {
          const original = row.original as any;
          const rid: string | undefined = getRowId ? getRowId(row.original) : original?.id;
          const selected = rid && selectedRowId === rid;
          return (
            <tr
              key={row.id}
              data-rowid={rid}
              data-selected={selected ? 'true' : undefined}
              aria-selected={selected}
              onClick={() => rid && onRowSelect?.(rid)}
            >
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
          );
        })}
      </tbody>
  );

  return (
    <div style={virtualized && containerHeight ? { maxHeight: containerHeight, overflow: 'auto' } : undefined}>
      <table className={className}>
        {headerContent}
        {bodyContent}
      </table>
    </div>
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
