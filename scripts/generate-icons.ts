import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateIcons() {
  const rootDir = process.cwd();
  const svgPath = path.join(rootDir, 'public', 'icons', 'icon.svg');
  const outDir = path.join(rootDir, 'public', 'icons');

  if (!fs.existsSync(svgPath)) {
    throw new Error(`SVG file not found at ${svgPath}`);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  console.log('Generating PWA icons from SVG...');

  // 1. 192x192 icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-192.png'));
  console.log('✓ Created icon-192.png');

  // 2. 512x512 icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-512.png'));
  console.log('✓ Created icon-512.png');

  // 3. 512x512 maskable icon (safe area padded ~10%)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#2563eb',
    })
    .png()
    .toFile(path.join(outDir, 'icon-maskable-512.png'));
  console.log('✓ Created icon-maskable-512.png');

  // 4. 180x180 apple touch icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(outDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png');

  // Also copy apple-touch-icon to public root for default iOS crawlers
  fs.copyFileSync(
    path.join(outDir, 'apple-touch-icon.png'),
    path.join(rootDir, 'public', 'apple-touch-icon.png')
  );

  console.log('All icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
