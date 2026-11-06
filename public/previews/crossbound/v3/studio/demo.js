import {engine} from './demo-engine.js';
import {createStudioSession} from './session.js';
const ids=['fan','earbuds','lamp','bottle','speaker','living'],frame=document.querySelector('iframe'),nav=document.querySelector('nav'),notice=document.querySelector('#notice');
let company,draft,session,ready=false,active='fan';
const listeners=new Set(),memory=new Map(),saves=new Map();
const storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
const actions={setListing(input){draft={...input};notify();},publishListing(){company=engine.publish(company,draft);notify();},setCompany(c){company=c;notify();}};
const store={snapshot:()=>({company,draft:{listing:draft},engine,actions,market:engine.markets.find(m=>m.id===company.marketId)}),waitFor:async fn=>fn(store.snapshot())?store.snapshot():null,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};
function notify(){for(const fn of listeners)fn(store.snapshot());send();}
function send(){if(ready&&session)frame.contentWindow.postMessage({channel:'crossbound-studio-v1',type:'model',model:session.snapshot()},location.origin);}
function message(text){notice.replaceChildren(document.createTextNode(text));const b=document.createElement('button');b.textContent='继续体验工作室';b.onclick=()=>{notice.className='';frame.focus();};notice.append(b);notice.className='show';}
function open(id,reset=false){
  if(company){saves.set(active,{company,draft,stored:memory.get('crossbound-studio-draft-v1')});session.dispose();}
  active=id;const p=engine.products.find(p=>p.id===id),saved=!reset&&saves.get(id);
  company=saved?.company||{...engine.create(20261103),stage:3,marketId:'singapore',visitedMarkets:['singapore'],productId:id,price:p.basePrice,quantity:600,cash:12640};draft=saved?.draft||{};
  memory.clear();if(saved?.stored)memory.set('crossbound-studio-draft-v1',saved.stored);
  session=createStudioSession({store,storage,onChange:send,onNext:()=>message('商品页已发布，已扣除本次制作费。正式游戏会在这里进入推广室；你可以继续切换商品查看效果。')});
  nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));notice.className='';send();
}
for(const id of ids){const b=document.createElement('button');b.dataset.id=id;b.textContent=engine.products.find(p=>p.id===id).name;b.onclick=()=>open(id);nav.append(b);}
document.querySelector('#reset').onclick=()=>open(active,true);
addEventListener('message',async event=>{if(event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.channel!=='crossbound-studio-v1')return;const {type,key,id,value}=event.data;try{if(type==='ready'){ready=true;send();}else if(type==='pick')session.pick(key,id);else if(type==='reuse')session.reuse(value);else if(type==='optimize')session.optimize();else if(type==='confirm')await session.confirm();else if(type==='exit')message('预览选择已保留。正式游戏会在这里返回园区地图；切换上方商品可以比较不同主图。');}catch(e){message(e.message);}});
open(active);
// The iframe may have sent ready before this engine module completed loading.
frame.addEventListener('load',()=>{ready=true;send();});ready=true;send();
