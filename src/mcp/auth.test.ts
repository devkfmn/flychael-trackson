import { describe, expect, it } from 'vitest';
import { authorizeBearer, parseBearerToken, timingSafeEqualString } from './auth';

describe('parseBearerToken', () => {
  it('reads a Bearer token', () => {
    expect(parseBearerToken('Bearer secret-token')).toBe('secret-token');
    expect(parseBearerToken('bearer secret-token')).toBe('secret-token');
  });

  it('rejects missing or non-bearer headers', () => {
    expect(parseBearerToken(undefined)).toBeNull();
    expect(parseBearerToken('Basic abc')).toBeNull();
    expect(parseBearerToken('Bearer')).toBeNull();
  });
});

describe('timingSafeEqualString', () => {
  it('accepts equal strings and rejects different ones, including length mismatches', () => {
    expect(timingSafeEqualString('abc', 'abc')).toBe(true);
    expect(timingSafeEqualString('abc', 'abd')).toBe(false);
    expect(timingSafeEqualString('ab', 'abcd')).toBe(false);
  });
});

describe('authorizeBearer', () => {
  it('fails closed without a configured token', () => {
    expect(authorizeBearer('Bearer x', undefined)).toBe(false);
    expect(authorizeBearer('Bearer x', '')).toBe(false);
  });

  it('requires a matching bearer token', () => {
    expect(authorizeBearer('Bearer tok', 'tok')).toBe(true);
    expect(authorizeBearer('Bearer other', 'tok')).toBe(false);
    expect(authorizeBearer(undefined, 'tok')).toBe(false);
  });
});
