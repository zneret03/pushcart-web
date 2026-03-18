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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { CartItemsProducts } from '@/lib/types/Carts';
import { updateItemQuantity } from '../helpers/updateItemQuantity';
import { updateCartItemsQuantity } from '@/services/cart/cart.services';
import { debounce } from 'lodash';

interface OrdersType {
  cartItems: CartItemsProducts[];
}

export function OrdersTable({ cartItems: data }: OrdersType) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [cartItems, setCartItems] = React.useState<CartItemsProducts[]>(data);

  const onDebounce = React.useMemo(
    () =>
      debounce((id: string, delta: number, currentCount: number) => {
        setCartItems((prev) => updateItemQuantity(prev, id, delta));

        updateCartItemsQuantity(currentCount, id);
      }, 100),
    [],
  );

  const adjustQuantity = React.useCallback(
    (id: string, delta: number, currentCount: number) => {
      onDebounce(id, delta, currentCount);
    },
    [onDebounce],
  );

  const columns: ColumnDef<CartItemsProducts>[] = React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: function ({ row }) {
          return (
            <div className="flex items-center gap-2">
              <Image
                src={row.original?.products?.image_url as string}
                width={500}
                height={500}
                className="h-10 w-10 rounded-md object-cover"
                alt=""
              />
              <div>{row.original?.products?.name}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        cell: function ({ row }) {
          return (
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                onClick={() => {
                  adjustQuantity(
                    row.original.id,
                    -1,
                    row.original.quantity - 1,
                  );
                }}
              >
                <Minus size="2" />
              </Button>
              <div className="font-medium">{row.original?.quantity}</div>
              <Button
                size="xs"
                onClick={() => {
                  adjustQuantity(row.original.id, 1, row.original.quantity + 1);
                }}
              >
                <Plus />
              </Button>
            </div>
          );
        },
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: function ({ row }) {
          return (
            <div className="flex items-center gap-2">
              <div className="font-medium">{row.original?.products?.price}</div>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: cartItems,
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

  React.useEffect(() => {
    setCartItems(data);
  }, [data]);

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
                  data-state={row.getIsSelected() && 'selected'}
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
    </div>
  );
}
