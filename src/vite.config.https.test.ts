import { describe, expect, it } from 'vitest';
import { shouldEnableDevHttps } from '../vite.config';

describe('shouldEnableDevHttps', () => {
  it('is off during production build even if cert files exist', () => {
    expect(shouldEnableDevHttps('build', true, true)).toBe(false);
  });

  it('is off for the dev server when cert files are missing', () => {
    expect(shouldEnableDevHttps('serve', false, false)).toBe(false);
    expect(shouldEnableDevHttps('serve', true, false)).toBe(false);
  });

  it('is on only for the local dev server when both certs exist', () => {
    expect(shouldEnableDevHttps('serve', true, true)).toBe(true);
  });
});
