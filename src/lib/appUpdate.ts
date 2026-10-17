export const VERSION_PATH = '/version.json';
export const UPDATE_QUERY_PARAM = '_up';
export const UPDATE_POLL_MS = 300_000;
export const UPDATE_RELOAD_TIMEOUT_MS = 2_000;

export type VersionPayload = {
  buildId?: unknown;
};

export type AppUpdateEnv = {
  serviceWorker?: {
    getRegistrations: () => Promise<ReadonlyArray<{ unregister: () => Promise<boolean> }>>;
  };
  caches?: {
    keys: () => Promise<string[]>;
    delete: (name: string) => Promise<boolean>;
  };
  location: {
    href: string;
    replace: (url: string) => void;
  };
  now?: number;
};

export function resolveBuildId(raw: string | undefined | null): string {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : 'dev';
}

export const CURRENT_BUILD_ID = resolveBuildId(
  typeof __APP_BUILD_ID__ === 'string' ? __APP_BUILD_ID__ : undefined,
);

export function parseBuildId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('buildId' in payload)) {
    return null;
  }
  const buildId = (payload as VersionPayload).buildId;
  return typeof buildId === 'string' && buildId.trim() ? buildId : null;
}

export function isNewerDeploy(currentBuildId: string, remoteBuildId: string | null): boolean {
  return Boolean(currentBuildId && remoteBuildId && remoteBuildId !== currentBuildId);
}

export function withUpdateCacheBust(href: string, now = Date.now()): string {
  const url = new URL(href);
  url.searchParams.set(UPDATE_QUERY_PARAM, String(now));
  return url.toString();
}

export function stripUpdateCacheBust(href: string): string | null {
  const url = new URL(href);
  if (!url.searchParams.has(UPDATE_QUERY_PARAM)) return null;
  url.searchParams.delete(UPDATE_QUERY_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function fetchRemoteBuildId(
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<string | null> {
  const response = await fetcher(`${VERSION_PATH}?t=${now}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
  if (!response.ok) return null;
  try {
    return parseBuildId(await response.json());
  } catch {
    return null;
  }
}

export async function clearAppCaches(env: Pick<AppUpdateEnv, 'serviceWorker' | 'caches'>): Promise<void> {
  try {
    if (env.serviceWorker) {
      const registrations = await env.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Reload anyway. A stuck worker is worse than a failed unregister.
  }
  try {
    const cacheStorage = env.caches;
    if (cacheStorage) {
      const keys = await cacheStorage.keys();
      await Promise.all(keys.map((key) => cacheStorage.delete(key)));
    }
  } catch {
    // Same as above: still hard-reload.
  }
}

export function browserAppUpdateEnv(): AppUpdateEnv {
  return {
    serviceWorker: 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
    caches: 'caches' in globalThis ? caches : undefined,
    location: {
      get href() {
        return window.location.href;
      },
      replace(url: string) {
        window.location.replace(url);
      },
    },
  };
}

export async function applyAppUpdate(env: AppUpdateEnv): Promise<void> {
  const next = withUpdateCacheBust(env.location.href, env.now ?? Date.now());
  await Promise.race([
    clearAppCaches(env),
    new Promise<void>((resolve) => {
      setTimeout(resolve, UPDATE_RELOAD_TIMEOUT_MS);
    }),
  ]);
  env.location.replace(next);
}
