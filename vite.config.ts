import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const authProxy = {
  '/__/auth': {
    target: 'https://flychael-trackson.firebaseapp.com',
    changeOrigin: true,
    secure: true,
  },
  '/__/firebase': {
    target: 'https://flychael-trackson.firebaseapp.com',
    changeOrigin: true,
    secure: true,
  },
};

/** HTTPS certs are gitignored; only read them for local `vite` serve. */
export function shouldEnableDevHttps(
  command: string,
  keyExists: boolean,
  certExists: boolean,
): boolean {
  return command === 'serve' && keyExists && certExists;
}

export default defineConfig(({ command }) => {
  const keyPath = fileURLToPath(new URL('./certs/dev-key.pem', import.meta.url));
  const certPath = fileURLToPath(
    new URL('./certs/dev-cert.pem', import.meta.url),
  );
  const isDevServer = command === 'serve';
  const enableHttps = shouldEnableDevHttps(
    command,
    existsSync(keyPath),
    existsSync(certPath),
  );

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo.png'],
        manifest: {
          name: 'Flychael Trackson',
          short_name: 'Flychael Trackson',
          description: 'Paragliding flight tracking and equipment maintenance',
          theme_color: '#0b1220',
          background_color: '#0b1220',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/__/, /^\/api\//],
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: isDevServer
      ? {
          port: 5173,
          strictPort: true,
          ...(enableHttps
            ? {
                https: {
                  key: readFileSync(keyPath),
                  cert: readFileSync(certPath),
                },
              }
            : {}),
          proxy: authProxy,
        }
      : undefined,
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  };
});
