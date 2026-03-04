import { Database } from './db-types';

export type Products = Database['public']['Tables']['products']['Row'];
export type ProductsInsert = Database['public']['Tables']['products']['Insert'];
export type ProductsUpdate = Database['public']['Tables']['products']['Update'];
