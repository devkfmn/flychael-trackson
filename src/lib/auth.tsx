import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

/** Embedded browsers (including Cursor's) block `window.open`. */
const POPUP_UNAVAILABLE = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let pendingRedirect: Promise<unknown> | null = null;

function completeRedirectSignIn() {
  // StrictMode runs effects twice; the redirect credential can only be read once.
  pendingRedirect ??= getRedirectResult(auth);
  return pendingRedirect;
}

function authErrorCode(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }
  return undefined;
}

function isEmbeddedBrowser(): boolean {
  return /Cursor\/|Electron\//.test(navigator.userAgent);
}

function authErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Sign-in failed.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let authReady = false;
    let redirectReady = false;

    const finish = () => {
      if (active && authReady && redirectReady) setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (next) => {
      if (!active) return;
      setUser(next);
      authReady = true;
      finish();
    });

    completeRedirectSignIn()
      .catch((error: unknown) => {
        if (active) setAuthError(authErrorMessage(error));
      })
      .finally(() => {
        redirectReady = true;
        finish();
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authError,
      signInWithGoogle: async () => {
        setAuthError(null);
        // Cursor's browser is Electron and blocks window.open. A blocked popup
        // still starts an auth attempt, so fall straight through to a redirect
        // instead of trying the popup first.
        if (isEmbeddedBrowser()) {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error) {
          if (!POPUP_UNAVAILABLE.has(authErrorCode(error) ?? '')) throw error;
          await signInWithRedirect(auth, googleProvider);
        }
      },
      logout: async () => {
        await signOut(auth);
      },
    }),
    [user, loading, authError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
