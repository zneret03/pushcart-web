import { Database } from './db-types';

export type Orders = Database['public']['Tables']['orders']['Row'];
export type OrdersInsert = Database['public']['Tables']['orders']['Insert'];
export type OrdersUpdate = Database['public']['Tables']['orders']['Update'];
