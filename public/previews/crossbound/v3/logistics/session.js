import {FIRST_MILE} from '../../v2/catalog.js';
import {cashFailure} from '../../v2/recovery.js';

export const logisticsKey=s=>s?.company?`${s.company.runSeed}:${s.company.round}:${s.company.attempt||0}:${s.company.marketId}:${s.company.productId}:${s.company.quantity}:${s.company.supplierId}`:null;
const codes=['SEA','SEA + AIR','AIR'];
const vehicles=['集装箱货轮','集卡转运','全货机'];
const paths=['工厂 → 海运港 → 海外仓','工厂 → 海运集货 → 转空运 → 海外仓','工厂 → 航空货运 → 海外仓'];
// Scene progress is a presentation draft. Only the existing engine commits money and orders.
export function createLogisticsSession({store,storage,onChange=()=>{}}){
  const key=logisticsKey(store.snapshot()),storageKey='crossbound-logistics-v1';
  let saved;try{saved=JSON.parse(storage?.getItem(storageKey)||'null');}catch{}
  let route=FIRST_MILE.findIndex(x=>x.id===store.snapshot().engine.config(store.snapshot().company).firstMile);
  if(route<0)route=1;
  let line=1,arrived=saved?.key===key&&saved.route===route&&saved.arrived===true,busy=false,disposed=false;
  const openingCash=store.snapshot().company.cash;
  function current(){return !disposed&&logisticsKey(store.snapshot())===key;}
  function requireEditable(){if(!current()||store.snapshot().company.stage!==4)throw Error('本轮状态已变化，请返回园区。');}
  function persist(){try{storage?.setItem(storageKey,JSON.stringify({key,route,arrived}));}catch{}}
  function changed(){if(!disposed)onChange();}
  function quote(r=route,l=line){const s=store.snapshot();return s.engine.preview(s.engine.configure(s.company,{firstMile:FIRST_MILE[r].id}),{id:s.engine.options(s.company,'fulfillment')[l]?.id});}
  function snapshot(){
    const s=store.snapshot(),c=s.company,e=s.engine,p=e.products.find(x=>x.id===c.productId),market=e.markets.find(x=>x.id===c.marketId);
    if(!p)return null;
    const done=c.stage===5&&!!c.report,q=done?c.report:quote(),destination=market?.name||c.marketId;
    const plans=e.options(c,'fulfillment');
    const routes=FIRST_MILE.map((r,i)=>{const f=done?q:quote(i);return {...r,code:codes[i],vehicle:vehicles[i],path:paths[i],cost:f.firstMileUnit??r.unit*p.shippingFactor,total:f.firstMileCost??0,quantity:f.unitsToBuy??c.quantity??0,arrived:f.arrivedUnits??0,delayed:f.delayedUnits??0,leadDays:f.leadDays??r.days,from:'国内集货港',fromCode:'CN',via:i===1?'国际转运枢纽':null,viaCode:'TRANSFER',to:destination+' · 海外仓',toCode:destination};});
    const lines=plans.map((f,i)=>{const x=done?q:quote(route,i);return {...f,code:['ECONOMY','STANDARD','EXPRESS'][i],cost:f.costPerOrder*(market?.freightFactor??1)*(p.shippingFactor??1),total:x.shippingCost??0,orders:x.orders??0,refund:Math.round((x.refundRate??0)*100)};});
    return {key,round:c.round,cash:c.cash,openingCash,stage:c.stage,product:p.name,destination,route,line,arrived,busy,done,routes,lines,
      quantity:q.unitsToBuy??c.quantity??0,available:q.units??q.totalUnits??c.quantity??0,orders:q.orders??0,delayed:q.delayedUnits??0,
      firstMileCost:q.firstMileCost??0,shippingCost:q.shippingCost??0,cashNeed:q.cashNeed??0,affordable:q.affordable!==false,
      shortfall:q.cashShortfall??0,reason:q.supplyBlockedReason||'',report:done?c.report:null};
  }
  function pick(kind,index){requireEditable();if(busy)return false;if(!Number.isInteger(index)||index<0||index>2)throw Error('无效物流方案。');if(kind==='route'){if(arrived)return false;route=index;}else if(kind==='line')line=index;else throw Error('无效物流选择。');changed();return true;}
  async function confirmRoute(){requireEditable();if(busy)return false;busy=true;changed();try{const s=store.snapshot();s.actions.setCompany(s.engine.configure(s.company,{firstMile:FIRST_MILE[route].id}));const ack=await store.waitFor(x=>logisticsKey(x)===key&&x.engine.config(x.company).firstMile===FIRST_MILE[route].id,1500);requireEditable();if(!ack)throw Error('头程方案尚未保存，请重试。');arrived=true;persist();return true;}finally{busy=false;changed();}}
  async function dispatch(){
    requireEditable();if(busy)return false;if(!arrived)throw Error('请先确认头程运输。');busy=true;changed();
    try{
      let s=store.snapshot();const id=s.engine.options(s.company,'fulfillment')[line].id;
      (s.actions.choose||s.actions.select)(id);
      const ack=await store.waitFor(x=>logisticsKey(x)===key&&x.choice?.id===id,1500);
      requireEditable();if(!ack)throw Error('尾程方案尚未保存，请重试。');
      s=store.snapshot();if(s.engine.config(s.company).firstMile!==FIRST_MILE[route].id)throw Error('头程方案已变化，请返回园区重新进入。');
      const q=quote();if(q.affordable===false){if(cashFailure(s.company,q))s.actions.recover?.(q);throw Error(q.supplyBlockedReason||`现金不足，还差 $${q.cashShortfall.toFixed(2)}。`);}
      s.actions.commit();
      const after=await store.waitFor(x=>logisticsKey(x)===key&&x.company.stage===5&&!!x.company.report,3000);
      if(!current()||!after)throw Error('出仓尚未确认，请核对当前状态后重试。');
      if(after.view==='decision')after.actions.close?.();
      store.send?.('world_complete',{world:'w5',route:FIRST_MILE[route].id,fulfillment:id,orders:after.company.report.orders});
      return true;
    }finally{busy=false;changed();}
  }
  return {snapshot,pick,confirmRoute,dispatch,get state(){return{key,busy};},dispose(){disposed=true;}};
}
