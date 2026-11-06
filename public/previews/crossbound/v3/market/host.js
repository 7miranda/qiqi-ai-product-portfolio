import {createMarketSession,marketRoundKey} from './session.js';

// The approved Claude component keeps its own renderer/React runtime in an isolated
// same-origin frame. This adapter is the only path from the scene to game mutations.
export function mountMarket({store,onExit,onNext}) {
  if(store.snapshot()?.company?.stage!==0)throw Error('市场选择只在本轮开始时开放。');
  const previousFocus=document.activeElement,root=document.createElement('section');
  root.id='v3-market';root.setAttribute('aria-label','市场研究所');
  root.style.cssText='position:fixed;inset:0;z-index:90;background:#081216';
  const frame=document.createElement('iframe');frame.title='市场研究所 · 选择市场与平台';
  frame.style.cssText='display:block;border:0;width:100%;height:100%;background:#081216';
  const version=new URL(import.meta.url).searchParams.get('v');
  const url=new URL('./viewer.html',import.meta.url);if(version)url.searchParams.set('v',version);
  let disposed=false,ready=false,mounted=false,last='',error='',timer;
  let resolveMounted,rejectMounted;const mountedReady=new Promise((resolve,reject)=>{resolveMounted=resolve;rejectMounted=reject;});
  const origin=location.origin,channel='crossbound-market-v1';
  const session=createMarketSession({store,onChange:send,onNext});
  function send(){if(disposed||!ready||store.snapshot()?.company?.stage!==0)return;const model=session.snapshot();if(!model)return;model.notice=error||model.notice;const signature=JSON.stringify(model);if(signature===last)return;last=signature;frame.contentWindow?.postMessage({channel,type:'model',model},origin);}
  function exit(){if(!session.state.busy)onExit?.();}
  async function message(event){
    if(disposed||event.source!==frame.contentWindow||event.origin!==origin||event.data?.channel!==channel)return;
    const {type,id}=event.data;
    if(type==='ready'){ready=true;last='';send();return;}
    if(type==='mounted'){resolveMounted();mounted=true;clearTimeout(timer);root.querySelector('button')?.remove();return;}
    if(type==='failed'){rejectMounted(Error('市场场景未能加载'));return;}
    if(type==='exit'){exit();return;}
    try{
      error='';
      if(type==='recover')session.recover();
      else if(type==='market')session.pickMarket(id);
      else if(type==='platform')session.pickPlatform(id);
      else if(type==='confirm')await session.confirm();
    }catch(e){error=e.message;send();}
  }
  const off=store.subscribe(s=>{
    if(disposed)return;
    if(marketRoundKey(s)!==session.state.key){onExit?.();return;}
    if(s?.company?.stage!==0&&!session.state.busy&&!session.state.completed){onExit?.();return;}
    send();
  });
  addEventListener('message',message);
  frame.src=url.href;root.append(frame);document.body.append(root);
  // A stalled frame leaves an explicit way to return; it never silently commits or falls through.
  timer=setTimeout(()=>{if(disposed||mounted)return;const fallback=document.createElement('button');fallback.textContent='市场空间暂未加载，返回园区重试';fallback.style.cssText='position:absolute;top:24px;left:24px;padding:14px;color:#c6f432;border:1px solid #3fd0d8;background:#081216';fallback.onclick=exit;root.append(fallback);},15000);
  return {element:root,suspend(){frame.contentWindow?.postMessage({channel,type:'suspend'},origin);},focus(){frame.focus();},id:'w0',ready:mountedReady,dispose(){if(disposed)return;disposed=true;resolveMounted();clearTimeout(timer);off();session.dispose();removeEventListener('message',message);root.remove();previousFocus?.focus?.({preventScroll:true});}};
}
