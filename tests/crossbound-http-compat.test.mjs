import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { fixture } from './crossbound-v11-fixture.mjs';
import { createCrossboundV2 } from '../public/previews/crossbound/v2/model.js';

const f = fixture(), engine = createCrossboundV2(f.adapter);
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function useCrypto(t, crypto) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: crypto });
  t.after(() => Object.defineProperty(globalThis, 'crypto', descriptor));
}
function useHttpCrypto(t) {
  useCrypto(t, { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
}

test('HTTP first visit creates a unique company without crypto.randomUUID', t => {
  useHttpCrypto(t);
  const first = engine.create(12345), second = engine.create(12345);
  assert.match(first.v2.identity, uuidV4);
  assert.match(second.v2.identity, uuidV4);
  assert.notEqual(first.v2.identity, second.v2.identity);
  assert.equal(first.runSeed, 12345);
  assert.equal(first.cash, f.adapter.old.create().cash);
});

test('HTTP legacy and v11 migration work, while an active round keeps its rules', t => {
  useHttpCrypto(t);
  for (const source of [f.adapter.old.create(), f.engine.create(23456)]) {
    const upgraded = engine.migrate(source);
    assert.equal(upgraded.engineVersion, 'v2');
    assert.match(upgraded.v2.identity, uuidV4);
    assert.equal(upgraded.cash, source.cash);
    assert.equal(JSON.stringify(upgraded.ledger), JSON.stringify(source.ledger));
  }
  const active = f.engine.commit(f.engine.create(23456), { id: 'singapore' });
  assert.equal(engine.migrate(active), active);
  assert.equal(active.engineVersion, 'v11');
});

test('loading an existing V2 save preserves identity, seed and all financial records', t => {
  const state = engine.commit(engine.create(34567), { id: 'singapore' });
  const saved = engine.serialize(state);
  useCrypto(t, { getRandomValues() { throw new Error('Loading a save must not draw randomness'); } });
  const restored = engine.deserialize(saved);
  assert.ok(restored);
  assert.equal(engine.serialize(restored), saved);
});

test('secure contexts retain the native randomUUID path', t => {
  const identity = '12345678-1234-4123-8123-123456789abc';
  let calls = 0;
  useCrypto(t, { randomUUID() { calls++; return identity; }, getRandomValues() { throw new Error('Unexpected fallback'); } });
  const state = engine.create(45678);
  assert.equal(state.v2.identity, identity);
  assert.equal(calls, 1);
});
