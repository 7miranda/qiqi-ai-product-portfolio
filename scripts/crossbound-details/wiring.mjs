// 77's release layer (7miranda/qiqi-ai-product-portfolio #14–#22): foundation courses, enterprise services, studio
// product previews and the shared detail stylesheets. Ported from her scripts/crossbound-details/build.mjs so it runs
// on top of our own build instead of a fixed git baseline. Patches are unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// operations.css (77's restyle of the step scenes and 3D HUD) is not loaded: the design handoff (v3/world/handoff.css)
// owns those screens, and stacking both broke their layout. Scene rules were also removed from the other sheets.
export const DETAIL_STYLES = ['styles', 'home', 'workspaces', 'atmosphere', 'material-depth', 'depth-home'];

function once(source, from, to) {
  if (source.split(from).length !== 2) throw new Error(`details: expected one anchor: ${from.slice(0, 80)}`);
  return source.replace(from, to);
}
function patchFunction(script, name, change) {
  const sf = ts.createSourceFile('source.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let found;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (!found) throw new Error(`details: missing function ${name}`);
  return script.slice(0, found.getStart(sf)) + change(found.getText(sf)) + script.slice(found.end);
}
function patchElement(script, className, replacement) {
  const sf = ts.createSourceFile('element.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const matches = [];
  function visit(node) {
    if (ts.isCallExpression(node) && node.arguments.some(arg => ts.isObjectLiteralExpression(arg) && arg.properties.some(prop =>
      ts.isPropertyAssignment(prop) && prop.name.getText(sf) === 'className' && ts.isStringLiteral(prop.initializer) && prop.initializer.text === className))) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (matches.length !== 1) throw new Error(`details: expected one element ${className}`);
  const node = matches[0];
  return script.slice(0, node.getStart(sf)) + replacement + script.slice(node.end);
}

// Versions for the services / courses modules; their ui.js import their model with a matching version.
export function prepareModules(root, folder) {
  const read = file => fs.readFileSync(path.join(root, folder, file), 'utf8').replace(/\r\n/g, '\n');
  const hash = files => createHash('sha256').update(files.map(read).join('')).digest('hex').slice(0, 10);
  const pin = (dir, version) => {
    const ui = path.join(root, folder, dir, 'ui.js');
    const source = fs.readFileSync(ui, 'utf8');
    const next = source.replace(/\.\/model\.js(?:\?v=[^"']+)?/, `./model.js?v=${version}`);
    if (next !== source) fs.writeFileSync(ui, next);
  };
  pin('services', hash(['services/model.js']));
  pin('courses', hash(['courses/model.js']));
  return {
    services: hash(['services/model.js', 'services/ui.js', 'services/styles.css']),
    courses: hash(['courses/model.js', 'courses/ui.js', 'courses/styles.css']),
    details: hash(DETAIL_STYLES.map(name => `details/${name}.css`)),
  };
}

// Script patches: courses and services views, the studio product preview hook, the landing-page entries.
export function wireScript(script, versions) {
  script = patchFunction(script, 'Roe', source => {
    source = once(source, 'function Roe(){', 'function Roe(){const [serviceReturn,setServiceReturn]=li.useState(null);const serviceTrigger=li.useRef(null);function openServices(){setServiceReturn(l);serviceTrigger.current=document.activeElement;u("services")}const [courseReturn,setCourseReturn]=li.useState(null);const [courseView,setCourseView]=li.useState("syllabus");const courseTrigger=li.useRef(null);function openCourses(view="syllabus"){setCourseReturn(l);setCourseView(view);courseTrigger.current=document.activeElement;u("courses")}');
    const actions = '(0,re.jsx)(V11UI.SettlementActions,{company:t,ops:r,flow:v11Flow,onContinue:rs,onSkip:v11NextRound,onAdjust:()=>Ba(2),onHQ:()=>u("progress")})';
    source = once(source, actions, `(0,re.jsxs)(re.Fragment,{children:[${actions},(0,re.jsx)(ServicesUI.Review,{onOpen:openServices})]})`);
    source = once(source, 'passport:', 'courses:"工厂出海基础课程",services:"企业经营服务 · 需求准备",passport:');
    source = once(source, 'onSupply:pu,onMarkets:z5})', 'onSupply:pu,onMarkets:z5,onServices:openServices,onCourses:openCourses})');
    source = once(source, 'let kd=l===', 'let kd=l==="courses"?courseReturn:l==="services"?serviceReturn:l===');
    source = once(source, 'D7=kd===', 'D7=kd==="complete"?"本轮战报":kd===');
    source = once(source, 'function L7(){', 'function L7(){if(l==="courses"){u(courseReturn);requestAnimationFrame(()=>courseTrigger.current?.focus());return}if(l==="services"){u(serviceReturn);requestAnimationFrame(()=>{if(serviceReturn==="complete")xs.current?.querySelector("[data-service-review-trigger]")?.focus();else serviceTrigger.current?.focus()});return}');
    return once(source, 'l==="decision"?(0,re.jsxs)(re.Fragment,{children:[', 'l==="courses"?(0,re.jsx)(CoursesUI.Workspace,{initialView:courseView}):l==="services"?(0,re.jsx)(ServicesUI.Workspace,{context:serviceReturn==="complete"?[ks.find(x=>x.id===t.marketId)?.countryLabel,Zn.find(x=>x.id===t.productId)?.name].filter(Boolean).join(" / "):null}):l==="decision"?(0,re.jsxs)(re.Fragment,{children:[');
  });
  script = once(script, 'function s1t(', 'Object.defineProperty(window,"CrossboundProductPreview",{configurable:true,value:s1t});\nfunction s1t(');
  // Studio photos show the sellable patio set, without the interactive concept sunshade.
  script = patchFunction(script, 'dxe', source => once(source, 'active:!1,onTouch:', 'studio:!0,active:!1,onTouch:'));
  script = patchFunction(script, 'cxe', source => once(once(source, 'onTouch:r,subject:s}', 'onTouch:r,subject:s,studio}'), 'Xpt,{product:n,active:i,reduced:e}', 'Xpt,{product:n,active:i,reduced:e,studio}'));
  script = patchFunction(script, 'Xpt', source => once(once(source, 'active:e,reduced:t}', 'active:e,reduced:t,studio}'), '[-1,1].map(l=>(0,X.jsxs)(Cd,{position:[l*1.68,.58,-.65]', '(studio?[]:[-1,1]).map(l=>(0,X.jsxs)(Cd,{position:[l*1.68,.58,-.65]'));
  script = patchFunction(script, 'Rse', source => {
    source = once(source, 'onSupply:o,onMarkets:a})', 'onSupply:o,onMarkets:a,onServices:serviceOpen,onCourses:courseOpen})');
    source = once(source, 'onExample:B,hasProgress:e})', 'onExample:B,hasProgress:e,onServices:serviceOpen,onCourses:courseOpen})');
    return patchElement(source, 'portal-nav portal-nav-v21', '(0,on.jsx)(ServicesUI.Nav,{})');
  });
  script = patchFunction(script, 'Cse', source => {
    source = once(source, 'onExample:r,hasProgress:s})', 'onExample:r,hasProgress:s,onServices:serviceOpen,onCourses:courseOpen})');
    return once(source, '(0,yr.jsx)(Ese,{onStart:i,hasProgress:s})', '(0,yr.jsx)(CoursesUI.Home,{onOpen:courseOpen}),(0,yr.jsx)(ServicesUI.Home,{onOpen:serviceOpen}),(0,yr.jsx)(Ese,{onStart:i,hasProgress:s})');
  });
  script = patchFunction(script, 'Ese', source => once(source, '03 / \\u771F\\u5B9E\\u51FA\\u6D77\\u6545\\u4E8B', '05 / \\u771F\\u5B9E\\u51FA\\u6D77\\u6545\\u4E8B'));
  script = once(script, 'const V2UI = createV2UI(', 'const CoursesUI = createCoursesUI({ React: li, Button: Ge });\nconst ServicesUI = createServicesUI({ React: li, Button: Ge });\nconst V2UI = createV2UI(');
  return `import { createCoursesUI } from "./courses/ui.js?v=${versions.courses}";\nimport { createServicesUI } from "./services/ui.js?v=${versions.services}";\n` + script;
}

// Stylesheets: services, the shared detail layers, courses.
export function styleLinks(versions) {
  return `<link rel="stylesheet" href="./services/styles.css?v=${versions.services}">\n`
    + DETAIL_STYLES.map(name => `<link rel="stylesheet" href="./details/${name}.css?v=${versions.details}">`).join('\n')
    + `\n<link rel="stylesheet" href="./courses/styles.css?v=${versions.courses}">`;
}
