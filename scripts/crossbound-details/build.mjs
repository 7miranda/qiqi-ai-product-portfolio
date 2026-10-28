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
const detailStyles = ['styles', 'home', 'workspaces', 'operations'];
const detailsVersion = hash(detailStyles.map(name => `details/${name}.css`));
const fromBaseline = file => execFileSync('git', ['show', `${baseline}:${folder}/${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 30e6 });
const moduleFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline, `${folder}/`], { cwd: root, encoding: 'utf8' })
  .split('\n').filter(file => new RegExp(`^${folder}/(?:v11|v2|v3)/.*\\.js$`).test(file)).map(file => file.slice(folder.length + 1));
const modules = moduleFiles.map(file => [file, roomMaterials(fromBaseline(file), file)]);
const releaseVersion = createHash('sha256').update(modules.map(([file, source]) => file + source).join('') + read('details/room-materials.js')).digest('hex').slice(0, 10);
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
    source = once(source, 'function Roe(){', 'function Roe(){const [serviceReturn,setServiceReturn]=li.useState(null);const serviceTrigger=li.useRef(null);function openServices(){setServiceReturn(l);serviceTrigger.current=document.activeElement;u("services")}');
    const actions = '(0,re.jsx)(V11UI.SettlementActions,{company:t,ops:r,flow:v11Flow,onContinue:rs,onSkip:v11NextRound,onAdjust:()=>Ba(2),onHQ:()=>u("progress")})';
    source = once(source, actions, `(0,re.jsxs)(re.Fragment,{children:[${actions},(0,re.jsx)(ServicesUI.Review,{onOpen:openServices})]})`);
    source = once(source, 'passport:', 'services:"企业经营服务 · 需求准备",passport:');
    source = once(source, 'onSupply:pu,onMarkets:z5})', 'onSupply:pu,onMarkets:z5,onServices:openServices})');
    source = once(source, 'let kd=l===', 'let kd=l==="services"?serviceReturn:l===');
    source = once(source, 'D7=kd===', 'D7=kd==="complete"?"本轮战报":kd===');
    source = once(source, 'function L7(){', 'function L7(){if(l==="services"){u(serviceReturn);requestAnimationFrame(()=>{if(serviceReturn==="complete")xs.current?.querySelector("[data-service-review-trigger]")?.focus();else serviceTrigger.current?.focus()});return}');
    return once(source, 'l==="decision"?(0,re.jsxs)(re.Fragment,{children:[', 'l==="services"?(0,re.jsx)(ServicesUI.Workspace,{context:serviceReturn==="complete"?[ks.find(x=>x.id===t.marketId)?.countryLabel,Zn.find(x=>x.id===t.productId)?.name].filter(Boolean).join(" / "):null}):l==="decision"?(0,re.jsxs)(re.Fragment,{children:[');
  });
  script = patchFunction(script, 'Rse', source => {
    source = once(source, 'onSupply:o,onMarkets:a})', 'onSupply:o,onMarkets:a,onServices:serviceOpen})');
    source = once(source, 'onExample:B,hasProgress:e})', 'onExample:B,hasProgress:e,onServices:serviceOpen})');
    return patchElement(source, 'portal-nav portal-nav-v21', '(0,on.jsx)(ServicesUI.Nav,{})');
  });
  script = patchFunction(script, 'Cse', source => {
    source = once(source, 'onExample:r,hasProgress:s})', 'onExample:r,hasProgress:s,onServices:serviceOpen})');
    return once(source, '(0,yr.jsx)(Ese,{onStart:i,hasProgress:s})', '(0,yr.jsx)(ServicesUI.Home,{onOpen:serviceOpen}),(0,yr.jsx)(Ese,{onStart:i,hasProgress:s})');
  });
  script = patchFunction(script, 'Ese', source => once(source, '03 / \\u771F\\u5B9E\\u51FA\\u6D77\\u6545\\u4E8B', '04 / \\u771F\\u5B9E\\u51FA\\u6D77\\u6545\\u4E8B'));
  script = `import { createServicesUI } from "./services/ui.js?v=${servicesVersion}";\n` + script;
  script = once(script, 'const V2UI = createV2UI(', 'const ServicesUI = createServicesUI({ React: li, Button: Ge });\nconst V2UI = createV2UI(');
  script = versionImports(script, releaseVersion);
  const parsed = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (parsed.parseDiagnostics.length) throw new Error(ts.flattenDiagnosticMessageText(parsed.parseDiagnostics[0].messageText, '\n'));
  html = html.slice(0, module.index) + module[0].replace(module[1], () => script) + html.slice(module.index + module[0].length);
  const styleLinks = detailStyles.map(name => `<link rel="stylesheet" href="./details/${name}.css?v=${detailsVersion}">`).join('\n');
  html = once(html, '</head>', `<link rel="stylesheet" href="./services/styles.css?v=${servicesVersion}">\n${styleLinks}\n</head>`);
  fs.writeFileSync(path.join(root, folder, file), html);
  console.log(`${file}: current release preserved; service entry and shared detail styles integrated.`);
}
