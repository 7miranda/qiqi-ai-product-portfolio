import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture, prepare, finish, BASIC, FULL } from './crossbound-v11-fixture.mjs';
import { money, allocate, seededUnit } from '../public/previews/crossbound/v11/model.js';
const { engine: e, legacy, adapter } = fixture();

test('listing costs scale by product value, exact conversion and free organic traffic', () => {
  for (const [basePrice, cost] of [[24,700],[25,1260],[60,1260],[61,2100]]) {
    const p = { ...adapter.products[1], basePrice };
    assert.equal(e.listingProduct(p, FULL).cost, cost);
  }
  for (const [selection, factor] of [[BASIC,.75],[{...FULL,detailId:'summary'},1],[FULL,1.1875]]) assert.equal(e.listingProduct(adapter.products[1], selection).conversionFactor, factor);
  const p = adapter.products.find(p=>p.id==='tech');
  assert.equal(e.listingProduct(p,{...FULL,titleStyle:'specs',imageStyle:'specs'}).score,95);
  assert.equal(e.listingProduct(p,{...FULL,titleStyle:'scene'}).score,95);
  const n=prepare(e); const s=e.simulate(n); assert.equal(s.organicBonus,Math.floor((s.currentRoundVisitors+s.carryVisitors)*.2));
});
test('removed style fields cannot add hidden points when an older listing is reused', () => {
  let n=e.next(finish(e,prepare(e)));
  n.listingAssets.tech.score=98;
  n.listingAssets.tech.matchedStyle=true;
  n.listingAssets.tech.selection.titleStyle='specs';
  n.listingAssets.tech.selection.imageStyle='specs';
  const history=structuredClone(n.history);
  for(const d of [{id:'london'},{id:'tech'},{id:'pilot',quantity:1200,price:45,supplierId:'standard'}])n=e.commit(n,d);
  const q=e.listingQuote(n,{mode:'reuse'});
  assert.equal(q.score,95);
  assert.equal(q.conversionFactor,95/80);
  assert.equal(q.cost,100);
  assert.equal(q.selection.titleStyle,undefined);
  n=e.publish(n,{mode:'reuse'});
  assert.equal(n.currentListing.score,95);
  assert.deepEqual(n.history,history);
});
test('one round is deterministic across repeat, rollback and save; another round draws new conditions', () => {
  const n=finish(e,prepare(e));
  let again=e.rollback(n,3);for(const d of n.decisions.slice(3))again=e.commit(again,d);
  assert.equal(n.report.profit,again.report.profit); assert.equal(n.report.visitors,again.report.visitors);
  assert.deepEqual(e.deserialize(e.serialize(n)),n);
  assert.notEqual(seededUnit(n.runSeed,1,'traffic'),seededUnit(n.runSeed,2,'traffic'));
  assert.notEqual(seededUnit(n.runSeed,1,'traffic'),seededUnit(n.runSeed+1,1,'traffic'));
});
test('cash, assets and profit reconcile for products, suppliers, channels, refunds and tariff', () => {
  for (const market of ['singapore','los-angeles']) for (const [product,price,qty] of [['tech',45,1200],['adaptive-sofa',269,400]]) for (const supplier of ['standard','fast']) for (const channel of ['content','ads','creator']) {
    let n=prepare(e,{market,product,price,quantity:qty,supplier}); n=finish(e,n,channel,2400,{id:channel==='content'?'tutorial':channel==='creator'?'vertical':'benefit'});
    assert.equal(n.stage,6,`${market}/${product}/${channel}`);
    const report=n.report;
    assert.equal(money(n.roundStart.cash+n.ledger.filter(x=>x.round===n.round).reduce((s,x)=>s+x.cashDelta,0)),n.cash);
    assert.equal(report.assetChange,report.profit,`${market}/${product}/${channel} asset reconciliation`);
    assert.equal(report.refundReasons.reduce((s,x)=>s+x.count,0),report.refunds);
    assert.equal(report.attribution.reduce((s,x)=>s+x.orders,0),report.orders);
    assert.equal(report.attribution.reduce((s,x)=>s+x.keptOrders,0),report.keptOrders);
    assert.ok(report.attribution.every(s=>s.keptOrders>=0));
    assert.equal(report.tariff,market==='los-angeles'?money(report.orders*(report.availableCost/report.totalUnits)*.08):0);
    assert.ok(e.deserialize(e.serialize(n)));
  }
});
test('lead days affect timely stock, delivery affects demand and rising prices add refund risk', () => {
  const standard=e.simulate(prepare(e,{quantity:1600})), fast=e.simulate(prepare(e,{quantity:1600,supplier:'fast'}));
  assert.ok(fast.units>standard.units);
  const n=prepare(e,{quantity:1600}); n.trafficPlanId='ads'; n.trafficBudget=3600;
  n.fulfillmentPlanId='economy'; const slow=e.simulate(n); n.fulfillmentPlanId='express'; const quick=e.simulate(n);
  assert.ok(quick.conversion>slow.conversion); assert.ok(quick.refunds>0);
  n.price=money(45*1.5); assert.ok(e.simulate(n).priceRefundRate>0);
});
test('positive orders keep at least one refund; zero orders have zero refunds', () => {
  let n=prepare(e); n.quantity=1; n.roundStart.inventory.tech=1; n.roundStart.inventoryCosts.tech=14;
  assert.equal(e.simulate(n).orders,1); assert.equal(e.simulate(n).refunds,1);
  n.quantity=0;n.roundStart.inventory.tech=0;n.roundStart.inventoryCosts.tech=0;
  assert.equal(e.simulate(n).refunds,0);
});
test('cross-market listing reuses product asset and charges localization once', () => {
  let n=e.next(finish(e,prepare(e)));
  n=e.commit(n,{id:'london'});n=e.commit(n,{id:'tech'});n=e.commit(n,{id:'pilot',quantity:1200,price:45,supplierId:'standard'});
  assert.equal(e.listingQuote(n,{...FULL,mode:'reuse'}).cost,100);
  n=e.publish(n,{...FULL,mode:'reuse'});assert.equal(n.currentListing.score,95);
  n=e.next(finish(e,n));n=e.commit(n,{id:'london'});assert.equal(n.ledger.at(-1).cashDelta,-300);
  n=e.commit(n,{id:'tech'});n=e.commit(n,{id:'pilot',quantity:1200,price:45,supplierId:'standard'});
  assert.equal(e.listingQuote(n,{...FULL,mode:'reuse'}).cost,0);
});
test('paid optimization remains with its charge after rollback and cannot be duplicated', () => {
  let n=e.next(finish(e,prepare(e,{listing:BASIC})));
  for(const d of [{id:'singapore'},{id:'tech'},{id:'pilot',quantity:1200,price:45,supplierId:'standard'}])n=e.commit(n,d);
  const before=n.cash;n=e.optimize(n);assert.equal(n.cash,money(before-300));assert.equal(n.listingAssets.tech.baseScore,65);
  assert.equal(e.optimize(n).cash,n.cash);
  n=e.rollback(n,3);assert.equal(n.cash,money(before-300));assert.equal(n.listingAssets.tech.baseScore,65);
  assert.equal(n.ledger.filter(x=>x.round===n.round&&x.category==='listing').length,1);
});
test('content creates free next-round tail, while selected creative and creator actually change results', () => {
  let n=prepare(e,{quantity:1600});
  n.trafficPlanId='content';n.trafficBudget=2400;n.promotionChoice={id:'review'};
  const matched=e.simulate(n);n.promotionChoice={id:'tutorial'};const other=e.simulate(n);
  assert.ok(matched.currentRoundVisitors>=other.currentRoundVisitors*1.099);
  const content=finish(e,prepare(e),'content',2400,{id:'review'});assert.equal(e.next(content).contentTail,Math.floor(content.report.currentRoundVisitors*.1));
  n.trafficPlanId='ads';n.promotionChoice={id:'benefit'};const direct=e.simulate(n);n.promotionChoice={id:'scene'};assert.ok(direct.conversion/e.simulate(n).conversion>1.1);
  n.trafficPlanId='creator';n.promotionChoice={id:'large'};const large=e.simulate(n);n.promotionChoice={id:'small'};const small=e.simulate(n);
  assert.ok(large.currentRoundVisitors>small.currentRoundVisitors);assert.equal(large.commissionRate,.1);assert.equal(small.commissionRate,.05);
});
test('historical channel balance remains reproducible before REQ-049 calibration', () => {
  const compare = (budget, channel, seed=12345) => {
    const n=prepare(e,{seed,quantity:1600,market:'london'}); delete n.balanceVersion;
    n.trafficPlanId=channel;n.trafficBudget=budget;
    n.promotionChoice={id:channel==='ads'?'benefit':channel==='content'?'review':'large'};
    return e.simulate(n,'mean');
  };
  assert.ok(compare(900,'content').demand>compare(900,'ads').demand);
  assert.ok(compare(8000,'ads').demand>compare(8000,'content').demand);
  const winners=new Set();
  for(const budget of [900,2400,3600,8000])for(let seed=0;seed<60;seed++){
    const rows=['content','ads','creator'].map(channel=>{
      const n=prepare(e,{seed,quantity:1600,market:'london'}); delete n.balanceVersion;n.trafficPlanId=channel;n.trafficBudget=budget;
      n.promotionChoice={id:channel==='ads'?'benefit':channel==='content'?'review':'large'};
      return {channel,profit:e.simulate(n).profit};
    });winners.add(rows.sort((a,b)=>b.profit-a.profit)[0].channel);
  }
  assert.equal(winners.size,3);
});
test('forecast bounds contain realized orders and profit across independent seeds', () => {
  for(let seed=0;seed<50;seed++)for(const channel of ['content','ads','creator']){
    const n=prepare(e,{seed,quantity:1600});n.trafficPlanId=channel;n.trafficBudget=2400;
    n.promotionChoice={id:channel==='creator'?'large':channel==='content'?'review':'benefit'};
    n.stage=4;const preview=e.preview(n,{id:'express'});n.fulfillmentPlanId='express';const actual=e.simulate(n);
    for(const key of ['orders','keptOrders','profit'])assert.ok(actual[key]>=preview.bounds[key][0]&&actual[key]<=preview.bounds[key][1],`${channel}/${seed}/${key}`);
  }
});
test('eight pricing comparisons no longer share the maximum-price answer', () => {
  const winners=[];
  for(const market of ['singapore','london'])for(const product of ['tech','living'])for(const quantity of [800,1200]){
    const p=e.products.find(p=>p.id===product), choices=[];
    for(const factor of [1,1.18,1.3,1.4,1.5]){
      const n=prepare(e,{market,product,quantity,price:Math.round(p.basePrice*factor)});
      n.trafficPlanId='ads';n.trafficBudget=3600;n.fulfillmentPlanId='express';n.promotionChoice={id:'benefit'};
      choices.push({factor,profit:e.simulate(n,'mean').profit});
    }
    winners.push(choices.sort((a,b)=>b.profit-a.profit)[0].factor);
  }
  assert.equal(winners.length,8);assert.ok(winners.some(f=>f<1.5));
});
test('market capacity limits excess demand and clearing all stock changes cash and profit once', () => {
  let n=prepare(e,{quantity:1600});n.trafficPlanId='ads';n.trafficBudget=8000;const s=e.simulate(n);assert.ok(s.saturated);
  assert.ok(s.demand<Math.floor(s.visitors*s.conversion));
  n=finish(e,n,'ads',3600); const before=n.cash,cost=n.inventoryCosts.tech,profit=n.report.profit;
  n=e.clearStock(n,'tech');assert.equal(n.cash,money(before+money(cost*.5)));assert.equal(n.inventory.tech,0);
  assert.equal(n.report.profit,money(profit-money(cost-money(cost*.5))));assert.equal(n.report.assetChange,n.report.profit);
  assert.equal(e.clearStock(n,'tech').cash,n.cash);assert.ok(e.deserialize(e.serialize(n)));
});
test('ratings persist to next round and report reflects the next conversion impact', () => {
  const n=finish(e,prepare(e),'ads',3600,{id:'benefit'},'economy');
  assert.ok(n.report.badReviews>0);assert.ok(n.report.ratingAfter<5);assert.equal(e.next(n).ratings.tech.rating,n.report.ratingAfter);
});
test('legacy records restore without changing their cash or orders and migrate only at round boundaries', () => {
  let n=legacy.c1();for(const d of ['singapore','tech',{id:'pilot',quantity:800,price:45,supplierId:'standard',supplyRule:'v1'},'ads','express','retain'])n=legacy.gg(n,d);
  const raw=legacy.Gve(n);assert.ok(raw);const restored=legacy.Cre(raw);assert.equal(restored.cash,n.cash);assert.equal(restored.report.orders,n.report.orders);
  assert.equal(e.migrate(restored).engineVersion,undefined);
  const upgraded=e.migrate(legacy.uG(restored));assert.equal(upgraded.engineVersion,'v11');assert.equal(upgraded.history[0].profit,n.report.profit);
});
test('invalid saves and duplicate round effects are rejected or remain unchanged', () => {
  const n=finish(e,prepare(e)), raw=JSON.parse(e.serialize(n));raw.state.cash+=1;assert.equal(e.deserialize(raw),null);
  assert.equal(e.commit(n,{id:'retain'}),n);assert.deepEqual(allocate(7,[1,1,1]),[3,2,2]);
});
