import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { versionImports } from './imports.mjs';
import { roomMaterials } from './materials.mjs';

// Preserve Cynthia's integrated release. The legacy v11 builder predates this bundle.
const baseline = '367b11104922d1dbcb7126d2f7fdfa0b3369ea4f';
const root = fileURLToPath(new URL('../../', import.meta.url));
const folder = 'public/previews/crossbound';
const read = file => fs.readFileSync(path.join(root, folder, file));
const hash = files => createHash('sha256').update(files.map(read).join('')).digest('hex').slice(0, 10);
const servicesModelVersion = hash(['services/model.js']);
const serviceUI = path.join(root, folder, 'services/ui.js');
fs.writeFileSync(serviceUI, fs.readFileSync(serviceUI, 'utf8').replace(/\.\/model\.js\?v=[^"']+/, `./model.js?v=${servicesModelVersion}`));
const servicesVersion = hash(['services/model.js', 'services/ui.js', 'services/styles.css']);
const coursesModelVersion = hash(['courses/model.js']);
const courseUI = path.join(root, folder, 'courses/ui.js');
fs.writeFileSync(courseUI, fs.readFileSync(courseUI, 'utf8').replace(/\.\/model\.js(?:\?v=[^"']+)?/, `./model.js?v=${coursesModelVersion}`));
const coursesVersion = hash(['courses/model.js', 'courses/ui.js', 'courses/styles.css']);
const detailStyles = ['styles', 'home', 'workspaces', 'operations', 'atmosphere'];
const detailsVersion = hash(detailStyles.map(name => `details/${name}.css`));
const fromBaseline = file => execFileSync('git', ['show', `${baseline}:${folder}/${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 30e6 });
const moduleFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline, `${folder}/`], { cwd: root, encoding: 'utf8' })
  .split('\n').filter(file => new RegExp(`^${folder}/(?:v11|v2|v3)/.*\\.js$`).test(file)).map(file => file.slice(folder.length + 1));
const modules = moduleFiles.map(file => [file, roomMaterials(fromBaseline(file), file)]);
const releaseVersion = createHash('sha256').update(modules.map(([file, source]) => file + source).join('') + read('details/room-materials.js') + read('details/catalog-preview.js') + read('vendor/three/RoundedBoxGeometry.js')).digest('hex').slice(0, 10);
for (const [file, source] of modules) fs.writeFileSync(path.join(root, folder, file), versionImports(source, releaseVersion));

function once(source, from, to) {
  if (source.split(from).length !== 2) throw new Error(`Expected one anchor: ${from.slice(0, 80)}`);
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
  if (!found) throw new Error(`Missing function: ${name}`);
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
  if (matches.length !== 1) throw new Error(`Expected one element: ${className}`);
  const node = matches[0];
  return script.slice(0, node.getStart(sf)) + replacement + script.slice(node.end);
}

for (const file of ['index.html', 'preview.html']) {
  let html = fromBaseline(file);
  html = html.replace(/(<script type="importmap">)([\s\S]*?)(<\/script>)/, (_, open, json, close) => {
    const map = JSON.parse(json);
    for (const key of Object.keys(map.imports)) {
      if (/^\.\/(?:v11|v2|v3)\//.test(key)) map.imports[key] = `${key}?v=${releaseVersion}`;
    }
    return open + JSON.stringify(map) + close;
  }).replace(/(src="\.\/v3\/world\/boot\.js)\?v=[^"]+/, `$1?v=${releaseVersion}`)
    .replace('src="./runtime-config.js"', `src="./runtime-config.js?v=${releaseVersion}"`);
  const module = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].find(match => match[1].includes('function Roe('));
  if (!module) throw new Error(`Missing application module: ${file}`);
  let script = patchFunction(module[1], 'Roe', source => {
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
  script = `import { createCoursesUI } from "./courses/ui.js?v=${coursesVersion}";\nimport { createServicesUI } from "./services/ui.js?v=${servicesVersion}";\n` + script;
  script = once(script, 'const V2UI = createV2UI(', 'const CoursesUI = createCoursesUI({ React: li, Button: Ge });\nconst ServicesUI = createServicesUI({ React: li, Button: Ge });\nconst V2UI = createV2UI(');
  script = versionImports(script, releaseVersion);
  const parsed = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (parsed.parseDiagnostics.length) throw new Error(ts.flattenDiagnosticMessageText(parsed.parseDiagnostics[0].messageText, '\n'));
  html = html.slice(0, module.index) + module[0].replace(module[1], () => script) + html.slice(module.index + module[0].length);
  const styleLinks = detailStyles.map(name => `<link rel="stylesheet" href="./details/${name}.css?v=${detailsVersion}">`).join('\n');
  html = once(html, '</head>', `<link rel="stylesheet" href="./services/styles.css?v=${servicesVersion}">\n${styleLinks}\n<link rel="stylesheet" href="./courses/styles.css?v=${coursesVersion}">\n</head>`);
  fs.writeFileSync(path.join(root, folder, file), html);
  console.log(`${file}: current release preserved; courses, services and shared detail styles integrated.`);
}
