import { Database } from './db-types';
import { Products } from './product';

export type Carts = Database['public']['Tables']['carts']['Row'];
export type CartItems = Database['public']['Tables']['cart_items']['Row'];

export interface CartItemsProducts extends CartItems {
  products: Products;
  carts: Carts[];
}
