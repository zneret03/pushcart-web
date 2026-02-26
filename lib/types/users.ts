import { Database } from './db-types';

export type Users = Database['public']['Tables']['profiles']['Row'];
export type UpdateUser = Database['public']['Tables']['profiles']['Update'];

export type UserForm = Omit<
  Users,
  'created_at' | 'updated_at' | 'archived_at' | 'avatar_url'
> & {
  password?: string;
};

export interface SignIn extends UserForm {
  password: string;
}
