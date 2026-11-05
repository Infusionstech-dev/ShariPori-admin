const numberFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export function formatBDT(amount) {
  const value = Number(amount);
  return Number.isFinite(value) ? `৳ ${numberFormat.format(value)}` : '';
}
