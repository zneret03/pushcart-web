'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { formatCurrency } from '@/helpers/formatAmountPh';
import { format, subHours } from 'date-fns';
import { Pagination } from '@/components/custom/Pagination';
import { Pagination as PaginationType } from '@/lib/types/pagination';
import { OrdersType } from '@/lib/types/Orders';

interface OrdersData extends PaginationType {
  orders: OrdersType[];
}

export function OrdersTable({
  orders: data,
  totalPages,
  currentPage,
  count,
}: OrdersData) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const router = useRouter();
  const pathname = usePathname();

  const onOpenOrders = (cartId: string): void => {
    router.replace(`${pathname}/${cartId}`);
  };

  const columns: ColumnDef<OrdersType>[] = React.useMemo(
    () => [
      {
        accessorKey: 'first_name',
        header: 'Cashier Name',
        cell: function ({ row }) {
          const cashierName = `${row.original.profiles.first_name} ${row.original.profiles.last_name}`;

          return (
            <div className="flex items-center gap-2">
              <div>{cashierName}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'Subtotal',
        header: 'subtotal',
        cell: function ({ row }) {
          return (
            <div className="font-medium capitalize">
              {formatCurrency(row.original.subtotal)}
            </div>
          );
        },
      },
      {
        accessorKey: 'Vat Amount',
        header: 'vat_amount',
        cell: function ({ row }) {
          return (
            <Badge variant="secondary" className="w-auto">
              <div className="text-ellipsis capitalize">
                {row.original.vat_amount}
              </div>
            </Badge>
          );
        },
      },
      {
        accessorKey: 'discount_amount',
        header: 'Discount Amount',
        cell: function ({ row }) {
          return (
            <Badge variant="secondary">
              <div>{formatCurrency(row.original.discount_amount)}</div>{' '}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'total_amount',
        header: 'Total Amount',
        cell: function ({ row }) {
          return (
            <Badge variant="secondary">
              <div>{formatCurrency(row.original.total_amount)}</div>{' '}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Created At',
        cell: function ({ row }) {
          return (
            <div className="capitalize">
              {format(
                subHours(row.getValue('created_at'), 8),
                'MMMM d, yyyy, h:mm:ss a',
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated At',
        cell: function ({ row }) {
          return (
            <div className="capitalize">
              {row.getValue('updated_at')
                ? format(
                    row.getValue('updated_at'),
                    "MMMM dd, yyyy hh:mm aaaaa'm'",
                  )
                : 'N/A'}
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(function (header) {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onOpenOrders(row.original.carts?.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data.length > 0 && (
        <Pagination {...{ totalPages, currentPage, count }} />
      )}
    </div>
  );
}
