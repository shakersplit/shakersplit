/**
 * One-shot icon generator for ShakerSplit. Reads public/icons/logo.svg and produces every
 * PNG / ICO size browsers, iOS, and PWA installers expect.
 *
 * Run: `node scripts/generate-icons.mjs`
 *
 * Outputs (all in public/):
 *   favicon.ico                                 (multi-res 16/32/48 — for legacy browsers)
 *   icons/icon-192x192.png                      (PWA Android)
 *   icons/icon-512x512.png                      (PWA Android, splash screens)
 *   icons/icon-maskable-512.png                 (PWA adaptive icons — same art, safer for crop)
 *   icons/apple-touch-icon.png                  (iOS home screen, 180x180)
 *   icons/og-image.png                          (1200x630 OG/Twitter card)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const logoSvg = readFileSync(resolve(root, 'public/icons/logo.svg'));
const markSvg = readFileSync(resolve(root, 'public/icons/logo-mark.svg'));

const targets = [
  { out: 'public/icons/icon-192x192.png', size: 192, src: logoSvg },
  { out: 'public/icons/icon-512x512.png', size: 512, src: logoSvg },
  { out: 'public/icons/icon-maskable-512.png', size: 512, src: logoSvg },
  { out: 'public/icons/apple-touch-icon.png', size: 180, src: logoSvg },
];

mkdirSync(resolve(root, 'public/icons'), { recursive: true });

for (const t of targets) {
  await sharp(t.src)
    .resize(t.size, t.size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(resolve(root, t.out));
  console.log(`✓ ${t.out}`);
}

// Favicon ICO — multi-res, sourced from PNGs at 16/32/48
const icoSizes = [16, 32, 48];
const icoBuffers = await Promise.all(
  icoSizes.map((s) =>
    sharp(logoSvg)
      .resize(s, s, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toBuffer()
  )
);
const ico = await pngToIco(icoBuffers);
writeFileSync(resolve(root, 'public/favicon.ico'), ico);
console.log(`✓ public/favicon.ico (${icoSizes.join('/')})`);

// OG image — 1200x630 with the wordmark on a centered card. Generate by compositing the mark
// onto a dark canvas with the brand title text rendered to SVG inline.
const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#66BB6A"/><stop offset="100%" stop-color="#388E3C"/></linearGradient>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFB74D"/><stop offset="100%" stop-color="#F57C00"/></linearGradient>
    <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#BA68C8"/><stop offset="100%" stop-color="#7B1FA2"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(120, 175) scale(0.55)">
    <rect x="120" y="112" width="304" height="80" rx="40" fill="url(#g1)"/>
    <rect x="88" y="216" width="336" height="80" rx="40" fill="url(#g2)"/>
    <rect x="88" y="320" width="304" height="80" rx="40" fill="url(#g3)"/>
  </g>
  <text x="430" y="290" font-family="Inter, -apple-system, sans-serif" font-size="84" font-weight="800" fill="#F8FAFC" letter-spacing="-2">Shaker<tspan fill="#4CAF50">Split</tspan></text>
  <text x="430" y="350" font-family="Inter, -apple-system, sans-serif" font-size="32" font-weight="500" fill="#94A3B8">Track food, workouts &amp; nights out.</text>
  <text x="430" y="390" font-family="Inter, -apple-system, sans-serif" font-size="24" font-weight="400" fill="#64748B">shakersplit.divyanshjha.in · free forever</text>
</svg>
`;
await sharp(Buffer.from(ogSvg)).png().toFile(resolve(root, 'public/icons/og-image.png'));
console.log(`✓ public/icons/og-image.png (1200x630)`);

// Suppress unused mark warning — kept for future use (header SVG → PNG).
void markSvg;

console.log('\nDone. All icons regenerated.');
