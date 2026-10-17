import { describe, expect, it, vi } from 'vitest';
import {
  applyAppUpdate,
  CURRENT_BUILD_ID,
  fetchRemoteBuildId,
  isNewerDeploy,
  parseBuildId,
  resolveBuildId,
  stripUpdateCacheBust,
  UPDATE_QUERY_PARAM,
  withUpdateCacheBust,
} from './appUpdate';

describe('resolveBuildId', () => {
  it('falls back to dev for empty values', () => {
    expect(resolveBuildId(undefined)).toBe('dev');
    expect(resolveBuildId('')).toBe('dev');
    expect(resolveBuildId('  ')).toBe('dev');
  });

  it('trims a real build id', () => {
    expect(resolveBuildId(' abc123 ')).toBe('abc123');
  });
});

describe('parseBuildId', () => {
  it('reads a non-empty buildId string', () => {
    expect(parseBuildId({ buildId: 'sha-1' })).toBe('sha-1');
  });

  it('rejects missing or invalid payloads', () => {
    expect(parseBuildId(null)).toBeNull();
    expect(parseBuildId('sha-1')).toBeNull();
    expect(parseBuildId({})).toBeNull();
    expect(parseBuildId({ buildId: '' })).toBeNull();
    expect(parseBuildId({ buildId: 12 })).toBeNull();
  });
});

describe('isNewerDeploy', () => {
  it('is true only when both ids exist and differ', () => {
    expect(isNewerDeploy('abc', 'def')).toBe(true);
    expect(isNewerDeploy('abc', 'abc')).toBe(false);
    expect(isNewerDeploy('abc', null)).toBe(false);
    expect(isNewerDeploy('', 'def')).toBe(false);
  });
});

describe('update cache-bust query', () => {
  it('adds _up and can strip it back to a relative URL', () => {
    const href = withUpdateCacheBust('https://example.com/flights?q=1#top', 99);
    expect(href).toBe(`https://example.com/flights?q=1&${UPDATE_QUERY_PARAM}=99#top`);
    expect(stripUpdateCacheBust(href)).toBe('/flights?q=1#top');
  });

  it('returns null when the page was not an update reload', () => {
    expect(stripUpdateCacheBust('https://example.com/flights')).toBeNull();
  });
});

describe('fetchRemoteBuildId', () => {
  it('requests version.json with cache busting and parses buildId', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ buildId: 'remote-sha' }), { status: 200 }),
    );
    await expect(fetchRemoteBuildId(fetcher, 42)).resolves.toBe('remote-sha');
    expect(fetcher).toHaveBeenCalledWith('/version.json?t=42', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
  });

  it('returns null when the endpoint fails or is not JSON', async () => {
    await expect(
      fetchRemoteBuildId(async () => new Response('nope', { status: 404 }), 1),
    ).resolves.toBeNull();
    await expect(
      fetchRemoteBuildId(async () => new Response('<html>', { status: 200 }), 1),
    ).resolves.toBeNull();
  });
});

describe('applyAppUpdate', () => {
  it('unregisters service workers, clears caches, and hard-reloads', async () => {
    const unregister = vi.fn(async () => true);
    const deleteCache = vi.fn(async () => true);
    const replace = vi.fn();

    await applyAppUpdate({
      serviceWorker: {
        getRegistrations: async () => [{ unregister }],
      },
      caches: {
        keys: async () => ['workbox-precache'],
        delete: deleteCache,
      },
      location: {
        href: 'https://example.com/settings',
        replace,
      },
      now: 7,
    });

    expect(unregister).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledWith('workbox-precache');
    expect(replace).toHaveBeenCalledWith(
      `https://example.com/settings?${UPDATE_QUERY_PARAM}=7`,
    );
  });

  it('still reloads if cache cleanup throws', async () => {
    const replace = vi.fn();
    await applyAppUpdate({
      serviceWorker: {
        getRegistrations: async () => {
          throw new Error('no sw');
        },
      },
      location: {
        href: 'https://example.com/',
        replace,
      },
      now: 1,
    });
    expect(replace).toHaveBeenCalledOnce();
  });
});

describe('CURRENT_BUILD_ID', () => {
  it('is a non-empty build id from the Vite define', () => {
    expect(CURRENT_BUILD_ID.length).toBeGreaterThan(0);
  });
});
