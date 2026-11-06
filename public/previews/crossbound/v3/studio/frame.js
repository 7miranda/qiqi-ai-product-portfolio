(()=>{
  const channel='crossbound-studio-v1',origin=location.origin;
  let booted=false;
  const send=(type,extra={})=>{if(parent!==window)parent.postMessage({channel,type,...extra},origin);};
  window.CrossboundStudio={send};
  addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==origin||event.data?.channel!==channel||event.data.type!=='model')return;
    const model=event.data.model;if(!model?.product?.id||!Array.isArray(model.benches))return;
    window.studioModel=model;
    if(window.studioComponent){window.studioComponent.applyView(model);return;}
    if(booted)return;booted=true;document.getElementById('studio-loading')?.remove();
    const script=document.createElement('script');script.src='../market/vendor/support.js'+location.search;script.onerror=()=>{document.body.insertAdjacentHTML('beforeend','<p style="color:#c4f53a;padding:40px">工作室加载失败，请返回园区重试。</p>');};document.body.append(script);
  });
  send('ready');
})();
