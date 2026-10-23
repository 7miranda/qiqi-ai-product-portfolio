import test from 'node:test';
import assert from 'node:assert/strict';
import { apiPath } from '../public/previews/crossbound/v2/api.js';

test('API context preserves loopback preview and deployment subpath', () => {
  assert.equal(apiPath('records'), '/api/records');
  globalThis.CROSSBOUND_API_BASE='/crossbound/api';
  assert.equal(apiPath('community/adoptions'),'/crossbound/api/community/adoptions');
  for (const base of ['https://third-party.invalid/api','//third-party.invalid/api','/api?redirect=x']) {
    globalThis.CROSSBOUND_API_BASE=base;
    assert.throws(()=>apiPath('records'));
  }
  delete globalThis.CROSSBOUND_API_BASE;
});
