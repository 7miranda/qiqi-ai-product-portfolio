// October 21 rules. Historical reports retain their recorded rule version.
export const GOAL_VERSION = 'dual-20261021';
export const orderTarget = round => Math.min(500, 300 + Math.max(0, round - 1) * 50);
export function goal(result) {
  const modern = result.goalVersion === GOAL_VERSION;
  const target = modern ? orderTarget(result.round) : result.round === 1 ? 300 : 500;
  const orders = (result.keptOrders || 0) >= target;
  const profit = (result.profit || 0) >= 5000;
  const passed = modern ? orders || profit : orders && result.profit > 0;
  const tier = !passed ? null : modern ? orders && profit ? 'gold' : profit ? 'silver' : 'bronze' : result.profit > 10000 || result.refunds === 0 ? 'gold' : result.profit > 5000 ? 'silver' : 'bronze';
  return { target, orders, profit, passed, tier, modern };
}
export const LEVELS = [
  [0,'新晋创始人'],[100,'市场开拓者'],[300,'增长领航者'],[600,'跨境掌舵人'],[1000,'品牌经营者'],
  [1600,'区域开拓者'],[2600,'多国经营者'],[4200,'全球运营者'],[6700,'品牌领航者'],[10700,'全球经营合伙人'],
].map(([xp,name],i)=>({level:i+1,xp,name}));
export function rank(ops) {
  const current = LEVELS.findLast(l => ops.xp >= l.xp) || LEVELS[0], next = LEVELS[current.level];
  return {...current, xp:ops.xp, minimumXp:current.xp, nextXp:next?.xp ?? null, nextName:next?.name ?? null,
    progress:next ? Math.min(1,Math.max(0,(ops.xp-current.xp)/(next.xp-current.xp))) : 1};
}
export function seasonRank(ops, date = new Date()) {
  const month = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
  const points = (ops.history || []).filter(e=>e.type==='round-growth' && e.month===month && e.season).reduce((s,e)=>s+e.xp,0);
  const tiers = ['青铜','白银','黄金','铂金','钻石'], index = Math.min(4,Math.floor(points/500));
  return {month,points,title:tiers[index],next:index<4?(index+1)*500:null};
}
export const cents = n => Math.round((n + Number.EPSILON) * 100) / 100;
const due = rows => cents((rows || []).filter(r=>!r.paid).reduce((s,r)=>s+r.amount,0));
export function financialStatements(company, report) {
  if (!report) return null;
  if (report.modelVersion !== 'v2') return { legacy:true, report };
  // A snapshot captured at settlement keeps old statements stable in later rounds.
  const end = report.financeEnd || (report.round === company.round ? company : null);
  if (!end || !report.roundStart) return {legacy:true,report,reason:'这份历史战报未保存资产负债明细，只展示原利润表。'};
  const start = report.roundStart;
  const balance = n => {
    const inventory = cents(Object.values(n.inventoryCosts || {}).reduce((s,x)=>s+x,0));
    const receivables = due(n.v2?.receivables), payables = due(n.v2?.payables);
    const loans = (n.v2?.loans || []).filter(r=>!r.paid);
    const principal = cents(loans.reduce((s,r)=>s+r.principal,0)), interest = cents(loans.reduce((s,r)=>s+r.interest,0));
    const assets = cents(n.cash+inventory+receivables), liabilities = cents(payables+principal+interest);
    return {cash:n.cash,inventory,receivables,payables,principal,interest,assets,liabilities,equity:cents(assets-liabilities)};
  };
  const opening = balance(start), closing = balance(end);
  const entries = company.ledger.filter(e=>e.round===report.round);
  const groups = new Map();
  entries.forEach(e=>groups.set(e.category,{label:e.label,amount:cents((groups.get(e.category)?.amount||0)+e.cashDelta)}));
  const flow = [...groups].map(([id,r])=>({id,...r}));
  const movement = cents(entries.reduce((s,e)=>s+e.cashDelta,0));
  const cashEnd = cents(opening.cash+movement), equityChange = cents(closing.equity-opening.equity);
  const checks = [Math.abs(closing.assets-closing.liabilities-closing.equity)<.011,Math.abs(equityChange-report.profit)<.011,Math.abs(cashEnd-closing.cash)<.011 && Math.abs(closing.cash-report.cash)<.011];
  return {legacy:false,report,opening,closing,flow,movement,cashEnd,equityChange,checks,
    cashRisk:closing.cash < closing.payables+closing.principal+closing.interest};
}
export function financeSnapshot(n) {
  return structuredClone({cash:n.cash,inventoryCosts:n.inventoryCosts,v2:{receivables:n.v2.receivables,payables:n.v2.payables,loans:n.v2.loans}});
}
export const MEDIUM_LISTING = {rule:'listing-v1',titleId:'use',imageId:'focus',detailId:'specs',mode:'build'};
export function recommend(engine, n) {
  const last = n.history.at(-1), stage = n.stage;
  const prior = last?.decisions?.[stage];
  const product = engine.products.find(p=>p.id===n.productId);
  let choice, source = '总部推荐';
  if (stage===0) choice={id:n.carryEffect?.newMarket ? engine.markets.find(m=>m.id!==n.previousMarket).id : last?.marketId || 'singapore'};
  if (stage===1) choice={id:last?.productId || 'tech'};
  if (stage===2) {
    const target = orderTarget(n.round), quantity = Math.min(1600,Math.max(400,Math.ceil(target/0.7/100)*100));
    choice={id:'pilot',quantity,price:Math.round(product.basePrice),supplierId:'standard',supplyRule:'v1'};
    // Reserve cash for delivery and promotion; never auto-borrow or auto-charge.
    while (choice.quantity>200 && (!engine.preview(n,choice)?.affordable || engine.preview(n,choice)?.purchaseCost>n.cash*.5)) choice.quantity-=100;
  }
  if (stage===3) {
    const channel=prior?.id || 'ads';
    const category=product?.category;
    const promotionChoice=prior?.promotionChoice || (channel==='ads'?{id:['electronics','home'].includes(category)?'benefit':'scene'}:channel==='content'?{id:category==='electronics'?'review':category==='lifestyle'?'unboxing':'tutorial'}:{id:'vertical',category});
    choice={id:channel,budget:Math.min(prior?.budget||2400,Math.max(300,Math.floor(n.cash*.15/100)*100)),promotionChoice};
  }
  if(stage===4) choice={id:'standard'};
  if(stage===5) choice={id:'retain'};
  if (prior && [0,1,3].includes(stage)) source='沿用上轮';
  const asset=n.listingAssets?.[n.productId];
  return {choice,source,listing:asset?{...asset.selection,mode:'reuse'}:{...MEDIUM_LISTING}};
}
export function matchesDefault(input, recommended) {
  if (!input || !recommended) return false;
  return Object.entries(recommended).every(([key,value])=>JSON.stringify(input[key])===JSON.stringify(value));
}
