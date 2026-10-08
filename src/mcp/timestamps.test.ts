import { describe, expect, it } from 'vitest';
import { timestampToMillis } from './timestamps';

class FakeTimestamp {
  constructor(private readonly ms: number) {}
  toMillis(): number {
    if (this == null || typeof this.ms !== 'number') {
      throw new TypeError('toMillis called without Timestamp this');
    }
    return this.ms;
  }
}

describe('timestampToMillis', () => {
  it('passes through finite numbers', () => {
    expect(timestampToMillis(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(timestampToMillis(Number.NaN)).toBeNull();
  });

  it('calls toMillis as a method so Timestamp keeps this', () => {
    const ts = new FakeTimestamp(1234);
    const detached = ts.toMillis;
    expect(() => detached()).toThrow();
    expect(timestampToMillis(ts)).toBe(1234);
  });

  it('accepts {seconds, nanoseconds} and _seconds/_nanoseconds shapes', () => {
    expect(timestampToMillis({ seconds: 1, nanoseconds: 500_000_000 })).toBe(1500);
    expect(timestampToMillis({ _seconds: 2, _nanoseconds: 0 })).toBe(2000);
  });

  it('returns null for empty values', () => {
    expect(timestampToMillis(null)).toBeNull();
    expect(timestampToMillis(undefined)).toBeNull();
    expect(timestampToMillis({})).toBeNull();
  });
});
