import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import {
  SERVICES, CONTACT, DRAFT_KEY, serviceFor, normalizeDraft, draftErrors, formatBrief,
} from '../public/previews/crossbound/services/model.js';
import { createServicesUI } from '../public/previews/crossbound/services/ui.js';

const base = new URL('../public/previews/crossbound/', import.meta.url);
const read = relative => fs.readFileSync(new URL(relative, base), 'utf8');
const uiSource = read('services/ui.js');
const valid = { product: '桌灯', problem: '判断目标市场的售价能否覆盖成本。' };

function withStorage(storage, action) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try { return action(); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
}

function renderWorkspace(storedValue) {
  const { Workspace } = createServicesUI({
    React,
    Button: ({ children, ...props }) => React.createElement('button', props, children),
  });
  return withStorage({ getItem: () => storedValue }, () =>
    renderToStaticMarkup(React.createElement(Workspace)));
}

test('only three launch directions exist, with finite product and delivery boundaries', () => {
  assert.deepEqual(SERVICES.map(s => s.id).sort(), ['diagnosis', 'listing', 'training']);
  assert.match(serviceFor('diagnosis').scope, /一款商品.*一个国家.*一个主要问题/);
  assert.match(serviceFor('diagnosis').boundary, /认证.*税务.*店铺操作.*另行确认/);
  assert.match(serviceFor('listing').scope, /一款商品.*一个平台.*一种语言/);
  assert.match(serviceFor('listing').boundary, /不含.*拍摄.*账号上传.*审核通过/);
  assert.match(serviceFor('listing').outputs.join(' '), /一次.*修改/);
  assert.equal(SERVICES.some(s => /达人|广告|库存|县域/.test(s.id)), false);
});

test('training is one shared product for 5–10 people and two hours, without individual coaching', () => {
  const training = serviceFor('training');
  assert.match(training.scope, /5[–-]10 人.*同一款商品.*2 小时/);
  assert.match(training.intro, /5[–-]10.*2 小时/);
  assert.match(training.boundary, /企业组织学员与场地/);
  assert.match(training.boundary, /逐人辅导.*另行确认/);
  assert.match(formatBrief({ ...valid, serviceId: training.id }), /5[–-]10 人.*2 小时/);
});

test('unknown service identifiers fall back safely instead of becoming new products', () => {
  for (const id of [undefined, null, '', '__proto__', 'constructor', 'county', 3, {}, []]) {
    assert.equal(serviceFor(id).id, 'diagnosis');
    assert.equal(normalizeDraft({ serviceId: id }).serviceId, 'diagnosis');
  }
  for (const s of SERVICES) assert.equal(serviceFor(s.id), s);
});

test('null, primitive, array and malformed stored shapes normalize to an empty bounded draft', () => {
  const empty = normalizeDraft();
  for (const input of [undefined, null, false, 37, 'text', [], [valid]]) {
    assert.deepEqual(normalizeDraft(input), empty);
  }
  const draft = normalizeDraft({
    version: 999, company: {}, product: 23, target: null,
    problem: [], timing: true, notes: { toString: () => 'not text' }, ready: 'true',
  });
  assert.deepEqual(draft, empty);
  assert.equal(draft.version, 1);
  assert.deepEqual(draft.ready, [false, false, false]);
});

test('field size limits apply to restored drafts and cannot leak extra fields', () => {
  const limits = { company: 60, product: 120, target: 120, problem: 800, timing: 100, notes: 600 };
  const original = Object.fromEntries(Object.keys(limits).map(key => [key, '界'.repeat(1500)]));
  original.cash = 777777;
  original.ready = [true, false, true, true];
  const before = structuredClone(original);
  const draft = normalizeDraft(original);
  for (const [key, limit] of Object.entries(limits)) {
    assert.equal(draft[key].length, limit, key);
    assert.equal(draft[key], original[key].slice(0, limit));
  }
  assert.equal(Object.hasOwn(draft, 'cash'), false);
  assert.deepEqual(draft.ready, [true, false, true]);
  assert.deepEqual(original, before, 'normalization must not mutate the source save');
});

test('material readiness accepts only true booleans and always has three independent entries', () => {
  assert.deepEqual(normalizeDraft({ ready: [true, 1, 'true', true] }).ready, [true, false, false]);
  for (const ready of [undefined, null, false, 23, 'yes', {}]) {
    assert.deepEqual(normalizeDraft({ ready }).ready, [false, false, false]);
  }
  const first = normalizeDraft();
  first.ready[0] = true;
  assert.deepEqual(normalizeDraft().ready, [false, false, false]);
});

test('product and problem are required; whitespace, non-strings and malformed drafts do not pass', () => {
  for (const value of [undefined, null, {}, { product: '   ', problem: '\n\t' }, { product: 1, problem: true }]) {
    assert.deepEqual(Object.keys(draftErrors(value)).sort(), ['problem', 'product']);
  }
  assert.deepEqual(Object.keys(draftErrors({ product: '桌灯' })), ['problem']);
  assert.deepEqual(Object.keys(draftErrors({ problem: '准备上架' })), ['product']);
  assert.deepEqual(draftErrors({ product: ' 桌灯 ', problem: ' 准备上架 ' }), {});
  assert.deepEqual(draftErrors({ ...valid, company: '', target: '', timing: '', notes: '' }), {});
});

test('checked materials mean already available, not uploaded, sent or verified', () => {
  for (const s of SERVICES) {
    const brief = formatBrief({ ...valid, serviceId: s.id, ready: [true, false, true] });
    assert.ok(brief.includes(`已备有：${s.materials[0]}`));
    assert.ok(brief.includes(`待准备：${s.materials[1]}`));
    assert.ok(brief.includes(`已备有：${s.materials[2]}`));
    assert.doesNotMatch(brief, /已上传|上传成功|已发送|已核验|已下单/);
  }
  const html = renderWorkspace(JSON.stringify({ ...valid, ready: [true, false, false] }));
  assert.doesNotMatch(html, /type="file"/);
  assert.match(html, /不上传文件/);
  assert.equal((html.match(/type="checkbox"[^>]*checked=""/g) || []).length, 1);
});

test('injected markup remains literal text in the TXT brief and is escaped by the real React renderer', () => {
  const injection = '<img src=x onerror="globalThis.secret=1"><script>alert(1)</script>';
  const draft = { ...valid, company: injection, product: injection, problem: injection, notes: injection };
  const brief = formatBrief(draft);
  assert.ok(brief.includes(injection), 'a text export preserves the user’s literal words');
  const html = renderWorkspace(JSON.stringify(draft));
  assert.doesNotMatch(html, /<img\b|<script\b/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(uiSource, /dangerouslySetInnerHTML|\.innerHTML\s*=/);
});

test('the export allowlist excludes supplied game state, contacts and private save metadata', () => {
  const privateMarkers = ['CASH_PRIVATE_931', 'PHONE_PRIVATE_842', 'TOKEN_PRIVATE_753', 'HISTORY_PRIVATE_664'];
  const draft = {
    ...valid, cash: privateMarkers[0], profit: 999999, round: 99,
    phone: privateMarkers[1], email: 'private-contact@example.invalid',
    contact: { mobile: privateMarkers[1] }, companyState: { cash: privateMarkers[0] },
    history: [privateMarkers[3]], operations: { token: privateMarkers[2] },
    privateArchive: privateMarkers[3], accessToken: privateMarkers[2],
  };
  const normalized = normalizeDraft(draft);
  assert.deepEqual(Object.keys(normalized).sort(), [
    'version', 'serviceId', 'company', 'product', 'target', 'problem', 'timing', 'notes', 'ready',
  ].sort());
  const brief = formatBrief(draft);
  for (const marker of [...privateMarkers, draft.email]) assert.equal(brief.includes(marker), false, marker);
  assert.doesNotMatch(brief, /999999/);
  assert.notEqual(DRAFT_KEY, 'crossbound-company-v1');
  assert.notEqual(DRAFT_KEY, 'crossbound-operations-v1');
});

test('briefs stay local and conditional, even with complete materials and valid input', () => {
  const brief = formatBrief({ ...valid, ready: [true, true, true] });
  assert.match(brief, /本机草稿.*尚未发送/);
  assert.match(brief, /非正式报价/);
  assert.match(brief, /资料齐备.*范围.*伙伴排期确认后起算/);
  assert.match(brief, /不代表下单|不代表.*已安排/);
  assert.doesNotMatch(brief, /已经接单|订单提交成功|支付成功/);
});

test('invalid JSON or unavailable storage does not prevent opening the local preparation view', () => {
  for (const raw of ['{invalid', 'null', '[]', 'false', '12', '"saved text"']) {
    const html = renderWorkspace(raw);
    assert.match(html, /name="product"/);
    assert.match(html, /name="problem"/);
  }
  const { Workspace } = createServicesUI({ React, Button: 'button' });
  const html = withStorage({ getItem() { throw new Error('Storage blocked'); } }, () =>
    renderToStaticMarkup(React.createElement(Workspace)));
  assert.match(html, /name="product"/);
});

test('the example contact is never a live handoff and the workspace has no sending endpoint', () => {
  assert.equal(CONTACT.placeholder, true);
  assert.match(CONTACT.address, /@[^@]+\.example$/);
  const html = renderWorkspace(JSON.stringify(valid));
  assert.doesNotMatch(html, /href="mailto:|action="https?:|formaction=|type="file"/);
  assert.doesNotMatch(formatBrief(valid), /service@crossbound\.example/);
  assert.doesNotMatch(uiSource, /\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\s*\(|mailto:/);
  assert.match(uiSource, /e\.preventDefault\(\)/);
});

function integratedPage(file) {
  const html = read(file);
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).find(value => value.includes('ServicesUI.Workspace'));
  assert.ok(script, `${file} contains the generated application module`);
  const source = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(source.parseDiagnostics.length, 0);
  return { html, script, source };
}

for (const file of ['index.html', 'preview.html']) {
  test(`${file}: exactly one services main-view branch shares the existing campaign dialog`, () => {
    const { script, source } = integratedPage(file);
    let branches = 0;
    function visit(node) {
      if (ts.isConditionalExpression(node) && ts.isBinaryExpression(node.condition)) {
        const { left, right } = node.condition;
        if (left.getText(source) === 'l' && ts.isStringLiteral(right) && right.text === 'services'
          && node.whenTrue.getText(source).includes('ServicesUI.Workspace')) branches += 1;
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.equal(branches, 1);
    assert.equal((script.match(/\bServicesUI\.Workspace\b/g) || []).length, 1);
    assert.equal((script.match(/\bcreateServicesUI\(\{/g) || []).length, 1);
  });

  test(`${file}: leaving services restores the report without executing settlement side effects`, () => {
    const { source } = integratedPage(file);
    let close;
    function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'L7') close = node;
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(close, 'the existing dialog close action remains present');
    const functionCode = `(${close.getText(source)})()`;
    const views = [], focus = [];
    vm.runInNewContext(functionCode, {
      l: 'services', serviceReturn: 'complete', u: value => views.push(value),
      requestAnimationFrame: action => action(),
      xs: { current: { querySelector: selector => selector === '[data-service-review-trigger]'
        ? { focus: () => focus.push('report-service-trigger') } : null } },
      v11Flow: new Proxy({}, { get() { throw new Error('service return must not settle or advance the game'); } }),
    });
    assert.deepEqual(views, ['complete']);
    assert.deepEqual(focus, ['report-service-trigger']);

    const originalViews = [], events = [];
    vm.runInNewContext(functionCode, {
      l: 'reward', fn: false,
      v11Flow: { active: true, finish: () => events.push('finish') },
      tn: value => events.push(value), u: value => originalViews.push(value),
    });
    assert.deepEqual(originalViews, ['complete'], 'the original settlement close still returns to its report');
    assert.deepEqual(events, ['finish', null]);
  });

  test(`${file}: UI, stylesheet and nested model imports use current content hashes`, () => {
    const { html, script } = integratedPage(file);
    const modelHash = createHash('sha256').update(read('services/model.js')).digest('hex').slice(0, 10);
    const serviceHash = createHash('sha256')
      .update(['model.js', 'ui.js', 'styles.css'].map(f => read(`services/${f}`)).join(''))
      .digest('hex').slice(0, 10);
    assert.ok(uiSource.includes(`from './model.js?v=${modelHash}'`), 'a cached UI cannot retain a stale nested model');
    assert.ok(script.includes(`./services/ui.js?v=${serviceHash}`));
    assert.ok(html.includes(`./services/styles.css?v=${serviceHash}`));
  });
}
