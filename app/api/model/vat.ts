import { VatInsert } from '@/lib/types/vat';
import { generalErrorResponse, successResponse } from '../helpers/response';
import { createClient } from '@/config';

export const addVat = async (data: VatInsert) => {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('vat_rates').insert(data);

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfuly added vat',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};

export const editVat = async (
  data: { [key: string]: string | Date },
  id: string,
) => {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('vat_rates')
      .update(data)
      .eq('id', id);

    if (error) {
      return generalErrorResponse({ error: error.message });
    }

    return successResponse({
      message: 'Successfuly updated vat',
    });
  } catch (error) {
    const newError = error as Error;
    return generalErrorResponse({ error: newError.message });
  }
};
