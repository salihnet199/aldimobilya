/**
 * remove-logo-bg.mjs
 * Removes pure black (and near-black) background from logo image.
 * Uses Node.js built-in + jimp (zero-dependency image processing).
 * Run: node scripts/remove-logo-bg.mjs
 */

import { createCanvas, loadImage } from 'canvas';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT  = resolve(__dirname, '../apps/web/public/logo-original.png');
const OUTPUT = resolve(__dirname, '../apps/web/public/logo.png');

async function removeDarkBackground(input, output, threshold = 60) {
  const img = await loadImage(input);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // If the pixel is dark (near-black), make it transparent
    if (r < threshold && g < threshold && b < threshold) {
      data[i + 3] = 0; // alpha = 0 (fully transparent)
    } else if (r < threshold * 1.5 && g < threshold * 1.5 && b < threshold * 1.5) {
      // Semi-dark pixels: make partially transparent for smooth edges
      const darkness = 1 - (Math.max(r, g, b) / (threshold * 1.5));
      data[i + 3] = Math.round(255 * (1 - darkness));
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(output, buffer);
  console.log(`✅ Done! Transparent logo saved to: ${output}`);
  console.log(`   Original size: ${img.width}x${img.height}px`);
}

removeDarkBackground(INPUT, OUTPUT)
  .then(() => {
    console.log('\n🚀 Now deploy with: npx vercel deploy --prod --yes');
  })
  .catch((err) => {
    console.error('❌ Error:', err.message);
    console.error('Make sure logo-original.png is in apps/web/public/');
  });
