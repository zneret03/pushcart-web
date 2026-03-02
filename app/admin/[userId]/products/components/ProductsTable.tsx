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
import { ChevronDown, Plus, MoreHorizontal, Pencil, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, subHours } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useShallow } from 'zustand/shallow';
import { useProductDialog } from '@/services/products/state/product-dialog';
import { Pagination } from '@/components/custom/Pagination';
import { Pagination as PaginationType } from '@/lib/types/pagination';
import { useRouter, usePathname } from 'next/navigation';
import { debounce } from 'lodash';
import { Products } from '@/lib/types/product';

interface AwardsData extends PaginationType {
  products: Products[];
}

export function ProductsTable({
  products: data,
  totalPages,
  currentPage,
  count,
}: AwardsData) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const { toggleOpen } = useProductDialog(
    useShallow((state) => ({ toggleOpen: state.toggleOpenDialog })),
  );

  const pathname = usePathname();
  const router = useRouter();

  const isDashboard = pathname.endsWith('/dashboard');

  const onDebounce = React.useMemo(
    () =>
      debounce((value) => {
        if (!value) {
          router.replace(`${pathname}?page=${currentPage}&search=${value}`);
          return;
        }

        router.replace(`${pathname}?page=${currentPage}`);
      }, 500),
    [pathname, router, currentPage],
  );

  const onSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const { value } = event.target;
    onDebounce(value);
  };

  const showMoreProducts = (): void => {
    router.replace(`${pathname}/products`);
  };

  const columns: ColumnDef<Products>[] = React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: function ({ row }) {
          return (
            <div className="flex items-center gap-2">
              <div>{row.original.name}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: function ({ row }) {
          return (
            <div className="font-medium capitalize">{row.original.sku}</div>
          );
        },
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: function ({ row }) {
          return (
            <Badge variant="secondary" className="w-auto">
              <div className="text-ellipsis capitalize">
                {row.original.price}
              </div>
            </Badge>
          );
        },
      },
      {
        accessorKey: 'stock_quantity',
        header: 'Quantity',
        cell: function ({ row }) {
          return (
            <Badge variant="secondary">
              <div>{row.original.stock_quantity}</div>{' '}
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
      {
        id: 'actions',
        header: 'Actions',
        enableHiding: false,
        cell: ({ row }) => (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Pencil />
                Edit info
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toggleOpen?.(true, 'delete', {
                    ...row.original,
                  })
                }
              >
                <Trash />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
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
      <div className="flex items-center justify-between py-4">
        {isDashboard && (
          <h1 className="text-2xl font-semibold">Products Summary</h1>
        )}
        {!isDashboard && (
          <Input
            placeholder="Search user by email..."
            onChange={(event) => onSearch(event)}
            className="max-w-sm"
          />
        )}

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map(function (column) {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {isDashboard && data.length >= 5 && (
            <Button variant="outline" onClick={() => showMoreProducts()}>
              <Plus className="h-5 w-5" />
              Show more
            </Button>
          )}

          {!isDashboard && (
            <Button onClick={() => toggleOpen?.(true, 'add')}>
              <Plus className="h-5 w-5" />
              Add Products
            </Button>
          )}
        </div>
      </div>

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

      {data.length > 0 && (
        <Pagination {...{ totalPages, currentPage, count }} />
      )}
    </div>
  );
}
