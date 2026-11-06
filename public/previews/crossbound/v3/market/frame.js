// The frame accepts data only from the game window that created it, on this origin.
(()=>{
  const channel='crossbound-market-v1',origin=location.origin;
  let booted=false;
  const send=(type,extra={})=>{if(parent!==window)parent.postMessage({channel,type,...extra},origin);};
  window.CrossboundMarket={send};
  addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==origin||event.data?.channel!==channel||event.data.type!=='model')return;
    const model=event.data.model;if(!model||!Array.isArray(model.markets)||!model.markets.length||!Array.isArray(model.platforms)||model.platforms.length!==3)return;
    window.marketModel=model;
    if(window.marketComponent){window.marketComponent.applyView(model);return;}
    if(booted)return;booted=true;
    document.getElementById('market-loading')?.remove();
    const script=document.createElement('script');script.src='./vendor/support.js'+location.search;script.onerror=()=>{document.body.insertAdjacentHTML('beforeend','<p style="color:#c6f432;padding:40px">市场界面未能加载，请返回园区重试。</p>');};document.body.append(script);
  });
  addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();send('exit');}
    if(e.key==='Enter'&&!e.isComposing&&!/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(document.activeElement?.tagName)){
      const button=document.querySelector('footer button:not(:disabled)');if(button){e.preventDefault();button.click();}
    }
  });
  send('ready');
})();
