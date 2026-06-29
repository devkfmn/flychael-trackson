// Generates favicon, PWA and apple-touch icons from public/logo.png.
// Run with: npm run icons
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const src = path.join(pub, 'logo.png');
const white = { r: 255, g: 255, b: 255, alpha: 1 };

async function contain(size, out) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: white })
    .flatten({ background: white })
    .png()
    .toFile(path.join(pub, out));
  console.log('wrote', out, `(${size}x${size})`);
}

// Maskable icon: keep the logo inside the ~80% safe zone with white padding.
async function maskable(size, out, padRatio = 0.12) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const logo = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: white })
    .flatten({ background: white })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: white },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(pub, out));
  console.log('wrote', out, `(${size}x${size}, maskable)`);
}

await contain(48, 'favicon.png');
await contain(180, 'apple-touch-icon.png');
await contain(192, 'pwa-192x192.png');
await contain(512, 'pwa-512x512.png');
await maskable(512, 'maskable-512x512.png');

console.log('Done.');
