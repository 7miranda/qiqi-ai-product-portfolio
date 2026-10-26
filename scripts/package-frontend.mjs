import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'dist/crossbound');
// Only the generated output owned by this script may be replaced.
if (path.dirname(target) !== path.join(root, 'dist')) throw Error('Invalid output path');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(path.join(root, 'public/previews/crossbound'), target, { recursive: true });
// REQ-051 3D world stays off in deployments unless explicitly enabled (off | on | split).
const world = process.env.CROSSBOUND_WORLD || 'off';
if (!['off', 'on', 'split'].includes(world)) throw Error('CROSSBOUND_WORLD must be off, on or split');
fs.writeFileSync(path.join(target, 'runtime-config.js'), `window.CROSSBOUND_API_BASE = "/crossbound/api";\nwindow.CROSSBOUND_WORLD = "${world}";\n`);
console.log('Frontend: dist/crossbound/ (serve at /crossbound/). No server secrets included.');
