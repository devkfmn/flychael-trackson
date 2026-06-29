export function formatMoney(
  amount: number | null | undefined,
  currency = 'CHF',
): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format whole minutes as `1h 23m` (or `23m`). */
export function formatAirtime(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Format decimal hours as `123.4 h`. */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null) return '—';
  return `${hours.toLocaleString('de-CH', { maximumFractionDigits: 1 })} h`;
}
