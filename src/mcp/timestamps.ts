/**
 * Convert Firestore timestamps (and the shapes they serialize to) into epoch
 * millis. Always call `toMillis` as a *method* — extracting it (`const fn =
 * ts.toMillis; fn()`) loses `this` and throws or returns NaN.
 */
export function timestampToMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value !== 'object') return null;

  const rec = value as {
    toMillis?: unknown;
    seconds?: unknown;
    nanoseconds?: unknown;
    _seconds?: unknown;
    _nanoseconds?: unknown;
  };

  if (typeof rec.toMillis === 'function') {
    const ms = (rec.toMillis as () => unknown).call(rec);
    return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
  }

  const seconds =
    typeof rec.seconds === 'number'
      ? rec.seconds
      : typeof rec._seconds === 'number'
        ? rec._seconds
        : null;
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const nanos =
    typeof rec.nanoseconds === 'number'
      ? rec.nanoseconds
      : typeof rec._nanoseconds === 'number'
        ? rec._nanoseconds
        : 0;
  return seconds * 1000 + Math.floor((Number.isFinite(nanos) ? nanos : 0) / 1e6);
}

export function timestampToMillisOr(
  value: unknown,
  fallback: number,
): number {
  return timestampToMillis(value) ?? fallback;
}
