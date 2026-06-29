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
        <img src="/icon.svg" alt="" className="mx-auto h-16 w-16 rounded-2xl" />
        <h1 className="mt-5 text-2xl font-bold">Flychael Trackson</h1>
        <p className="mt-1 text-sm text-">
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
          <p className="mt-4 text-sm text-">{error}</p>
        )}
      </div>
    </div>
  );
}
