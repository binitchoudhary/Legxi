/**
 * Formats an amount in paise to a localized INR string.
 * @param paise The amount in paise as a string or number
 */
export function formatCurrency(paise: string | number): string {
  if (!paise) return '₹0.00';
  const amount = typeof paise === 'string' ? parseInt(paise, 10) : paise;
  if (isNaN(amount)) return '₹0.00';
  
  return `₹${(amount / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats a decimal to a percentage string.
 * @param value Decimal value (e.g., 0.85 for 85%)
 */
export function formatPercentage(value: number): string {
  if (isNaN(value)) return '0%';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Formats large numbers with thousands separators.
 * @param value The number to format
 */
export function formatNumber(value: number): string {
  if (isNaN(value)) return '0';
  return value.toLocaleString('en-IN');
}
