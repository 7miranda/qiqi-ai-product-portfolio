// Keep the visible room until its successor has rendered. Cancellation owns both
// rooms, so a slow mount or old callback can never resurrect an abandoned step.
export function createSceneTransition({load,mount,onPending=()=>{},onReady=()=>{},onError=()=>{},onClear=()=>{},paint=()=>Promise.resolve(),reveal=()=>Promise.resolve(),timeoutMs=15000}) {
  let generation=0,active=null,incoming=null,pending=null;
  function discard(entry){entry?.scene.dispose();}
  function cancelIncoming(){pending?.abort.abort();pending=null;const old=incoming;incoming=null;discard(old);}
  async function bounded(work,signal){
    let timer,abort;
    try{return await Promise.race([work,new Promise((_,reject)=>{
      abort=()=>reject(Error('场景切换已取消'));
      if(signal.aborted)return abort();
      signal.addEventListener('abort',abort,{once:true});
      timer=setTimeout(()=>reject(Error('场景加载超时')),timeoutMs);
    })]);}finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }
  function close(){generation++;cancelIncoming();const old=active;active=null;try{discard(old);}finally{onClear();}}
  function open(id){
    if(pending?.id===id)return pending.promise;
    if(!pending&&active?.id===id&&!active.suspended){active.scene.focus?.();return Promise.resolve(true);}
    const token=++generation,current=()=>token===generation;
    cancelIncoming();
    if(active){active.suspended=true;active.scene.suspend?.();}
    const request={id,promise:null,abort:new AbortController()};pending=request;
    onPending(id);
    request.promise=(async()=>{
      try{
        const module=await bounded(load(id),request.abort.signal);if(!current())return false;
        const handlers={onExit:()=>{if(current())close();},onNext:next=>{if(current())return next?open(next):close();}};
        const scene=mount(id,module,handlers);
        if(!current()){scene.dispose();return false;}
        incoming={id,scene};
        await bounded(scene.ready||Promise.resolve(),request.abort.signal);if(!current())return false;
        await bounded(paint(),request.abort.signal);if(!current())return false;
        await bounded(reveal(scene,active?.scene,request.abort.signal),request.abort.signal);if(!current())return false;
        const old=active;active=incoming;incoming=null;pending=null;discard(old);
        onReady(id);scene.focus?.();return true;
      }catch(error){
        if(!current())return false;
        cancelIncoming();onError(id,error);return false;
      }
    })();
    return request.promise;
  }
  return {open,close,get scene(){return active?.scene||null;},get id(){return active?.id||null;},get opening(){return !!pending;}};
}

// An outgoing room stays visible but cannot observe the next step or mutate it.
export function createSceneScope(store){
  let live=true,last=store.snapshot();
  function snapshot(){
    if(live)last=store.snapshot();
    if(!last)return last;
    return {...last,actions:new Proxy(last.actions||{},{get:(actions,key)=>typeof actions[key]==='function'?(...args)=>live?actions[key](...args):undefined:actions[key]})};
  }
  return {store:{...store,snapshot,get dialogOpen(){return !live||store.dialogOpen;},subscribe:fn=>store.subscribe(()=>{if(live)fn(snapshot());}),waitFor:async(test,ms)=>{const value=await store.waitFor(s=>!live||test(s),ms);return live?value:null;},send:(...args)=>{if(live)store.send(...args);}},suspend(){if(live){last=store.snapshot();live=false;}}};
}
