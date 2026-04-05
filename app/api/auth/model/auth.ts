import { createClient } from '@/config';
import {
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '../../helpers/response';
import { SignIn, UserForm } from '@/lib/types/users';

export const signInCustomer = async () => {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    const { data: cartData, error: cartError } = await supabase
      .from('carts')
      .insert({
        user_id: data.user?.id,
        customer_id: data.user?.id,
        status: 'active',
      })
      .select()
      .maybeSingle();

    if (cartError) {
      return generalErrorResponse({ error: cartError.message });
    }

    return successResponse({
      message: 'Successfully added product',
      data: {
        ...data,
        cart: cartData,
      },
    });
  } catch (error) {
    const newError = error as Error;
    console.error(newError);
    return generalErrorResponse({ error: newError.message });
  }
};

export const signIn = async (body: SignIn) => {
  try {
    const supabase = await createClient();

    const { error, data } = await supabase.auth.signInWithPassword({
      email: body.email as string,
      password: body.password as string,
    });

    if (error || !data.session) {
      return unauthorizedResponse({
        error: error?.message || 'Invalid credentials',
      });
    }

    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select(
        'role, email, first_name, last_name, middle_name, avatar_url, address',
      )
      .eq('id', data.user?.id)
      .single();

    if (userError) {
      return unauthorizedResponse({ error: userError?.message });
    }

    return successResponse({
      message: 'Signed in successfully',
      data: { ...userData, id: data.user?.id } as UserForm,
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const signOut = async () => {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw generalErrorResponse({ error: error.message });
    }

    return successResponse({ message: 'Signout successfully' });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};
