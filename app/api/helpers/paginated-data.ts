import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

interface PaginatedData {
  tableName: string;
  supabase: SupabaseClient;
  columns: string;
  search?: {
    column: string;
    query: string;
  };
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
  sortBy?: string;
  specificTable?: {
    column: string;
    tableId: string;
  } | null;
  limit?: number;
}

export const paginatedData = async <TData>({
  tableName,
  supabase,
  columns,
  search,
  page,
  perPage,
  sortBy,
  specificTable,
  sortOrder = 'asc',
  limit,
}: PaginatedData): Promise<{
  data: TData[] | null;
  error: PostgrestError | null;
  totalPages: number;
  currentPage: number;
  count: number | null;
}> => {
  let query = supabase
    .from(tableName)
    .select(columns, { count: 'exact' })
    .is('archived_at', null);

  if (limit) {
    query = query.limit(limit);
  }

  if (specificTable?.column) {
    query = query.eq(specificTable.column, specificTable.tableId);
  }

  if (search && search.column && search.query !== 'undefined') {
    query = query.ilike(search.column, `%${search.query}%`);
  }

  if (sortBy) {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  }

  const from = ((page as number) - 1) * (perPage as number);
  const to = from + (perPage as number) - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  const totalPages = Math.ceil(Number(count) / Number(perPage));

  return {
    data: data as TData[],
    totalPages,
    currentPage: page as number,
    error,
    count,
  };
};
