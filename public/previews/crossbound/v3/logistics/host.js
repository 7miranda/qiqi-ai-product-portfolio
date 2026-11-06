import {createLogisticsSession,logisticsKey} from './session.js';
export function mountLogistics({store,onExit,onNext}){
  if(store.snapshot()?.company?.stage!==4)throw Error('请先完成推广，再进入物流仓。');
  const root=document.createElement('section'),frame=document.createElement('iframe'),previous=document.activeElement;
  root.id='v3-logistics';root.style.cssText='position:fixed;inset:0;z-index:90;background:#03080b';
  frame.title='物流仓 · 头程运输与出仓履约';frame.style.cssText='display:block;width:100%;height:100%;border:0';
  const channel='crossbound-logistics-v1',origin=location.origin;let ready=false,disposed=false,last='',timer;
  let resolve;const mounted=new Promise(r=>resolve=r);let storage;try{storage=localStorage;}catch{}
  const session=createLogisticsSession({store,storage,onChange:send});
  const post=data=>{if(!disposed)frame.contentWindow?.postMessage({channel,...data},origin);};
  function send(){if(!ready||disposed)return;const model=session.snapshot(),signature=JSON.stringify(model);if(signature!==last){last=signature;post({type:'model',model});}}
  async function message(e){
    if(disposed||e.source!==frame.contentWindow||e.origin!==origin||e.data?.channel!==channel)return;
    const {type,key,request,kind,index}=e.data;
    if(type==='ready'){ready=true;last='';send();return;}
    if(type==='mounted'){clearTimeout(timer);resolve();frame.focus();return;}
    if(key!==session.state.key)return;
    try{
      let result=true;
      if(type==='exit'){if(!session.state.busy)onExit?.();return;}
      if(type==='next'){if(store.snapshot().company.stage===5)onNext?.('w6');return;}
      if(type==='pick')result=session.pick(kind,index);
      else if(type==='route')result=await session.confirmRoute();
      else if(type==='dispatch')result=await session.dispatch();else return;
      post({type:'result',request,ok:result,model:session.snapshot()});
    }catch(error){post({type:'result',request,ok:false,error:error.message,model:session.snapshot()});}
  }
  const off=store.subscribe(s=>{if(disposed)return;if(logisticsKey(s)!==session.state.key||![4,5].includes(s.company.stage)){onExit?.();return;}send();});
  const url=new URL('./viewer.html',import.meta.url),version=new URL(import.meta.url).searchParams.get('v');if(version)url.searchParams.set('v',version);
  addEventListener('message',message);frame.src=url.href;root.append(frame);document.body.append(root);
  timer=setTimeout(()=>{if(disposed)return;const b=document.createElement('button');b.textContent='场景加载未完成 · 返回园区';b.style.cssText='position:absolute;top:20px;left:20px;padding:14px;background:#081418;color:#c4f53a;border:1px solid #3fd0e0';b.onclick=()=>onExit?.();root.append(b);},15000);
  return{element:root,suspend(){frame.contentWindow?.postMessage({channel,type:'suspend'},origin);},focus(){frame.focus();},id:'w5',ready:mounted,dispose(){if(disposed)return;disposed=true;resolve();clearTimeout(timer);off();session.dispose();removeEventListener('message',message);frame.contentWindow?.postMessage({channel,type:'dispose'},origin);root.remove();previous?.focus?.({preventScroll:true});}};
}
