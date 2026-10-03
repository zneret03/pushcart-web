import { forbiddenResponse } from '@/app/api/helpers/response';

// A self-checkout cart is the camera's (SCANnCART basket mode): customers no longer add,
// change or remove items by hand, so this route refuses both verbs. The one correction left
// is staff's, through ./staff-remove, behind a PIN. pos_customer_edit is also no longer
// executable by customers, so this holds even for a caller who skips the route.
const disabled = () =>
  forbiddenResponse({
    error: 'customer_edits_disabled',
    message:
      'Items are added and removed by the camera. Ask staff to correct the cart.',
  });

export async function PUT() {
  return disabled();
}

export async function DELETE() {
  return disabled();
}
