import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BADGE_MARKETS, BADGE_TIERS } from '../../public/previews/crossbound/v11/badges.js';

const root = fileURLToPath(new URL('../../public/previews/crossbound/assets/badges/countries-v1/', import.meta.url));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
if (manifest.countries.length !== BADGE_MARKETS.length ||
    manifest.countries.some(c => !BADGE_MARKETS.includes(c.marketId))) throw new Error('Badge catalog differs from the game market list.');
let sourceBytes = 0, webBytes = 0, count = 0;
for (const country of manifest.countries) {
  country.webFiles = {};
  for (const tier of BADGE_TIERS) {
    const input = path.join(root, country.files[tier]);
    const metadata = await sharp(input).metadata();
    if (!metadata.hasAlpha || metadata.width < 512 || metadata.height < 512) throw new Error(`Invalid transparent master: ${input}`);
    const relative = `web/${tier}/${country.marketId}.webp`, output = path.join(root, relative);
    await fs.mkdir(path.dirname(output), { recursive: true });
    // Delivery encoding only: preserve the generated design and alpha; keep PNG masters.
    await sharp(input).resize({ width: 384, height: 384, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(output);
    sourceBytes += (await fs.stat(input)).size;
    webBytes += (await fs.stat(output)).size;
    country.webFiles[tier] = relative;
    count++;
  }
}
await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`${count} badge masters checked; WebP delivery ${Math.round(webBytes / 1024)} KB versus ${Math.round(sourceBytes / 1024)} KB of PNG masters.`);
