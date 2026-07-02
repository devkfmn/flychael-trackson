export function ConfigMissing() {
  return (
    <div className="grid min-h-full place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mx-auto w-full max-w-[12rem] rounded-3xl bg-white p-3 shadow-lg">
          <img src="/logo.png" alt="Flychael Trackson" className="h-auto w-full" />
        </div>
        <h1 className="mt-5 text-lg font-semibold">Firebase configuration missing</h1>
        <p className="mt-2 text-sm text-muted">
          Copy <code className="text-text">.env.example</code> to{' '}
          <code className="text-text">.env</code> and fill in your Firebase Web
          app credentials, then restart the dev server.
        </p>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Firebase console → Project settings → Your apps → Web app</li>
          <li>Copy the SDK config values into <code className="text-text">.env</code></li>
          <li>Stop and run <code className="text-text">npm run dev</code> again</li>
        </ol>
      </div>
    </div>
  );
}
