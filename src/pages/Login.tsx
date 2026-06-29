import { useState } from 'react';
import { useAuth } from '../lib/auth';

export function Login() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-full place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto w-full max-w-[15rem] rounded-3xl bg-white p-3 shadow-lg">
          <img
            src="/logo.png"
            alt="Flychael Trackson"
            className="h-auto w-full"
          />
        </div>
        <p className="mt-5 text-sm text-muted">
          Paragliding flight log and equipment maintenance.
        </p>

        <button
          onClick={() => void handleSignIn()}
          disabled={busy}
          className="btn-primary mt-8 w-full"
        >
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && (
          <p className="mt-4 text-sm text-danger">{error}</p>
        )}
      </div>
    </div>
  );
}
