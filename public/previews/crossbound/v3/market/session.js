import { cashFailure } from '../../v2/recovery.js';
import { PLATFORMS } from '../../v2/catalog.js';

const CODES = {'singapore':'SIN','london':'LON','los-angeles':'LAX','berlin':'BER','paris':'PAR','tokyo':'TYO','sydney':'SYD','toronto':'YYZ','dubai':'DXB','mexico-city':'MEX','sao-paulo':'GRU','amsterdam':'AMS'};
const PLATFORM_CODES = {tiktok:'TTS',amazon:'AMZ',direct:'DTC'};
export const marketRoundKey = s => s?.company ? `${s.company.runSeed}:${s.company.round}${s.company.attempt?':retry'+s.company.attempt:''}` : null;

// Only coordinates and presentation codes belong to the scene. All money, capacity,
// eligibility and confirmation come from the existing engine and its React actions.
export function createMarketSession({store,onChange=()=>{},onNext=()=>{}}) {
  const initial=store.snapshot(),key=marketRoundKey(initial);
  let market=initial?.choice?.id,platform=initial?.engine?.config(initial.company)?.platform||'tiktok';
  let busy=false,disposed=false,notice='',completed=false;
  const current=()=>!disposed&&!completed&&marketRoundKey(store.snapshot())===key&&store.snapshot()?.company?.stage===0;
  const blocked=(c,id)=>!!c.carryEffect?.newMarket&&c.carryEffect.previousMarket===id;
  function requireCurrent(){if(!current())throw Error('本轮市场状态已变化，请返回园区重新进入。');}
  function snapshot(){
    const s=store.snapshot(),c=s?.company,e=s?.engine;
    if(!c||!e)return null;
    const markets=e.options(c,'markets');
    if(!markets.some(m=>m.id===market&&!blocked(c,m.id)))market=markets.find(m=>!blocked(c,m.id))?.id||null;
    const draft=e.configure(c,{platform});
    const productId=c.productId||c.history?.at(-1)?.productId||e.products[0]?.id;
    const rows=markets.map(m=>{
      let forecast;try{forecast=e.simulate({...draft,marketId:m.id,productId},'mean');}catch{}
      return {id:m.id,code:CODES[m.id]||m.id.slice(0,3).toUpperCase(),name:m.name,region:m.region,lat:m.lat,lon:m.lng,
        fee:c.visitedMarkets.includes(m.id)?0:m.launchCost,entered:c.visitedMarkets.includes(m.id),
        visits:forecast?.visitors??0,cap:forecast?.capacity??0,desc:m.summary||'',disabled:blocked(c,m.id)};
    });
    const platforms=PLATFORMS.map(p=>{
      const cost=p.id==='direct'&&c.v2?.openedPlatforms?.includes('direct')?0:p.entry;
      const terms=p.id==='tiktok'?`佣金 ${Math.round(p.fee*100)}% · 零入驻 · 内容和达人触达更好`:p.id==='amazon'?`佣金 ${Math.round(p.fee*100)}% + 每轮 $${p.entry} · 购买意愿 ×${p.conversion}`:`一次建站 $${p.entry} · 无佣金 · 初期流量 ×${p.traffic}`;
      const note=p.id==='direct'&&cost===0?'已建站 · 不再收建站费':p.id==='amazon'?'店铺费每轮都收':cost?`本轮先付 $${cost}`:'不用先付钱';
      return {id:p.id,code:PLATFORM_CODES[p.id],name:p.name,tag:{tiktok:'内容电商',amazon:'货架电商',direct:'自建品牌站'}[p.id],terms,note,cost,sub:({tiktok:'内容与达人',amazon:'货架与仓配',direct:'自有流量'}[p.id])+` · 本轮 $${cost}`};
    });
    const quote=market?e.preview(draft,{id:market}):null;
    const reason=!current()?'本轮状态已变化':!market?'本轮暂无可选市场':blocked(c,market)?'跨区试销：本轮必须换市场':quote?.affordable===false?(quote.cashShortfall>0?`现金不足，还差 $${quote.cashShortfall.toLocaleString('en-US')}`:'当前方案无法执行，请重新选择'):!quote?'方案暂不可用':'';
    return {key,round:c.round,cash:c.cash,markets:rows,platforms,marketIndex:rows.findIndex(m=>m.id===market),platformIndex:platforms.findIndex(p=>p.id===platform),cost:Math.max(0,-(quote?.cashDelta||0)),canConfirm:current()&&!!quote?.affordable&&!busy,canRecover:current()&&!busy&&!!cashFailure(c,quote),busy,notice:notice||reason};
  }
  function recover(){requireCurrent();if(busy)return false;const s=store.snapshot(),draft=s.engine.configure(s.company,{platform});return s.actions.recover?.(s.engine.preview(draft,{id:market}))||false;}
  function changed(){if(!disposed)onChange(snapshot());}
  function pickMarket(id){requireCurrent();if(busy)return false;const s=store.snapshot();if(!s.engine.options(s.company,'markets').some(m=>m.id===id)||blocked(s.company,id))throw Error('跨区试销：请选择另一个可进入的市场。');market=id;notice='';changed();return true;}
  function pickPlatform(id){requireCurrent();if(busy)return false;if(!PLATFORMS.some(p=>p.id===id))throw Error('请选择有效的开店平台。');platform=id;notice='';changed();return true;}
  async function confirm(){
    requireCurrent();if(busy)return false;
    const reviewed=snapshot();if(reviewed.canRecover&&recover())return false;if(!reviewed.canConfirm)throw Error(reviewed.notice||'当前方案无法执行。');
    busy=true;notice='正在确认市场与平台…';changed();
    const same=s=>marketRoundKey(s)===key&&s.company?.stage===0;
    try{
      let s=store.snapshot();
      if(s.engine.config(s.company).platform!==platform){
        s.actions.setCompany(s.engine.configure(s.company,{platform}));
        const configured=await store.waitFor(s=>same(s)&&s.engine.config(s.company).platform===platform,1500);
        if(!configured)throw Error('平台选择未能保存，请重试。');
      }
      requireCurrent();s=store.snapshot();s.actions.select(market);
      const selected=await store.waitFor(s=>same(s)&&s.choice?.id===market,1500);
      requireCurrent();if(!selected)throw Error('市场选择未能保存，请重试。');
      // Selection/configuration publish asynchronously. Revalidate the live quote immediately before committing.
      s=store.snapshot();const quote=s.engine.preview(s.company,{id:market});
      if(s.engine.config(s.company).platform!==platform||!quote?.affordable||blocked(s.company,market))throw Error('方案或现金已变化，请重新核对后确认。');
      if(Math.max(0,-quote.cashDelta)!==reviewed.cost)throw Error('进入费用已变化，请查看更新后的费用再确认。');
      s.actions.commit();
      const after=await store.waitFor(s=>marketRoundKey(s)===key&&s.company?.stage!==0,2500);
      if(disposed||!after||after.company.stage!==1||after.company.marketId!==market||after.engine.config(after.company).platform!==platform)throw Error('市场确认未完成，请检查当前经营状态。');
      completed=true;notice='';store.send?.('world_complete',{world:'w0',market,platform});onNext('w1');return true;
    }catch(error){notice=error.message;throw error;}finally{busy=false;changed();}
  }
  return {snapshot,pickMarket,pickPlatform,confirm,recover,get state(){return{key,market,platform,busy,completed};},get current(){return current();},refresh:changed,dispose(){disposed=true;}};
}
