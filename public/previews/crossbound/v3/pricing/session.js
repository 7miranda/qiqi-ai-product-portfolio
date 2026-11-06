import {balanceRules} from '../../v11/balance.js';
import {cashFailure} from '../../v2/recovery.js';

export const DRAFT_KEY='crossbound-pricing-draft-v1';
export const pricingKey=s=>s?.company?`${s.company.v2?.identity||s.company.runSeed}:${s.company.round}:${s.company.attempt||0}:${s.company.marketId}:${s.company.productId}`:null;
const signature=q=>JSON.stringify(q);

// Presentation-only draft. The engine owns every quote, inventory mutation and ledger entry.
export function createPricingSession({store,storage,onChange=()=>{},onNext=()=>{}}){
  const initial=store.snapshot(),key=pricingKey(initial);
  const product=initial.engine.products.find(p=>p.id===initial.company.productId);
  if(initial.company.stage!==2||!product)throw Error('请先完成选品与供货洽谈。');
  const bounds={min:Math.round(product.basePrice*.7),max:Math.round(product.basePrice*balanceRules(initial.company).maxPrice),base:product.basePrice};
  let saved,upstream;try{saved=JSON.parse(storage?.getItem(DRAFT_KEY)||'null');upstream=JSON.parse(storage?.getItem('crossbound-world-w1-v1')||'null');}catch{}
  const c=initial.company,upstreamKey=`${c.runSeed}:${c.round}${c.attempt?':retry'+c.attempt:''}`;
  const negotiated=upstream?.key===upstreamKey&&upstream.product===c.productId?upstream.supplier:null;
  const candidate=negotiated||(saved?.key===key?saved.draft?.supplierId:null);
  const supplier=(initial.quotes?.(c.productId)||[]).some(q=>q.id===candidate)?candidate:initial.supplier||c.supplierId||'standard';
  let draft={id:initial.choice?.id||initial.options[0]?.id,price:initial.draft?.price??product.basePrice,quantity:initial.draft?.quantity??400,supplierId:supplier,supplyRule:'v1'};
  if(saved?.key===key&&saved.draft?.supplierId===supplier&&initial.options.some(o=>o.id===saved.draft.id)&&initial.engine.normalize(initial.company,saved.draft))draft=saved.draft;
  let busy=false,disposed=false,notice='';
  const current=()=>!disposed&&pricingKey(store.snapshot())===key&&store.snapshot().company.stage===2;
  function requireCurrent(){if(!current())throw Error('本轮状态已变化，请返回园区重新进入。');}
  function changed(){if(!disposed)onChange();}
  function persist(){try{storage?.setItem(DRAFT_KEY,JSON.stringify({key,draft}));}catch{}}
  let quoteCompany,quoteEngine;const quoteCache=new Map();
  function quote(s=store.snapshot(),input=draft){
    if(quoteCompany!==s.company||quoteEngine!==s.engine){quoteCompany=s.company;quoteEngine=s.engine;quoteCache.clear();}
    const key=JSON.stringify(input);if(!quoteCache.has(key))quoteCache.set(key,s.engine.preview(s.company,input));
    return quoteCache.get(key);
  }
  function affordableQuantity(s,input,ceiling=input.quantity){
    for(let quantity=Math.min(1600,Math.floor(ceiling/100)*100);quantity>=200;quantity-=100){
      const q=quote(s,{...input,quantity});if(q?.affordable)return quantity;
    }return null;
  }
  function planInput(s,o){const input={...draft,id:o.id,price:Math.round(product.basePrice*o.priceFactor),quantity:o.quantity};return {...input,quantity:affordableQuantity(s,input)||o.quantity};}
  if(saved?.key!==key){const quantity=affordableQuantity(initial,draft);if(quantity)draft={...draft,quantity};}

  function snapshot(){
    const s=store.snapshot(),q=quote(s);if(!current()||!q)return null;
    const market=s.engine.options(s.company,'markets').find(m=>m.id===s.company.marketId);
    const adjustQuantity=q.affordable?null:affordableQuantity(s,draft);
    return {key,round:s.company.round,cash:s.company.cash,product:{id:product.id,name:product.name},market:market?.name||'',
      supplier:q.supplierName,draft:{...draft},bounds,quote:q,busy,canConfirm:!busy&&q.affordable,
      canRecover:!busy&&!adjustQuantity&&!!cashFailure(s.company,q),adjustQuantity,
      plans:s.options.map(o=>{const input=planInput(s,o);const p=quote(s,input);return{id:o.id,name:o.name,english:o.english,summary:o.summary,benefit:o.benefit,quantity:input.quantity,price:input.price,purchase:p?.purchaseCost,unitCost:p?.unitCost};}),
      notice:notice||(busy?'正在确认采购…':q.supplyBlockedReason||(!q.affordable?adjustQuantity?`当前备货超出周转预算，可调整为 ${adjustQuantity} 件；尚未扣款`:`当前方案还需 $${q.cashShortfall.toFixed(2)} 周转资金；尚未扣款`:`新增采购 ${q.unitsToBuy} 件 · 预计本轮到货 ${q.arrivedUnits} 件`))};
  }
  function edit(field,value){
    requireCurrent();if(busy)return false;
    let next={...draft};
    if(field==='plan'){
      const o=store.snapshot().options.find(o=>o.id===value);if(!o)throw Error('无效的备货方案。');
      Object.assign(next,planInput(store.snapshot(),o));
    }else if(field==='price'||field==='quantity'){
      if(typeof value!=='number'||!Number.isFinite(value))throw Error('请输入有效数值。');
      next[field]=value;
    }else throw Error('无效的定价操作。');
    if(!store.snapshot().engine.normalize(store.snapshot().company,next))throw Error('售价或数量超出本轮可用范围。');
    draft=next;notice='';persist();changed();return true;
  }
  function recover(){requireCurrent();if(busy)return false;const s=store.snapshot(),q=quote(s);if(affordableQuantity(s,draft)){notice='可先减少备货，无需重启本轮。';changed();return false;}return !!cashFailure(s.company,q)&&!!s.actions.recover?.(q);}
  async function confirm(review){
    requireCurrent();if(busy)return false;
    const reviewed=quote();if(review&&review!==signature(reviewed))throw Error('报价已变化，请重新核对采购订单。');
    if(!reviewed?.affordable){if(recover())return false;throw Error(reviewed?.supplyBlockedReason||'本轮现金不足，请调整备货或查看资金。');}
    const input={...draft};busy=true;notice='';changed();
    try{
      store.snapshot().actions.choose(input.id);
      const selected=await store.waitFor(s=>pricingKey(s)===key&&s.company.stage===2&&s.choice?.id===input.id,1500);
      requireCurrent();if(!selected)throw Error('备货方案尚未保存，请重试。');
      const actions=store.snapshot().actions;actions.setPrice(input.price);actions.setQuantity(input.quantity);actions.setSupplier(input.supplierId);
      const accepted=await store.waitFor(s=>pricingKey(s)===key&&s.company.stage===2&&s.choice?.id===input.id&&s.draft?.price===input.price&&s.draft?.quantity===input.quantity&&s.supplier===input.supplierId,1500);
      requireCurrent();if(!accepted)throw Error('定价参数尚未保存，请重试。');
      const latest=store.snapshot(),q=quote(latest,input);
      if(!q?.affordable||signature(q)!==signature(reviewed)||signature(latest.preview)!==signature(q))throw Error('报价或资金已变化，请核对更新后的数字再确认。');
      latest.actions.commit();
      const after=await store.waitFor(s=>pricingKey(s)===key&&s.company.stage===3,2500);
      if(disposed)return false;
      if(!after)throw Error('采购尚未确认，请核对当前状态后重试。');
      try{storage?.removeItem(DRAFT_KEY);}catch{}
      store.send?.('world_complete',{world:'w2',product:after.company.productId,quantity:after.company.quantity});
      onNext('w3');return true;
    }catch(e){notice=e.message;throw e;}finally{busy=false;changed();}
  }
  persist();
  return{snapshot,edit,recover,confirm,get state(){return{key,busy};},dispose(){disposed=true;}};
}
