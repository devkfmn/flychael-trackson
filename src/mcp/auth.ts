import { timingSafeEqual } from 'node:crypto';

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseBearerToken(
  authorization: string | string[] | undefined,
): string | null {
  const raw = headerValue(authorization);
  if (!raw) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(raw.trim());
  return match ? match[1] : null;
}

/**
 * Constant-time string compare. Length mismatches still run a dummy compare
 * so timing does not leak the expected token length.
 */
export function timingSafeEqualString(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length === b.length) {
    return timingSafeEqual(a, b);
  }
  const dummy = Buffer.alloc(b.length);
  a.copy(dummy, 0, 0, Math.min(a.length, b.length));
  timingSafeEqual(dummy, b);
  return false;
}

export function authorizeBearer(
  authorization: string | string[] | undefined,
  expectedToken: string | undefined,
): boolean {
  if (!expectedToken) return false;
  const token = parseBearerToken(authorization);
  if (!token) return false;
  return timingSafeEqualString(token, expectedToken);
}
