import {createPromotionSession,promotionKey} from './session.js';
export function mountPromotion({store,onExit,onNext}){
 if(store.snapshot()?.company?.stage!==3||!store.snapshot()?.company?.currentListing)throw Error('请先发布本轮商品页。');
 const previous=document.activeElement,root=document.createElement('section'),frame=document.createElement('iframe');root.id='v3-promotion';root.style.cssText='position:fixed;inset:0;z-index:90;background:#060d10';frame.title='推广室';frame.style.cssText='display:block;width:100%;height:100%;border:0';
 let disposed=false,ready=false,last='',error='',resolveReady;const mounted=new Promise(r=>resolveReady=r),channel='crossbound-promotion-game-v1',origin=location.origin;let storage;try{storage=localStorage}catch{}
 const session=createPromotionSession({store,storage,onChange:send,onNext});
 function send(){if(disposed||!ready||store.snapshot()?.company?.stage!==3)return;const model=session.snapshot();if(!model)return;if(error)model.notice=error;const signature=JSON.stringify(model);if(signature!==last){last=signature;frame.contentWindow?.postMessage({channel,type:'model',model},origin)}}
 async function message(e){if(disposed||e.source!==frame.contentWindow||e.origin!==origin||e.data?.channel!==channel)return;const d=e.data;if(d.type==='ready'){ready=true;send();return}if(d.type==='mounted'){resolveReady();frame.focus();return}if(d.type==='exit'){if(!session.state.busy)onExit?.();return}try{error='';if(d.type==='recover')session.recover();else if(d.type==='draft')session.update(d.draft);else if(d.type==='invite')session.invite();else if(d.type==='confirm')await session.confirm();}catch(e){error=e.message;send()}}
 const off=store.subscribe(s=>{if(disposed)return;if(session.state.busy)return;if(promotionKey(s)!==session.state.key||s.company.stage!==3||!s.company.currentListing){onExit?.();return}send()});
 addEventListener('message',message);const url=new URL('./viewer.html',import.meta.url);const v=new URL(import.meta.url).searchParams.get('v');if(v)url.searchParams.set('v',v);frame.src=url.href;root.append(frame);document.body.append(root);
 return {element:root,focus(){frame.focus();},id:'w4',ready:mounted,dispose(){disposed=true;resolveReady();off();session.dispose();removeEventListener('message',message);root.remove();previous?.focus?.({preventScroll:true})}};
}
