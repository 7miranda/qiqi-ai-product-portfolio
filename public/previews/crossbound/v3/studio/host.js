import {createStudioSession,studioKey} from './session.js';

export function mountStudio({store,onExit,onNext}) {
  if(store.snapshot()?.company?.stage!==3)throw Error('请先完成本轮定价与备货。');
  const previousFocus=document.activeElement,root=document.createElement('section'),frame=document.createElement('iframe');
  root.id='v3-studio';root.style.cssText='position:fixed;inset:0;z-index:90;background:#03080b';
  frame.title='商品页工作室';frame.style.cssText='display:block;width:100%;height:100%;border:0';
  const channel='crossbound-studio-v1',origin=location.origin;
  let disposed=false,ready=false,last='',error='',timer;
  let resolveMounted;const mountedReady=new Promise(resolve=>{resolveMounted=resolve;});
  let storage;try{storage=localStorage;}catch{}
  const session=createStudioSession({store,storage,onChange:send,onNext});
  function send(){if(disposed||!ready||store.snapshot()?.company?.stage!==3)return;const model=session.snapshot();if(!model)return;model.notice=error||model.notice;const signature=JSON.stringify(model);if(signature!==last){last=signature;frame.contentWindow?.postMessage({channel,type:'model',model},origin);}}
  function exit(){if(!session.state.busy)onExit?.();}
  async function message(event){
    if(disposed||event.source!==frame.contentWindow||event.origin!==origin||event.data?.channel!==channel)return;
    const {type,key,id,value}=event.data;
    if(type==='ready'){ready=true;last='';send();return;}
    if(type==='mounted'){resolveMounted();clearTimeout(timer);root.querySelector('button')?.remove();frame.focus();return;}
    if(type==='exit'){exit();return;}
    try{error='';if(type==='recover')session.recover();else if(type==='pick')session.pick(key,id);else if(type==='reuse')session.reuse(value===true);else if(type==='optimize')session.optimize();else if(type==='confirm')await session.confirm();}catch(e){error=e.message;send();}
  }
  const off=store.subscribe(s=>{if(disposed)return;if(studioKey(s)!==session.state.key||s.company.stage!==3){onExit?.();return;}send();});
  const url=new URL('./viewer.html',import.meta.url),version=new URL(import.meta.url).searchParams.get('v');if(version)url.searchParams.set('v',version);
  addEventListener('message',message);frame.src=url.href;root.append(frame);document.body.append(root);
  timer=setTimeout(()=>{if(disposed)return;const back=document.createElement('button');back.textContent='工作室暂未加载，返回园区重试';back.style.cssText='position:absolute;top:24px;left:24px;padding:14px;color:#c4f53a;background:#081418;border:1px solid #3fd0e0';back.onclick=exit;root.append(back);},15000);
  return {element:root,focus(){frame.focus();},id:'w3',ready:mountedReady,dispose(){if(disposed)return;disposed=true;resolveMounted();clearTimeout(timer);off();session.dispose();removeEventListener('message',message);root.remove();previousFocus?.focus?.({preventScroll:true});}};
}
