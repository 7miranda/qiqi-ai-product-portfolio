import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const baseline = 'b1cddb58e36cf1bfc2ba334bd940040145d7e20c';
const folder = 'public/previews/crossbound';
const marker = '/* Crossbound v1.1 bridge */';
// Refresh edited UI assets even when the browser retains a cached module.
const uiVersion = createHash('sha256').update(fs.readFileSync(path.join(root, folder, 'v11/ui.js'))).digest('hex').slice(0, 10);
const cssVersion = createHash('sha256').update(fs.readFileSync(path.join(root, folder, 'v11/styles.css'))).digest('hex').slice(0, 10);
const v2Version = createHash('sha256').update(['core.js','model.js','catalog.js','progress.js','ui.js','styles.css'].map(f=>fs.readFileSync(path.join(root,folder,'v2',f))).join('')).digest('hex').slice(0,10);
const servicesUIPath = path.join(root, folder, 'services/ui.js');
const servicesModelVersion = createHash('sha256').update(fs.readFileSync(path.join(root, folder, 'services/model.js'))).digest('hex').slice(0, 10);
const servicesUI = fs.readFileSync(servicesUIPath, 'utf8').replace(/from '\.\/model\.js(?:\?v=[^']*)?'/, `from './model.js?v=${servicesModelVersion}'`);
fs.writeFileSync(servicesUIPath, servicesUI);
const servicesVersion = createHash('sha256').update(['model.js', 'ui.js', 'styles.css'].map(f => fs.readFileSync(path.join(root, folder, 'services', f))).join('')).digest('hex').slice(0, 10);
const encode = text => text.replace(/[\u0080-\uFFFF]/g, c => '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
function replaceOne(source, from, to, label = from.slice(0, 80)) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one anchor, found ${count}`);
  return source.replace(from, to);
}
function replaceFunction(script, name, change) {
  const sf = ts.createSourceFile('demo.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let found;
  function visit(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === name) found = n; ts.forEachChild(n, visit); }
  visit(sf);
  if (!found) throw new Error(`Missing ${name}`);
  return script.slice(0, found.getStart(sf)) + change(found.getText(sf)) + script.slice(found.end);
}
function replaceElement(script, className, change) {
  const sf = ts.createSourceFile('component.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const found = [];
  function visit(n) {
    if (ts.isCallExpression(n) && n.arguments.some(a => ts.isObjectLiteralExpression(a) && a.properties.some(p =>
      ts.isPropertyAssignment(p) && p.name.getText(sf) === 'className' && ts.isStringLiteral(p.initializer) && p.initializer.text === className))) found.push(n);
    ts.forEachChild(n, visit);
  }
  visit(sf);
  if (found.length !== 1) throw new Error(`Expected one ${className}, found ${found.length}`);
  const node = found[0];
  return script.slice(0, node.getStart(sf)) + change(node.getText(sf)) + script.slice(node.end);
}
function patchMain(s) {
  const once = (from, to, label) => { s = replaceOne(s, from, to, label); };
  once('function Roe(){', 'function Roe(){const [v11Promotion,setV11Promotion]=li.useState({});');
  once('function Roe(){', 'function Roe(){const [serviceReturn,setServiceReturn]=li.useState(null);const serviceTrigger=li.useRef(null);function openServices(){setServiceReturn(l);serviceTrigger.current=document.activeElement;u("services")}');
  once('Ng=t.listingAssets?.[`${t.marketId}:${t.productId}`]??null', 'Ng=t.listingAssets?.[V11.valid(t)?t.productId:`${t.marketId}:${t.productId}`]??null');
  once('Et===3?{budget:C,', 'Et===3?{budget:C,promotionChoice:v11Promotion[h],');
  // Hook after all original state declarations, before the first effect.
  once('ji=!!l;', 'ji=!!l;const v11Flow=V11UI.useSettlement(t);const v11Achievements=V11UI.useAchievements(t);const v11OpenAchievements=()=>{v11Achievements.markSeen();u("achievements")};const v11HQ=_s.facilities.some(f=>f.ready)?"可建设设施":_s.reviewTask?"差评待处理":_s.nextTask?.available?"有总部来电":"";' + fs.readFileSync(path.join(root, 'scripts/crossbound-v11/main-actions.js'), 'utf8'));
  s = replaceFunction(s, 'Zr', () => 'function Zr(){if(mn&&hn)v11Award(jse(r,mn.id,hn,t.round));}');
  s = replaceFunction(s, 'rs', () => 'function rs(){v11ContinueSettlement()}');
  once('function As(){', 'function As(){if(t.v2?.events.some(e=>e.dueRound===t.round&&t.stage>=e.stage&&!e.choice)){u("v2-events");return}if(_s.reviewTask){Ai("");u("review-task");return}');
  once('function $s(){', 'function $s(){if(v11Flow.active&&rt?.kind!=="business"){if(rt?.kind==="challenge"&&_s.facilities.some(f=>f.ready)){v11Flow.build();tn(null);u("build")}else v11NextRound();return}');
  once('function L7(){if(!fn){', 'function L7(){if(!fn){if(v11Flow.active&&["operations","review-task","reward","build"].includes(l)){v11Flow.finish();tn(null);u("complete");return}');
  once('function hu(){', 'function hu(){if(v11Flow.active)v11Flow.finish();');
  once('onClick:()=>u("progress"),children:"'+encode('成长奖励')+'"', 'onClick:()=>u("progress"),children:v11HQ?"公司总部 · "+v11HQ:"公司总部"');
  const tutorial = 'o&&!n&&!ms&&(0,re.jsx)(Ge,{variant:"outline",className:"company-tutorial-entry"';
  once(tutorial, 'o&&!n&&!l&&(0,re.jsx)(V11UI.Cockpit,{company:t,ops:r,preview:pr,onOpen:nr,onBuild:()=>u("progress"),onTask:As}),(0,re.jsxs)(Ge,{variant:"outline",className:"v11-header-achievements",onClick:v11OpenAchievements,children:["出海成就",v11Achievements.unread.length>0&&(0,re.jsx)("span",{className:"v11-new-dot",children:"●"})]}),o&&!n&&(0,re.jsx)(Ge,{variant:"outline",className:"company-tutorial-entry"');
  s = replaceElement(s, 'campus-world', original => original.replace('children:', 'children:[!l&&(0,re.jsx)(V11UI.NotificationDock,{company:t,ops:r,unread:v11Achievements.unread,onAchievements:v11OpenAchievements,onTask:As,onHQ:()=>u("progress")}),') .replace(/\}\)$/, ']} )'));
  once('(0,re.jsx)(Vse,{currentStepLabel:', '(0,re.jsx)(Vse,{headquartersStatus:v11HQ,currentStepLabel:');
  once('function vS(Te){', 'function vS(Te){if(Te==="headquarters"){d(Te);u("progress");return}');
  once('l==="passport"?(0,re.jsx)(Fse,{company:t,onContinue:nr})', '(l==="passport"||l==="achievements")?(0,re.jsx)(V2UI.AchievementHall,{company:t,ops:r,onContinue:nr})');
  once('affordable:!!(Dd&&Dd.cost<=t.cash),disabled:fn', 'affordable:!!(Dd&&Dd.cost<=t.cash),disabled:fn,company:t,onOptimize:()=>i(V11.optimize(t))');
  once('stock:t.inventory[Is.id]||0,', 'stock:V11.valid(t)?zve(t)?.units||0:t.inventory[Is.id]||0,');
  once('(0,re.jsx)(Oxe,{marketId:ec?.id||"singapore",onExplore:()=>z5(ec?.id||"singapore")})', '(0,re.jsx)(Oxe,{marketId:ec?.id||"singapore",onExplore:()=>z5(ec?.id||"singapore")}),(0,re.jsx)(V11UI.MarketFacts,{company:t,market:ec})');
  once('(0,re.jsx)("strong",{children:Et===0&&Te.countryLabel||Te.name})', '(0,re.jsxs)("strong",{children:[Et===0&&Te.countryLabel||Te.name,Et===0&&(0,re.jsx)(V2UI.MarketStamp,{company:t,marketId:Te.id}),Et===1&&(0,re.jsx)("small",{children:` ★ ${(t.ratings?.[Te.id]?.rating??5).toFixed(1)}`})]})');
  once('l==="operations"&&mn?(0,re.jsxs)(re.Fragment,{children:[', 'l==="operations"&&mn?(0,re.jsxs)(re.Fragment,{children:[(0,re.jsx)(V11UI.CallIntro,{round:t.round}),');
  once('l==="operations"&&mn?', 'l==="v2-events"?(0,re.jsx)(V2UI.Events,{company:t,onChange:i}):l==="review-task"?(0,re.jsx)(V11UI.ReviewTask,{key:_s.reviewTask?.id,task:_s.reviewTask?{..._s.reviewTask,rewardRound:t.round}:null,onSubmit:v11ReviewAnswer,feedback:Gn}):l==="operations"&&mn?');
  once('Et===3&&(0,re.jsx)("div",{className:"campaign-parameters"', 'Et===3&&(0,re.jsx)(V11UI.Promotion,{company:t,channel:Ia?.id||"content",selection:v11Promotion[Ia?.id||"content"],onChange:choice=>setV11Promotion({...v11Promotion,[Ia?.id||"content"]:choice}),onBudget:N}),Et===3&&(0,re.jsx)("div",{className:"campaign-parameters"');
  once('Et===3&&(0,re.jsx)(V11UI.Promotion,', '(0,re.jsx)(V2UI.StageOptions,{company:t,onChange:i,market:ec,product:Ju,preview:pr,channel:Ia?.id||"content"}),Et===3&&(0,re.jsx)(V11UI.Promotion,');
  once('l==="complete"?(0,re.jsxs)(re.Fragment,{children:[', 'l==="complete"?(0,re.jsxs)(re.Fragment,{children:[(0,re.jsx)(V2UI.BadgeCelebration,{company:t},`${t.runSeed}:${t.round}`),(0,re.jsx)(V2UI.HonorSummary,{company:t,ops:r}),(0,re.jsx)(V11UI.RoundAchievements,{company:t,onOpen:v11OpenAchievements}),');
  once('(0,re.jsx)(oN,{report:Pe,compact:!0}),', '(0,re.jsx)(oN,{report:Pe,compact:!0}),(0,re.jsx)(V11UI.Clearance,{company:t,onChange:i}),(0,re.jsx)(V11UI.GrowthSummary,{company:t,ops:r,onTask:As,onBuild:()=>u("build")}),');
  s = replaceElement(s, 'result-next-v23', () => '(0,re.jsx)(V11UI.SettlementActions,{company:t,ops:r,flow:v11Flow,onContinue:rs,onSkip:v11NextRound,onAdjust:()=>Ba(2),onHQ:()=>u("progress")})');
  once('(0,re.jsx)(V11UI.SettlementActions,{company:t,ops:r,flow:v11Flow,onContinue:rs,onSkip:v11NextRound,onAdjust:()=>Ba(2),onHQ:()=>u("progress")})', '(0,re.jsxs)(re.Fragment,{children:[(0,re.jsx)(V11UI.SettlementActions,{company:t,ops:r,flow:v11Flow,onContinue:rs,onSkip:v11NextRound,onAdjust:()=>Ba(2),onHQ:()=>u("progress")}),(0,re.jsx)(ServicesUI.Review,{onOpen:openServices})]})');
  s = replaceElement(s, 'prize-actions', original => `v11Flow.active&&rt.kind!=="business"?(0,re.jsx)(V11UI.RewardActions,{reward:rt,ready:_s.facilities.some(f=>f.ready),onContinue:$s,onSkip:v11NextRound}):${original}`);
  once('rt.promotion&&(0,re.jsxs)("span",{children:["'+encode('晋升 / ')+'",rt.promotion]})', '(0,re.jsx)(V11UI.LevelUp,{reward:rt})');
  once('l&&(0,re.jsx)(Use,{view:l,inBusiness:o&&!n}),', 'l&&(0,re.jsx)(Use,{view:l,inBusiness:o&&!n}),(l==="complete"||v11Flow.active&&["operations","review-task","reward","build"].includes(l))&&(0,re.jsx)(V11UI.SettlementProgress,{view:l,flow:v11Flow}),');
  once('rt.kind!=="business"&&(0,re.jsxs)("div",{className:"reward-next"', '!v11Flow.active&&rt.kind!=="business"&&(0,re.jsxs)("div",{className:"reward-next"');
  once('${l==="reward"?"is-rewarding":""}', '${l==="reward"?"is-rewarding":""} ${l==="reward"&&rt?.promotion?"v11-is-level-up":""}');
  once('Et===4&&(Is.shippingFactor||1)>1', 'Et===5&&(0,re.jsx)(V11UI.Clearance,{company:t,onChange:i}),Et===4&&(Is.shippingFactor||1)>1');
  once('(0,re.jsx)(foe,{company:t,ops:r,', '(0,re.jsx)(V2UI.CompanyGrowth,{company:t,ops:r,onChange:i}),(0,re.jsx)(V11UI.History,{company:t}),(0,re.jsx)(foe,{company:t,ops:r,');
  once('"'+encode('首次做对：至少 100 经验 + 20 建设点')+'"', 't.round<=3?"首次做对：200经验 + 40建设点（前三轮双倍）":"首次做对：100经验 + 20建设点"');
  // Numeric forecasts are ranges. Committed cash, quantities, fees and settled reports stay exact.
  s = s.replaceAll('ps(pr?.profit||0)', 'V11UI.range(pr,"profit",true)');
  s = s.replaceAll('Hh(pr?.orders||0)', 'V11UI.range(pr,"orders")');
  s = s.replaceAll('children:pr?.orders||0', 'children:V11UI.range(pr,"orders")');
  s = s.replaceAll('children:pr?.refunds||0', 'children:V11UI.range(pr,"refunds")');
  s = s.replaceAll('ps(pr.writeoffCost||0,!0)', 'V11UI.range(pr,"writeoffCost",true)');
  s = s.replaceAll('ps(pr.returnHandlingCost||0,!0)', 'V11UI.range(pr,"returnHandlingCost",true)');
  s = s.replaceAll('pr.refunds,', 'V11UI.range(pr,"refunds"),').replaceAll('pr.returnRestocked,', 'V11UI.range(pr,"returnRestocked"),').replaceAll('pr.returnWriteoffs,', 'V11UI.range(pr,"returnWriteoffs"),');
  once('Hh(Number(kn))', 'V11UI.range(pr,["visitors","orders","keptOrders"][Jr])');
  once('ps(t.cash+(pr?.cashDelta||0),!0)', 'Et===4&&V11.valid(t)?V11UI.range(pr,"cashDelta",true,t.cash):ps(t.cash+(pr?.cashDelta||0),!0)');
  once('ps(ec?.launchCost||0)', 'ps(Math.abs(pr?.cashDelta||0))');
  once('"'+encode('商品已入库')+' \\xB7 '+encode('可售库存')+'",value:`${Hh(kn)} '+encode('件')+'`', '"库存已登记 · 本轮及时可售",value:`${Hh(V11.valid(Te)?zve(Te)?.units||0:kn)} 件`');
  once('"'+encode('这批货已入库，接下来制作商品页并推广。')+'"', '"进货计划已确认，接下来制作商品页并推广。"');
  // Dialog title is also updated for screen readers.
  once('passport:', '"v2-events":"总部来电 · 经营事件","review-task":"总部来电 · 售后复盘",achievements:"出海成就",passport:');
  once('passport:', 'services:"企业经营服务 · 需求准备",passport:');
  once('onSupply:pu,onMarkets:z5})', 'onSupply:pu,onMarkets:z5,onServices:openServices})');
  once('let kd=l===', 'let kd=l==="services"?serviceReturn:l===');
  once('D7=kd===', 'D7=kd==="complete"?"本轮战报":kd===');
  once('function L7(){', 'function L7(){if(l==="services"){u(serviceReturn);requestAnimationFrame(()=>{if(serviceReturn==="complete")xs.current?.querySelector("[data-service-review-trigger]")?.focus();else serviceTrigger.current?.focus()});return}');
  once('l==="decision"?(0,re.jsxs)(re.Fragment,{children:[', 'l==="services"?(0,re.jsx)(ServicesUI.Workspace,{context:serviceReturn==="complete"?[ks.find(x=>x.id===t.marketId)?.countryLabel,Zn.find(x=>x.id===t.productId)?.name].filter(Boolean).join(" / "):null}):l==="decision"?(0,re.jsxs)(re.Fragment,{children:[');
  return s;
}

let bridge = fs.readFileSync(path.join(root, 'scripts/crossbound-v11/bridge.js'), 'utf8');
for (const file of ['index.html', 'preview.html']) {
  const relative = `${folder}/${file}`;
  // A pinned, clean upstream baseline makes regeneration repeatable without storing another 7MB copy.
  let html = execFileSync('git', ['show', `${baseline}:${relative}`], { cwd: root, encoding: 'utf8', maxBuffer: 30e6 });
  const match = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].find(m => m[1].includes('function Roe('));
  if (!match) throw new Error(`Missing application script: ${file}`);
  let script = match[1];
  script = replaceFunction(script, 'Roe', patchMain);
  script = replaceFunction(script, 'Rse', s => {
    s = replaceOne(s, 'onSupply:o,onMarkets:a})', 'onSupply:o,onMarkets:a,onServices:serviceOpen})');
    s = replaceOne(s, 'onExample:B,hasProgress:e})', 'onExample:B,hasProgress:e,onServices:serviceOpen})');
    return replaceElement(s, 'portal-nav portal-nav-v21', () => '(0,on.jsx)(ServicesUI.Nav,{})');
  });
  script = replaceFunction(script, 'Cse', s => {
    s = replaceOne(s, 'onExample:r,hasProgress:s})', 'onExample:r,hasProgress:s,onServices:serviceOpen})');
    return replaceOne(s, '(0,yr.jsx)(Ese,{onStart:i,hasProgress:s})', '(0,yr.jsx)(ServicesUI.Home,{onOpen:serviceOpen}),(0,yr.jsx)(Ese,{onStart:i,hasProgress:s})');
  });
  script = replaceFunction(script, 'Ese', s => replaceOne(s, '03 / '+encode('真实出海故事'), '04 / '+encode('真实出海故事')));
  script = replaceFunction(script, 'Vse', s => {
    s = replaceOne(s, 'reducedMotion:s})', 'reducedMotion:s,headquartersStatus:v11HQ=""})');
    s = replaceOne(s, 'function Z(K){', 'function Z(K){if(K.id==="headquarters")return v11HQ||"任务与设施";');
    s = replaceOne(s, '"data-zone":K.id,', '"data-zone":K.id,"data-attention":K.id==="headquarters"&&v11HQ?true:void 0,');
    return s;
  });
  script = replaceFunction(script, 'foe', s => {
    s = replaceElement(s, 'clarity-business-goal', () => 'null');
    return s.replace(encode('成长与奖励'), encode('公司总部')).replace(encode('先做完第一项任务，拿到 100 经验和 20 建设点，就能组建运营团队。'), encode('先做完第一项任务，获得经验与建设点，就能组建运营团队。'));
  });
  script = replaceFunction(script, 'Bse', s => {
    s = replaceOne(s, 'disabled:h=!1})', 'disabled:h=!1,company:v11Company,onOptimize:v11Optimize})');
    for (const name of ['tG', 'nG', 'iG']) s = replaceOne(s, `options:${name},`, `options:${name}.map(x=>({...x,cost:x.cost*(V11.valid(v11Company)?V11.scale(n):1)})),`);
    s = replaceOne(s, '(0,Jt.jsxs)("section",{className:"listing-buyer-preview"', '(0,Jt.jsx)(V11UI.ListingOptimization,{company:v11Company,product:n,published:a,onOptimize:v11Optimize}),(0,Jt.jsxs)("section",{className:"listing-buyer-preview"');
    s = replaceOne(s, 'children:" / 95"', 'children:a?.score>95?"（原规则）":" / 95"');
    return s;
  });
  script = replaceFunction(script, 'Fse', s => {
    s = s.replace('id:"campaign-dialog-title"', 'id:"passport-heading-title"').replace('"aria-labelledby":"campaign-dialog-title"', '"aria-labelledby":"passport-heading-title"');
    s = s.replace(encode('这是模拟经营成就，不发放现金、经验、建设点、证书或真实合作权益。'), encode('这是模拟经营成就。探索与区域收集可获得游戏建设点；荣誉卡不代表职业资质或真实合作权益。'));
    return replaceElement(s, 'passport-stamp', () => '(0,mi.jsx)(V11UI.CountryBadge,{marketId:s.marketId,tier:s.tier})');
  });
  script = replaceFunction(script, 'R5', s => s.replace(encode('进价提高 8%；交期本轮不改变模拟销量'), encode('进价提高8%；新规则按交期计算本轮及时可售库存')));
  script = replaceOne(script, 'window.Globe=W8e;', `${marker}\n${bridge}\nwindow.Globe=W8e;`);
  script = `import { createServicesUI } from "./services/ui.js?v=${servicesVersion}";\nimport { HELP } from "./v11/model.js";\nimport { createCrossboundV2 } from "./v2/model.js?v=${v2Version}";\nimport { createV2UI, profitRows } from "./v2/ui.js?v=${v2Version}";\nimport { explorationAwards } from "./v2/progress.js";\nimport { createGrowth } from "./v11/growth.js?v=${v2Version}";\nimport { createCrossboundUI } from "./v11/ui.js?v=${uiVersion}";\n` + script;
  script = replaceOne(script, 'const V2UI = createV2UI(', 'const ServicesUI = createServicesUI({ React: li, Button: Ge });\nconst V2UI = createV2UI(');
  const parsed = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (parsed.parseDiagnostics.length) {
    const diagnostic = parsed.parseDiagnostics[0], position = diagnostic.start || 0;
    throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n') + '\nNear: ' + script.slice(position - 140, position + 140));
  }
  html = html.slice(0, match.index) + match[0].replace(/^<script\b[^>]*>/, '<script type="module">').replace(match[1], () => script) + html.slice(match.index + match[0].length);
  html = html.replace('</head>', `<link rel="stylesheet" href="./v11/styles.css?v=${cssVersion}">\n<link rel="stylesheet" href="./v2/styles.css?v=${v2Version}">\n<link rel="stylesheet" href="./services/styles.css?v=${servicesVersion}">\n</head>`);
  fs.writeFileSync(path.join(root, relative), html);
  console.log(`${file}: v1.1 integrated; original campus and dialog layout retained.`);
}
