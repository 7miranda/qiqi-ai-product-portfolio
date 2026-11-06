// The same forward movement as the in-room camera transitions. Both real
// scenes overlap; no screenshot, blank interstitial or artificial loading delay.
export function stageScene(scene){
  const el=scene.element;
  if(!el)return;
  el.dataset.sceneLayer='incoming';el.inert=true;
  Object.assign(el.style,{opacity:'0',transform:'none',zIndex:'102',transition:'none'});
}
export async function revealScene(scene,previous,signal){
  const el=scene.element,old=previous?.element;
  if(!el||signal.aborted)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration=reduced?100:680,easing='cubic-bezier(.22,.8,.25,1)';
  const animations=[];
  if(!reduced&&old)animations.push(old.animate([{transform:'scale(1)',opacity:1},{transform:'scale(1.065)',opacity:1}],{duration,easing,fill:'both'}));
  animations.push(el.animate(reduced?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'scale(.965)'},{opacity:1,offset:.7},{opacity:1,transform:'scale(1)'}],{duration,easing,fill:'both'}));
  const cancel=()=>animations.forEach(a=>a.cancel());signal.addEventListener('abort',cancel,{once:true});
  try{
    await Promise.all(animations.map(a=>a.finished.catch(()=>{})));
    if(!signal.aborted){el.dataset.sceneLayer='active';el.style.opacity='1';el.inert=false;}
  }finally{signal.removeEventListener('abort',cancel);cancel();}
}
