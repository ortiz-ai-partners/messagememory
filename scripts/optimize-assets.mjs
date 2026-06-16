// 画像最適化スクリプト: node scripts/optimize-assets.mjs
// - icon.png を 1024x1024 にリサイズ（App Store要件）
// - splash.png を高圧縮PNGに

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

async function optimize(inputPath, outputPath, opts = {}) {
  const before = readFileSync(inputPath).length;
  const meta = await sharp(inputPath).metadata();

  let pipeline = sharp(inputPath);
  if (opts.resize) {
    pipeline = pipeline.resize(opts.resize.width, opts.resize.height, {
      fit: 'cover',
      kernel: 'lanczos3',
    });
  }
  const buf = await pipeline
    .png({ compressionLevel: 9, quality: opts.quality ?? 90, palette: opts.palette ?? false })
    .toBuffer();

  writeFileSync(outputPath, buf);
  const after = buf.length;
  const newMeta = await sharp(outputPath).metadata();

  console.log(`${inputPath}`);
  console.log(`  ${meta.width}x${meta.height} ${(before / 1024).toFixed(0)}KB`);
  console.log(`  → ${newMeta.width}x${newMeta.height} ${(after / 1024).toFixed(0)}KB  (${((1 - after / before) * 100).toFixed(0)}% reduction)`);
}

await optimize('assets/images/icon.png', 'assets/images/icon.png', {
  resize: { width: 1024, height: 1024 },
  palette: true,
  quality: 92,
});

// 写真系はパレット化で大幅削減（pngquant相当）
await optimize('assets/images/splash.png', 'assets/images/splash.png', {
  palette: true,
  quality: 80,
});

await optimize('assets/images/marketing/hero.png', 'assets/images/marketing/hero.png', {
  palette: true,
  quality: 80,
});

console.log('\n✓ Done');
