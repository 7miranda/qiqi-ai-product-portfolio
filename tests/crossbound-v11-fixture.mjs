import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createCrossboundV11 } from '../public/previews/crossbound/v11/model.js';
import { createGrowth } from '../public/previews/crossbound/v11/growth.js';

// Exercise the real upstream products, suppliers and historical model, not duplicate test constants.
export function fixture() {
  const html = fs.readFileSync(new URL('../src/baseline/preview.html', import.meta.url), 'utf8');
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].find(m => m[1].includes('function Roe('))[1];
  const sf = ts.createSourceFile('upstream.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let scope;
  function walk(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === 'c1') scope = n.parent; ts.forEachChild(n, walk); }
  walk(sf);
  const names = new Set(['qdt','Lve','Ln','l1','ks','Zn','Tre','Z_','J_','rG','c1','Ove','OR','N5','sG','R5','Mre','Ks','nl','P5','A7','Lh','t0','FR','Ive','$dt','aG','g7','eS','Bve','K_','tG','nG','iG','wre','o1t','Ag','Uve','zR','Wdt','zve','Rl','gg','oG','u1','Hdt','Fve','lG','uG','Vve','Cre','Gve']);
  ['IG','jse','Xse','Tg','$se','UG','U5','Wse','r2','fN','LG','F5','OG','Uxe'].forEach(name => names.add(name));
  let source = '';
  for (const n of scope.statements) {
    if (ts.isFunctionDeclaration(n) && names.has(n.name?.text)) source += n.getText(sf) + '\n';
    if (ts.isVariableStatement(n)) for (const d of n.declarationList.declarations) if (names.has(d.name?.text)) source += 'var ' + d.getText(sf) + ';\n';
  }
  const legacy = { structuredClone, crypto }; vm.createContext(legacy); vm.runInContext(source, legacy);
  const adapter = { products: legacy.Zn, markets: legacy.ks, stocks: legacy.Tre, channels: legacy.Z_, fulfillment: legacy.J_, expansion: legacy.rG, supplier: legacy.sG, fit: legacy.Mre,
    old: { create: legacy.c1, snapshot: legacy.Ove, listingProduct: legacy.OR, report: legacy.$dt } };
  const growth = createGrowth({ tasks: legacy.U5, facilities: legacy.r2, createOps: legacy.IG, commitOps: legacy.jse,
    purchase: legacy.Xse, rank: legacy.Tg, snapshot: legacy.$se, baseGrowth: legacy.UG });
  return { engine: createCrossboundV11(adapter), legacy, adapter, growth };
}
export const BASIC = { rule: 'listing-v1', titleId: 'name', imageId: 'product', detailId: 'summary', mode: 'build' };
export const FULL = { ...BASIC, titleId: 'specs', imageId: 'annotated', detailId: 'complete' };
export function prepare(engine, { seed = 12345, market = 'singapore', product = 'tech', supplier = 'standard', quantity = 1200, price = 45, listing = FULL } = {}) {
  let n = engine.create(seed);
  for (const d of [{ id: market }, { id: product }, { id: 'pilot', quantity, price, supplierId: supplier }]) n = engine.commit(n, d);
  return engine.publish(n, listing);
}
export function finish(engine, n, channel = 'ads', budget = 3600, promotionChoice = { id: 'benefit' }, delivery = 'express') {
  for (const d of [{ id: channel, budget, promotionChoice }, { id: delivery }, { id: 'retain' }]) n = engine.commit(n, d);
  return n;
}
