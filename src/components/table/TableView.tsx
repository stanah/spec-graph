import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

export type TableViewProps<T extends object> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  className?: string;
};

export function TableView<T extends object>({ data, columns, className }: TableViewProps<T>) {
  const table = useReactTable<T>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
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

