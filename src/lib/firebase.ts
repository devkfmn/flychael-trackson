import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

// The Cursor browser blocks third-party storage, so Firebase's auth helper on
// firebaseapp.com cannot read the redirect session. In dev, Vite proxies
// /__/auth onto this host and authDomain must match that host.
function resolveAuthDomain(): string | undefined {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return window.location.host;
  }
  return configuredAuthDomain;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: resolveAuthDomain(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error(
    'Missing Firebase configuration. Copy .env.example to .env and fill in the values.',
  );
}

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Offline-first cache so the PWA keeps working without a connection.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
