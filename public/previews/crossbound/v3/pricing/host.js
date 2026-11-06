import {createPricingSession,pricingKey} from './session.js';

export function mountPricing({store,quality='high',onExit,onNext}){
  const previousFocus=document.activeElement,root=document.createElement('section'),frame=document.createElement('iframe');
  root.id='v3-pricing';root.style.cssText='position:fixed;inset:0;z-index:90;background:#081217';
  frame.title='定价财务室';frame.style.cssText='display:block;width:100%;height:100%;border:0';
  const channel='crossbound-pricing-v1',origin=location.origin;
  let disposed=false,ready=false,last='',error='',timer,resolveMounted,rejectMounted;
  const mounted=new Promise((resolve,reject)=>{resolveMounted=resolve;rejectMounted=reject;});
  let storage;try{storage=localStorage;}catch{}
  const session=createPricingSession({store,storage,onChange:send,onNext});
  function send(){
    if(disposed||!ready||store.snapshot()?.company?.stage!==2)return;const model=session.snapshot();if(!model)return;
    model.notice=error||model.notice;model.blocked=!!store.snapshot().view&&store.snapshot().view!=='decision';model.quality=quality;
    const signature=JSON.stringify(model);if(signature!==last){last=signature;frame.contentWindow?.postMessage({channel,type:'model',model},origin);}
  }
  async function message(event){
    if(disposed||event.source!==frame.contentWindow||event.origin!==origin||event.data?.channel!==channel)return;
    const {type,key,field,value}=event.data;
    if(type==='ready'){ready=true;last='';send();return;}
    if(type==='mounted'){clearTimeout(timer);resolveMounted();frame.focus();return;}
    if(type==='failed'){rejectMounted(Error('定价财务室未能载入，请重试。'));return;}
    if(key!==session.state.key||store.dialogOpen||session.state.busy)return;
    if(type==='exit'){onExit?.();return;}
    try{
      error='';
      if(type==='edit')session.edit(field,value);
      else if(type==='confirm')await session.confirm(event.data.review);
      else if(type==='recover')session.recover();
      else if(type==='funding')store.snapshot().actions.panel('funding');
    }catch(e){error=e.message;send();}
  }
  const off=store.subscribe(s=>{
    if(disposed)return;
    if(pricingKey(s)!==session.state.key){onExit?.();return;}
    if(s.company.stage!==2){if(!session.state.busy)s.company.stage===3?onNext?.('w3'):onExit?.();return;}
    send();
  });
  const url=new URL('./viewer.html',import.meta.url);url.searchParams.set('v',new URL(import.meta.url).searchParams.get('v')||'pricing-1');
  addEventListener('message',message);frame.src=url.href;root.append(frame);document.body.append(root);
  timer=setTimeout(()=>rejectMounted(Error('定价财务室加载超时。')),20000);
  return {element:root,suspend(){frame.contentWindow?.postMessage({channel,type:'suspend'},origin);},focus(){frame.focus();},id:'w2',ready:mounted,dispose(){if(disposed)return;disposed=true;clearTimeout(timer);resolveMounted();off();session.dispose();removeEventListener('message',message);frame.contentWindow?.postMessage({channel,type:'dispose'},origin);root.remove();previousFocus?.focus?.({preventScroll:true});}};
}
