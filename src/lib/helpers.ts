/**
 * Format a numeric string or number as a USD balance, stripping trailing zeros
 * (e.g. "20.000000" → "20", "20.5000" → "20.5", "1234.5678" → "1,234.57").
 * Returns '0' if the value is not a valid number.
 */
export function formatBalance(val: string | number): string {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function shortAddress(addr: string) {
  if (!addr) return '—';
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}
