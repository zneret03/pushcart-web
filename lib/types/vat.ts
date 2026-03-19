import { Database } from './db-types';

export type Vat = Database['public']['Tables']['vat_rates']['Row'];

export type VatInsert = Database['public']['Tables']['vat_rates']['Insert'];

export type VatUpdate = Database['public']['Tables']['vat_rates']['Update'];
