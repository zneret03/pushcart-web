const roundToCents = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

// `vat_rates.rate` is a percentage (12.00 means 12%), so the tax is a share of the
// subtotal, not a flat amount. Rounded to cents to match `orders.vat_amount` (NUMERIC(10, 2)).
export const calculateVat = (subtotal: number, ratePercent: number): number => {
  if (subtotal <= 0 || ratePercent <= 0) return 0;

  return roundToCents((subtotal * ratePercent) / 100);
};

export const calculateTotalPayment = (subtotal: number, vat: number): number =>
  roundToCents(subtotal + vat);
