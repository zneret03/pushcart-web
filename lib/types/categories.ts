import { Database } from './db-types';

export type Categories = Database['public']['Tables']['categories']['Row'];

export type CategoriesInsert =
  Database['public']['Tables']['categories']['Insert'];

export type CategoriesUpdate =
  Database['public']['Tables']['categories']['Update'];

export type SubCategories = Pick<
  CategoriesInsert,
  'parent_id' | 'name' | 'description' | 'id'
>;
