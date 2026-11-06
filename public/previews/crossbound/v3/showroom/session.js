import { PICKS_KEY } from '../world/logic.js';

export function roundKey(snapshot) {
  const c = snapshot?.company;
  return c ? `${c.runSeed}:${c.round}${c.attempt?':retry'+c.attempt:''}` : null;
}

// This is a draft selection, using the same per-round storage as the old W1.
// Only supplier confirmation commits the product stage through the engine.
export function createShowroomSession({ store, storage, onChange = () => {}, onNext = () => {} }) {
  const key = roundKey(store.snapshot());
  let saved;
  try { saved = JSON.parse(storage?.getItem(PICKS_KEY) || 'null'); } catch {}
  let product = saved?.key === key ? saved.product : null;
  let supplier = saved?.key === key ? saved.supplier : null;
  let busy = false, disposed = false;
  const available = id => (store.snapshot()?.options || []).find(p => p.id === id && !p.disabled);
  if (!available(product)) { product = null; supplier = null; }
  if (supplier && !(store.snapshot()?.quotes?.(product) || []).some(q => q.id === supplier)) supplier = null;
  const current = () => !disposed && roundKey(store.snapshot()) === key && store.snapshot()?.company?.stage === 1;
  function persist() {
    try { storage?.setItem(PICKS_KEY, JSON.stringify({ key, product, supplier })); } catch { /* engine state still works without storage */ }
  }
  function changed() { if (!disposed) onChange({ product, supplier, busy }); }
  function requireCurrent() { if (!current()) throw new Error('本轮选品状态已变化，请返回总部重新进入。'); }
  async function selectEngine(id) {
    store.snapshot()?.actions?.select(id);
    const result = await store.waitFor(s => s.choice?.id === id && roundKey(s) === key, 1500);
    if (!result || disposed) throw new Error('商品选择未能保存，请重试。');
  }
  async function choose(id) {
    requireCurrent();
    if (busy) return false;
    if (!available(id)) throw new Error('这件商品当前不可选，请选择其他商品。');
    busy = true; changed();
    try {
      await selectEngine(id); requireCurrent();
      if (product !== id) supplier = null;
      product = id; persist(); return true;
    } finally { busy = false; changed(); }
  }
  async function confirmSupplier(id, reviewedQuote) {
    requireCurrent();
    if (busy) return false;
    if (!available(product)) throw new Error('请先选定一件商品。');
    function validateQuote() {
      const live = (store.snapshot()?.quotes?.(product) || []).find(q => q.id === id);
      if (!live || (reviewedQuote && ['id', 'unitCost', 'moq', 'leadDays', 'benefit'].some(k => live[k] !== reviewedQuote[k]))) {
        throw new Error('供货报价已变化，请查看更新后的报价再确认。');
      }
    }
    validateQuote();
    busy = true; changed();
    try {
      await selectEngine(product); requireCurrent(); validateQuote();
      store.snapshot()?.actions?.commit();
      const after = await store.waitFor(s => s.company?.stage !== 1 && roundKey(s) === key, 2500);
      if (!after || after.company.stage !== 2 || disposed) throw new Error('当前无法确认选品，请检查商品与经营状态后重试。');
      // Stage two resets the supplier draft on entry. Reapply the player's choice after that reset.
      let applied = false;
      for (let attempt = 0; attempt < 5 && !disposed; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 0));
        store.snapshot()?.actions?.setSupplier(id);
        if (await store.waitFor(s => s.supplier === id && s.company?.stage === 2, 400)) { applied = true; break; }
      }
      supplier = applied ? id : null; persist();
      if (!disposed) onNext('w2', { supplierApplied: applied });
      return true;
    } finally { busy = false; changed(); }
  }
  return {
    get state() { return { product, supplier, busy }; },
    choose,
    confirmSupplier,
    cancel() {
      requireCurrent(); if (busy) return false;
      product = null; supplier = null; persist(); store.snapshot()?.actions?.select(null); changed(); return true;
    },
    dispose() { disposed = true; },
  };
}
