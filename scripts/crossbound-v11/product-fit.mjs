import fs from 'node:fs';
import { fixture } from '../../tests/crossbound-v11-fixture.mjs';
import { seededUnit } from '../../public/previews/crossbound/v11/model.js';
const { adapter } = fixture();
// Editorial city/category baselines, with a reproducible product-specific ±8%
// differentiation. Retains the three cities already authored in the catalog.
const baselines = {
  berlin: [1.12, 1.10, .98, 1.06, 1.08, 1.08], paris: [.98, 1.04, 1.16, 1.10, .95, 1.02],
  tokyo: [1.15, 1.12, 1.10, .90, .96, 1.18], sydney: [1.02, 1, 1.08, 1.08, 1.20, 1],
  toronto: [1.08, 1.08, 1.02, 1.12, 1.12, 1.04], dubai: [1.10, 1.02, 1.16, 1.10, .92, 1.14],
  'mexico-city': [1.02, 1.14, 1.10, 1.04, 1.02, .94], 'sao-paulo': [1.04, 1.10, 1.08, 1.02, 1.10, .98],
  amsterdam: [1.08, 1.14, 1.04, 1.08, 1.16, 1.10],
};
const categories = ['electronics', 'home', 'lifestyle', 'furniture', 'outdoor', 'future'];
const matrix = Object.fromEntries(adapter.products.map(p => [p.id, Object.fromEntries(adapter.markets.map(m => {
  const authored = p.fit?.[m.id];
  const value = authored ?? baselines[m.id][categories.indexOf(p.category)] * (.92 + seededUnit(2026, 1, `${p.id}:${m.id}`) * .16);
  return [m.id, Math.round(value * 1000) / 1000];
}))]));
if (Object.values(matrix).some(row => Object.values(row).some(v => !Number.isFinite(v)))) throw new Error('Incomplete fit matrix');
fs.writeFileSync('public/previews/crossbound/v2/product-fit.json', JSON.stringify({ basis: '游戏标定数据，非实测市场销量', version: 1, matrix }, null, 2));
fs.writeFileSync('public/previews/crossbound/v2/product-fit.js', `// Game calibration; source: product-fit.json. All ${adapter.products.length} products × 12 cities.\nexport const productFit = ${JSON.stringify(matrix)};\n`);
console.log(`${adapter.products.length} products × ${adapter.markets.length} cities`);
