import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  applyAppUpdate,
  browserAppUpdateEnv,
  CURRENT_BUILD_ID,
  fetchRemoteBuildId,
  isNewerDeploy,
  stripUpdateCacheBust,
  UPDATE_POLL_MS,
} from '../lib/appUpdate';

type AppUpdateContextValue = {
  updateAvailable: boolean;
  updating: boolean;
  applyUpdate: () => Promise<void>;
};

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const applying = useRef(false);

  useEffect(() => {
    const stripped = stripUpdateCacheBust(window.location.href);
    if (stripped) window.history.replaceState(null, '', stripped);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const remote = await fetchRemoteBuildId();
        if (!cancelled && isNewerDeploy(CURRENT_BUILD_ID, remote)) {
          setUpdateAvailable(true);
        }
      } catch {
        // Stay hidden when the version file is unreachable.
      }
    };

    void check();
    const timer = window.setInterval(() => {
      void check();
    }, UPDATE_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  const applyUpdate = useCallback(async () => {
    if (applying.current) return;
    applying.current = true;
    setUpdating(true);
    try {
      await applyAppUpdate(browserAppUpdateEnv());
    } catch (error) {
      console.error('App update failed', error);
      applying.current = false;
      setUpdating(false);
    }
  }, []);

  const value = useMemo<AppUpdateContextValue>(
    () => ({ updateAvailable, updating, applyUpdate }),
    [applyUpdate, updateAvailable, updating],
  );

  return (
    <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>
  );
}

export function useAppUpdate() {
  const value = useContext(AppUpdateContext);
  if (!value) {
    throw new Error('useAppUpdate must be used within AppUpdateProvider');
  }
  return value;
}

export function AppUpdateBanner() {
  const { updateAvailable, updating, applyUpdate } = useAppUpdate();
  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="shrink-0 border-b border-brand/40 bg-brand/15 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">A new version is ready.</p>
        <button
          type="button"
          className="btn-primary"
          disabled={updating}
          onClick={() => void applyUpdate()}
        >
          {updating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Updating…
            </>
          ) : (
            'Update App'
          )}
        </button>
      </div>
    </div>
  );
}
