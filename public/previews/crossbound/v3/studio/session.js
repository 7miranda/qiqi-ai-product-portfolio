import { cashFailure } from '../../v2/recovery.js';
import { PLATFORMS } from '../../v2/catalog.js';

export const BENCHES = [
  {key:'title',no:'A',name:'标题台',hint:'标题写什么',options:[['name','只写商品名','先让买家知道卖的是什么'],['use','补充使用场景','把用途说明放进标题'],['specs','写清关键规格','标题里看到两项规格']]},
  {key:'image',no:'B',name:'主图台',hint:'主图怎么拍',options:[['product','完整商品','棚拍图展示整体外观'],['focus','放大主体','聚焦商品，保持原图比例'],['annotated','主图配规格','把规格标在商品旁边']]},
  {key:'detail',no:'C',name:'详情台',hint:'详情讲什么',options:[['summary','说明用途','告诉买家可以用来做什么'],['specs','补齐规格','用途之外再列出规格'],['complete','说明包装内容','规格与包装内容一起讲清']]},
];
export const studioKey = s => s?.company ? `${s.company.runSeed}:${s.company.round}${s.company.attempt?':retry'+s.company.attempt:''}:${s.company.productId}` : null;
const selection = (picks,mode='build') => ({rule:'listing-v1',mode,...Object.fromEntries(BENCHES.map(b=>[b.key+'Id',picks[b.key]||b.options[0][0]]))});
const unpack = input => Object.fromEntries(BENCHES.map(b=>[b.key,b.options.some(o=>o[0]===input?.[b.key+'Id'])?input[b.key+'Id']:null]));

// The scene holds only an uncommitted draft. Money and scores always come from the game.
export function createStudioSession({store,storage,onChange=()=>{},onNext=()=>{}}) {
  const key=studioKey(store.snapshot()),storageKey='crossbound-studio-draft-v1';
  let saved;try{saved=JSON.parse(storage?.getItem(storageKey)||'null');}catch{}
  const initial=store.snapshot(),existing=initial.company.currentListing;
  let picks=existing?unpack(existing.selection):unpack(initial.draft?.listing);
  if(saved?.key===key&&!existing)picks=Object.fromEntries(BENCHES.map(b=>[b.key,saved.picks?.[b.key]&&b.options.some(o=>o[0]===saved.picks[b.key])?saved.picks[b.key]:null]));
  let mode=existing?.reused?'reuse':saved?.key===key&&saved.mode==='reuse'?'reuse':'build';
  let busy=false,disposed=false,notice='';
  const current=()=>!disposed&&studioKey(store.snapshot())===key&&store.snapshot()?.company?.stage===3;
  function requireCurrent(){if(!current())throw Error('本轮商品状态已变化，请返回园区重新进入。');}
  function persist(){try{storage?.setItem(storageKey,JSON.stringify({key,picks,mode}));}catch{}}
  function changed(){if(!disposed)onChange();}
  function snapshot(){
    const s=store.snapshot(),c=s?.company,e=s?.engine,p=e?.products.find(p=>p.id===c?.productId);
    if(!p)return null;
    const asset=c.listingAssets?.[p.id];if(mode==='reuse'&&!asset)mode='build';
    const activePicks=mode==='reuse'&&asset?unpack(asset.selection):picks;
    const input=selection(activePicks,mode),quote=c.currentListing||e.listingQuote(c,input);
    const base=e.listingQuote(c,selection({}));
    const missing=mode==='reuse'?[]:BENCHES.filter(b=>!picks[b.key]).map(b=>b.name);
    const cost=quote?.cost??0,short=Math.max(0,cost-c.cash);
    const benches=BENCHES.map(b=>({...b,options:b.options.map(([id,label,detail])=>{
      const alt=e.listingQuote(c,selection({...picks,[b.key]:id}));
      const points=e.listingQuote(c,selection({[b.key]:id}));
      return [id,label,detail,Math.max(0,(points?.score??60)-(base?.score??60)),alt?.cost??0];
    })}));
    const price=c.price??s.draft?.price??p.basePrice;
    return {key,round:c.round,cash:c.cash,quantity:c.quantity??0,market:s.market?.name||e.markets?.find(m=>m.id===c.marketId)?.name||'',
      platform:PLATFORMS.find(p=>p.id===e.config?.(c)?.platform)?.name||'',product:{id:p.id,name:p.name,price,sp:p.sellingPoint||'',specs:p.specs||[],pack:p.packing||'',category:p.categoryLabel||'',image:`../../assets/showroom/images/${encodeURIComponent(p.id)}.png`},
      picks:activePicks,mode,benches,score:quote?.score??60,cost,intent:quote?.conversionFactor??.75,published:!!c.currentListing,busy,
      hasAsset:!!asset&&!c.currentListing,assetScore:asset?.baseScore??asset?.score,canOptimize:!!asset&&!c.currentListing&&(asset.baseScore??asset.score)<95&&c.cash>=300&&!(c.listingInvestments||[]).some(x=>x.round===c.round&&x.productId===p.id),
      canRecover:current()&&!busy&&!c.currentListing&&!!cashFailure(c,quote),
      canConfirm:current()&&!busy&&(!!c.currentListing||(!missing.length&&!!quote&&!short)),
      notice:notice||(!current()?'本轮状态已变化':busy?'正在保存商品页…':c.currentListing?'商品页已锁定，可以进入推广室':missing.length?'还差：'+missing.join('、'):short?`现金不够，还差 $${short.toFixed(2)}`:mode==='reuse'?(cost?'沿用已有商品页，仅收本地化费':'沿用已有商品页，本市场免费'):'三个工作台已就绪，发布后锁定本轮商品页')};
  }
  function recover(){requireCurrent();if(busy)return false;const s=store.snapshot(),model=snapshot();return !model.published&&(s.actions.recover?.({cost:model.cost})||false);}
  function pick(bench,id){requireCurrent();if(busy||store.snapshot().company.currentListing)return false;const b=BENCHES.find(b=>b.key===bench);if(!b?.options.some(o=>o[0]===id))throw Error('无效的商品页选项。');mode='build';picks={...picks,[bench]:id};notice='';persist();changed();return true;}
  function reuse(value){requireCurrent();if(busy||store.snapshot().company.currentListing)return false;if(value&&!snapshot().hasAsset)throw Error('这件商品还没有已存商品页。');mode=value?'reuse':'build';notice='';persist();changed();return true;}
  function optimize(){requireCurrent();if(busy||!snapshot().canOptimize)return false;const s=store.snapshot();s.actions.setCompany(s.engine.optimize(s.company));changed();return true;}
  async function confirm(){
    requireCurrent();if(busy)return false;
    if(store.snapshot().company.currentListing){onNext('w4');return true;}
    const reviewed=snapshot();if(reviewed.canRecover&&recover())return false;if(!reviewed.canConfirm)throw Error(reviewed.notice);
    busy=true;notice='';changed();
    try{
      const input=selection(reviewed.picks,mode);store.snapshot().actions.setListing(input);
      const draft=await store.waitFor(s=>studioKey(s)===key&&Object.entries(input).every(([k,v])=>s.draft?.listing?.[k]===v),1500);
      requireCurrent();if(!draft)throw Error('商品页选项未保存，请重试。');
      const s=store.snapshot(),q=s.engine.listingQuote(s.company,input);
      if(s.company.currentListing)return true;
      if(!q||q.cost>s.company.cash||q.cost!==reviewed.cost||q.score!==reviewed.score)throw Error('报价或现金已变化，请核对后重新发布。');
      s.actions.publishListing();
      const after=await store.waitFor(s=>studioKey(s)===key&&!!s.company.currentListing,2500);
      if(disposed||!after)throw Error('发布尚未确认，请查看当前状态后重试。');
      store.send?.('world_complete',{world:'w3',product:after.company.productId,score:after.company.currentListing.score});
      return true;
    }catch(error){notice=error.message;throw error;}finally{busy=false;changed();}
  }
  return {snapshot,pick,reuse,optimize,confirm,recover,get state(){return{key,busy};},dispose(){disposed=true;}};
}
