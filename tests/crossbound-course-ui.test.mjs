import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { CHAPTERS, WEEKS } from '../public/previews/crossbound/courses/model.js';
import { createCoursesUI } from '../public/previews/crossbound/courses/ui.js';
import { createServicesUI } from '../public/previews/crossbound/services/ui.js';

const base = new URL('../public/previews/crossbound/', import.meta.url);
const read = name => fs.readFileSync(new URL(name, base), 'utf8');
const Button = ({ children, ...props }) => React.createElement('button', props, children);
const Courses = createCoursesUI({ React, Button });
const render = view => renderToStaticMarkup(React.createElement(Courses.Workspace, { initialView: view }));

test('the website exposes all 16 chapters and all 64 section explanations, examples and tasks', () => {
  const html = render('syllabus');
  assert.equal((html.match(/class="course-chapter"/g) || []).length, 16);
  assert.equal((html.match(/class="course-section-number"/g) || []).length, 64);
  for (const chapter of CHAPTERS) {
    for (const text of [chapter.title, chapter.teach, chapter.example, chapter.practice, chapter.check, chapter.takeaway,
      ...chapter.sections.flat()]) assert.ok(html.includes(text), `missing chapter ${chapter.number}: ${text}`);
  }
  assert.match(html, /游戏过关和成绩不直接代表课程掌握程度/);
});

test('the camp view describes eight weeks, offline work, feedback and separate tutoring hours', () => {
  const html = render('camp');
  for (const week of WEEKS) assert.ok(html.includes(week.assignment));
  assert.equal((html.match(/scope="row"/g) || []).length, 8);
  assert.match(html, /均在线下开展/);
  assert.match(html, /第1–7周.*下次课前给书面反馈.*第8周.*现场给点评单/);
  assert.match(html, /24小时基础课 ＋ 3小时做法练习 ＋ 2小时企业辅导 ＝ 29小时/);
  assert.match(html, /不占课堂.*最多3小时.*最多32小时/);
  assert.match(html, /建议方案/);
});

test('the preparation view does not imply booking or upload a real enterprise file', () => {
  const html = render('prepare');
  assert.match(html, /开班日期、费用与正式联系方式待确认/);
  assert.match(html, /不提交报名.*不代表已安排课程/);
  assert.doesNotMatch(html, /<form\b|type="file"|mailto:|支付|报名成功/);
  assert.doesNotMatch(read('courses/ui.js'), /localStorage|\bfetch\s*\(|XMLHttpRequest|sendBeacon|dangerouslySetInnerHTML/);
});

test('the new course entry coexists with enterprise services in the homepage navigation', () => {
  const { Nav } = createServicesUI({ React, Button });
  const html = renderToStaticMarkup(React.createElement(Nav));
  for (const id of ['home-intelligence', 'home-start', 'home-courses', 'home-services', 'home-cases']) {
    assert.ok(html.includes(`href="#${id}"`));
  }
  assert.equal((html.match(/<a\b/g) || []).length, 5);
});

for (const file of ['index.html', 'preview.html']) {
  test(`${file}: course view closes to its caller without touching the simulation`, () => {
    const html = read(file);
    const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
      .map(match => match[1]).find(text => text.includes('CoursesUI.Workspace'));
    assert.ok(script);
    const source = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(source.parseDiagnostics.length, 0);
    let close;
    function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'L7') close = node;
      ts.forEachChild(node, visit);
    }
    visit(source);
    const views = [], focused = [];
    vm.runInNewContext(`(${close.getText(source)})()`, {
      l: 'courses', courseReturn: null, u: value => views.push(value),
      courseTrigger: { current: { focus: () => focused.push(true) } },
      requestAnimationFrame: action => action(),
      v11Flow: new Proxy({}, { get() { throw new Error('reading courses must not advance or settle the game'); } }),
    });
    assert.deepEqual(views, [null]);
    assert.deepEqual(focused, [true]);
    assert.equal((script.match(/CoursesUI\.Workspace/g) || []).length, 1);
  });

  test(`${file}: course UI, stylesheet and data use content cache versions`, () => {
    const modelHash = createHash('sha256').update(read('courses/model.js')).digest('hex').slice(0, 10);
    assert.ok(read('courses/ui.js').includes(`./model.js?v=${modelHash}`));
    const version = createHash('sha256').update(['model.js', 'ui.js', 'styles.css'].map(f => read(`courses/${f}`)).join('')).digest('hex').slice(0, 10);
    assert.ok(read(file).includes(`./courses/ui.js?v=${version}`));
    assert.ok(read(file).includes(`./courses/styles.css?v=${version}`));
  });
}
