import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppUpdateBanner, AppUpdateProvider } from './components/AppUpdate';
import { ConfigMissing } from './ConfigMissing';

function Root({ children }: { children: ReactNode }) {
  return (
    <AppUpdateProvider>
      <div className="flex min-h-full flex-col">
        <AppUpdateBanner />
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </AppUpdateProvider>
  );
}

async function bootstrap() {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  const root = createRoot(rootEl);

  if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    root.render(
      <StrictMode>
        <Root>
          <ConfigMissing />
        </Root>
      </StrictMode>,
    );
    return;
  }

  const [{ BrowserRouter }, { App }, { AuthProvider }] = await Promise.all([
    import('react-router-dom'),
    import('./App'),
    import('./lib/auth'),
  ]);

  root.render(
    <StrictMode>
      <Root>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </Root>
    </StrictMode>,
  );
}

void bootstrap();
