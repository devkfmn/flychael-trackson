import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ConfigMissing } from './ConfigMissing';

async function bootstrap() {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  const root = createRoot(rootEl);

  if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    root.render(
      <StrictMode>
        <ConfigMissing />
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
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap();
