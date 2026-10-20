import { createCrossboundV11 } from '../v11/model.js';
import { createV2Core } from './core.js';

// Frozen rules for a saved v1.1 round; promote only at the next round boundary.
export function createCrossboundV2(adapter) {
  const old = createCrossboundV11(adapter), modern = createV2Core(adapter);
  const api = { ...modern };
  for (const key of ['snapshot', 'listingQuote', 'publish', 'optimize', 'normalize', 'simulate', 'preview', 'commit', 'rollback', 'previous', 'clearStock', 'serialize', 'milestones']) {
    api[key] = (state, ...args) => (modern.valid(state) ? modern : old)[key](state, ...args);
  }
  api.valid = n => modern.valid(n) || old.valid(n);
  api.next = n => modern.valid(n) ? modern.next(n) : modern.upgrade(old.next(n));
  api.previous = n => n.history.find(r => r.round === n.round - 1)?.roundStart?.engineVersion === 'v11' ? old.previous(n) : modern.valid(n) ? modern.previous(n) : old.previous(n);
  api.migrate = n => modern.valid(n) ? n : modern.upgrade(old.valid(n) ? n : old.migrate(n));
  api.deserialize = raw => {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const n = parsed?.format === 'crossbound.v2' ? modern.deserialize(parsed) : old.deserialize(parsed);
      return n ? api.migrate(n) : null;
    } catch { return null; }
  };
  return api;
}
