// Money comes from the API as a plain number (stored as DECIMAL(14,2));
// older payloads may still send a numeric string.
export const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

// "ETB 1,250.00"
export const formatMoney = (value: number | string | null | undefined): string =>
  `ETB ${toNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatQty = (value: number | null | undefined): string =>
  (value ?? 0).toLocaleString('en-US');
