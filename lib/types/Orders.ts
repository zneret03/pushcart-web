import { Database } from './db-types';
import { Products } from './product';
import { Users } from './users';

export type Orders = Database['public']['Tables']['orders']['Row'];
export type OrdersInsert = Database['public']['Tables']['orders']['Insert'];
export type OrdersUpdate = Database['public']['Tables']['orders']['Update'];

export interface OrdersType {
  profiles: Users;
  carts: {
    id: string;
    quantity: number;
    cart_items: {
      id: string;
      products: Products[];
    };
  };
  created_at: string;
  updated_at: string;
  discount_amount: number;
  id: string;
  subtotal: number;
  total_amount: number;
  vat_amount: number;
}
