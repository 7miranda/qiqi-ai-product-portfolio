(()=>{
  const channel='crossbound-promotion-game-v1',origin=location.origin;
  let booted=false;
  const send=(type,extra={})=>{if(parent!==window)parent.postMessage({channel,type,...extra},origin);};
  window.CrossboundPromotion={send};
  addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==origin||event.data?.channel!==channel||event.data.type!=='model')return;
    const model=event.data.model;if(!model?.product?.id||!model.draft||!model.quotes)return;
    window.promotionModel=model;
    if(window.promotionComponent){window.promotionComponent.applyView(model);return;}
    if(booted)return;booted=true;document.getElementById('promotion-loading')?.remove();
    const script=document.createElement('script');script.src='../market/vendor/support.js'+location.search;script.onload=()=>{const sync=()=>document.querySelectorAll('img[data-promotion-src]').forEach(img=>{const src=img.getAttribute('data-promotion-src');if(src&&!src.includes('{{')&&img.getAttribute('src')!==src)img.setAttribute('src',src);});new MutationObserver(sync).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-promotion-src']});sync();};script.onerror=()=>{document.body.insertAdjacentHTML('beforeend','<p style="color:#c4f53a;padding:40px">推广室加载失败，请返回园区重试。</p>');};document.body.append(script);
  });
  send('ready');
})();
