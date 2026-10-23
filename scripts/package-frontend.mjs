import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'dist/crossbound');
// Only the generated output owned by this script may be replaced.
if (path.dirname(target) !== path.join(root, 'dist')) throw Error('Invalid output path');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(path.join(root, 'public/previews/crossbound'), target, { recursive: true });
fs.writeFileSync(path.join(target, 'runtime-config.js'), 'window.CROSSBOUND_API_BASE = "/crossbound/api";\n');
console.log('Frontend: dist/crossbound/ (serve at /crossbound/). No server secrets included.');
