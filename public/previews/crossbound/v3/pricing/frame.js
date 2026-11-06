/* Isolated view: only display engine quotes and send player intents to the game host. */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const channel='crossbound-pricing-v1',origin=location.origin;
const money=(n,d=0)=>Number.isFinite(n)?'$'+n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let model=null,world=null,starting=false,disposed=false,selectedCost=null;
const send=(type,extra={})=>parent.postMessage({channel,type,key:model?.key,...extra},origin);
const sum=(q,keys)=>keys.reduce((v,k)=>v+(q[k]||0),0);
function sectors(){const q=model.quote;return[
  ['单件售价',model.draft.price,'每件商品的销售标价；售价会影响游戏引擎中的需求和退款预估。'],
  ['单件进货',q.unitCost,'沿用选品展厅谈妥的供应商；实际进货价包含引擎计算的数量折扣。'],
  ['本次付款',Math.max(0,-q.cashDelta),'本次确认实际扣除的金额。赊购及备货费用按本轮资金规则处理，采购货值不一定等于本次付款。'],
  ['头程运输',q.firstMileCost,'本轮总额预估。头程方案在物流仓确认，当前不扣除这笔费用。'],
  ['关税与进口税',sum(q,['tariff','importTax']),'本轮总额预估，使用所选市场及商品对应的游戏税费参数。'],
  ['海外仓储',q.warehouseCost??0,'本轮仓储总额预估；费用与库存按游戏规则结算。'],
  ['平台与支付',sum(q,['platformFees','paymentFee','fxFee']),'本轮平台佣金、支付及换汇费用的预估总额。'],
  ['推广费用',sum(q,['marketingCost','commission','offsiteCost']),'本轮预算及推广分佣预估。后续推广室调整方案后，预估会随之变化。'],
  ['尾程配送',q.shippingCost,'本轮配送费用预估，最终配送方案在物流仓确定。'],
  ['售后与损耗',sum(q,['writeoffCost','returnHandlingCost','stockReturnFee']),'本轮报损、退货处理及余货清退手续费预估。'],
  ['本轮贡献利润',q.profit,'游戏引擎的本轮贡献利润预估；后续商品页、推广和履约决策会改变结果。'],
  ['期末余货',q.inventoryRemaining,'本轮预估余货，按游戏结算规则清退；不是全部按报废损失处理。','件'],
];}
function show(html){$('#dialog-content').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();}
function inspect(i){if(!model||model.busy||model.blocked)return;selectedCost=i;const [name,value,detail,unit]=sectors()[i];world?.highlight(i);show(`<div class="eyebrow">财务罗盘 / ${String(i+1).padStart(2,'0')}</div><h2>${name}</h2><div class="cost-value">${unit?value+' '+unit:money(value,2)}</div><p>${detail}</p>`);}
function render(){
  const m=model,q=m.quote,d=m.draft,disabled=m.busy||m.blocked;
  $('#cash').textContent=money(m.cash);$('.round').textContent=`第 ${m.round} 轮`;
  $('#context').textContent=m.market+' / '+m.product.name;
  $('#supplier').textContent=`${m.supplier} · 新增采购起订 ${q.moq} 件`;
  const visiblePrice=pendingEdits.get('price')??sentEdits.get('price')??d.price,visibleQuantity=pendingEdits.get('quantity')??sentEdits.get('quantity')??d.quantity;
  $('#price-value').textContent=money(visiblePrice);$('#qty-value').textContent=visibleQuantity+' 件';
  $('#stock-count').textContent=`现有库存 ${Math.max(0,q.totalUnits-q.unitsToBuy)} 件 · 新购 ${q.unitsToBuy} 件`;
  $('.plans').innerHTML=m.plans.map((p,i)=>`<button class="plan ${p.id===d.id?'selected':''}" data-plan="${escape(p.id)}" aria-pressed="${p.id===d.id}" ${disabled?'disabled':''} style="--band:${['#44d2e2','#c6f432','#d9b25c'][i%3]}"><span class="plan-band"><small>${escape(p.english)}</small><b>${escape(p.name)}</b><i class="selection-mark">✓</i></span><span class="plan-paper"><span class="plan-price"><small>目标</small><strong>${p.quantity}<em>件</em></strong></span><span class="plan-stat"><span>售价</span><b>${money(p.price)}</b></span><span class="plan-stat"><span>进货 / 件</span><b>${money(p.unitCost,2)}</b></span><span class="plan-note">${escape(p.benefit)}</span></span></button>`).join('');
  $$('.plan').forEach(b=>b.onclick=()=>{clearTimeout(editTimer);pendingEdits.clear();sentEdits.clear();purchaseAfterEdit=false;send('edit',{field:'plan',value:b.dataset.plan});});
  Object.assign($('#price'),{min:m.bounds.min,max:m.bounds.max,value:visiblePrice});$('#qty').value=visibleQuantity;
  const percent=(v,min,max)=>Math.max(0,Math.min(100,(v-min)/(max-min)*100))+'%';
  for(const id of ['price','qty']){const e=$('#'+id);$('#'+id+'-slider').style.setProperty('--range',percent(+e.value,+e.min,+e.max));}
  const threshold=m.bounds.base*1.3,high=d.price>threshold;
  $('.price-reference').style.left=percent(m.bounds.base,m.bounds.min,m.bounds.max);$('.danger-zone').style.left=percent(threshold,m.bounds.min,m.bounds.max);$('#price-slider').classList.toggle('price-danger',high);
  $('.price-labels').innerHTML=`<span>${money(m.bounds.min)}</span><span>参考 ${money(m.bounds.base)}</span><span class="danger-label">&gt; ${money(threshold,1)} 高价区</span><span>${money(m.bounds.max)}</span>`;
  $('#qty-min').textContent='目标库存 200–1600 件';$('#demand-label').textContent=`▲ 预估需求 ${q.demand} 件`;
  $('#demand-marker').style.left=percent(q.demand,200,1600);
  $('#cost-total').textContent=money(q.totalCosts);$('#cost-product').textContent=money(sum(q,['cogs','writeoffCost']),2);$('#cost-logistics').textContent=money(sum(q,['firstMileCost','shippingCost','tariff','importTax','warehouseCost']),2);$('#cost-selling').textContent=money(sum(q,['platformFees','paymentFee','fxFee','returnHandlingCost']),2);
  $('#unit-profit').textContent=money(q.profit,2);$('#profit').textContent=money(q.profit);$('#profit').classList.toggle('loss',q.profit<0);
  $('#sold').textContent=q.orders+' / '+q.totalUnits+' 件';$('#pay').textContent=money(Math.max(0,-q.cashDelta));
  $('#risk').textContent=m.notice;$('#risk').classList.toggle('danger',!q.affordable);
  $('#purchase').disabled=disabled||(!m.canConfirm&&!m.canRecover&&!m.adjustQuantity);$('#purchase>span').textContent=m.busy?'采购确认中':m.adjustQuantity?`调整为 ${m.adjustQuantity} 件`:m.canRecover?'查看资金方案':'确认采购';
  $('#room-status').textContent=m.busy?'确认中':'03 / 07';
  $('#payment-note').textContent=`后续资金预留 ${money(Math.max(0,(q.cashNeed??-q.cashDelta)+q.cashDelta))} · 当前不扣除`;
  $$('.plan,[data-step],input[type=range],#funding,#exit').forEach(e=>e.disabled=disabled);
  $('#details').innerHTML=sectors().slice(2,10).map(([label,value],j)=>`<button data-cost="${j+2}"><span>${label}</span><b>${money(value,2)}</b></button>`).join('');
  $$('[data-cost]').forEach(b=>{b.onclick=()=>inspect(+b.dataset.cost);b.onmouseenter=()=>world?.highlight(+b.dataset.cost);});
  world?.update({price:d.price,min:m.bounds.min,max:m.bounds.max,qty:d.quantity,confirmed:false,values:sectors().map(([,v,,u])=>u?v+' 件':money(v,2))});
  document.body.classList.toggle('host-modal',m.blocked);
}
function purchase(){
  if(!model||model.busy||model.blocked)return;
  if(pendingEdits.size||sentEdits.size){purchaseAfterEdit=true;flushEdits();return;}
  if(model.adjustQuantity){send('edit',{field:'quantity',value:model.adjustQuantity});return;}
  if(model.canRecover){send('recover');return;}
  const q=model.quote,review=JSON.stringify(q);
  show(`<div class="eyebrow">采购确认</div><h2>确认本轮采购</h2><p>${escape(model.product.name)} · ${escape(model.supplier)}</p><div class="receipt">${[['目标库存',model.draft.quantity+' 件'],['新增采购',q.unitsToBuy+' 件'],['销售定价',money(model.draft.price)],['采购货值',money(q.purchaseCost,2)],['本次付款',money(Math.max(0,-q.cashDelta),2)],['付款后现金',money(model.cash+q.cashDelta,2)]].map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('')}</div><p class="dialog-note">确认后写入本轮库存与账本，进入商品页工作室。后续推广及履约仍需预留 ${money(Math.max(0,(q.cashNeed??-q.cashDelta)+q.cashDelta),2)}；本次不扣除。</p><div class="dialog-actions"><button id="cancel-purchase">返回调整</button><button id="confirm-purchase" class="primary">确认并进入工作室 →</button></div>`);
  $('#cancel-purchase').onclick=()=>$('#dialog').close();$('#confirm-purchase').onclick=()=>{$('#confirm-purchase').disabled=true;$('#dialog').close();send('confirm',{review});};
}
let editTimer,purchaseAfterEdit=false;const pendingEdits=new Map(),sentEdits=new Map();
function flushEdits(){clearTimeout(editTimer);for(const [field,value] of pendingEdits){sentEdits.set(field,value);send('edit',{field,value});}pendingEdits.clear();}
function queueEdit(field,value){pendingEdits.set(field,value);clearTimeout(editTimer);editTimer=setTimeout(flushEdits,60);}
for(const id of ['price','qty'])$('#'+id).oninput=e=>{if(model&&!model.busy){world?.highlight(id==='price'?0:11);$('#'+id+'-value').textContent=id==='qty'?e.target.value+' 件':money(+e.target.value);queueEdit(id==='qty'?'quantity':'price',+e.target.value);}};
$$('[data-step]').forEach(b=>b.onclick=()=>{const [id,step]=b.dataset.step.split(':'),e=$('#'+id),value=Math.max(+e.min,Math.min(+e.max,+e.value+Number(step)));e.value=value;$('#'+id+'-value').textContent=id==='qty'?value+' 件':money(value);queueEdit(id==='qty'?'quantity':'price',value);});
$('#detail-toggle').onclick=()=>{const e=$('#cost-block');e.hidden=!e.hidden;$('#detail-toggle').textContent=e.hidden?'明细 ＋':'收起 −';$('#detail-toggle').setAttribute('aria-expanded',String(!e.hidden));};
$('#purchase').onclick=purchase;$('#exit').onclick=()=>send('exit');$('#funding').onclick=()=>send('funding');$('#close').onclick=()=>$('#dialog').close();
$('#explain').onclick=()=>show(`<div class="eyebrow">本轮经营预估</div><h2>成本与利润</h2><div class="receipt">${[['净销售收入',model.quote.netRevenue],['本轮总成本',model.quote.totalCosts],['贡献利润',model.quote.profit]].map(([k,v])=>`<div><span>${k}</span><b>${money(v,2)}</b></div>`).join('')}</div><p>这是当前游戏方案的预估，已包含引擎核算的经营费用。采购货值是库存投入，不能再从利润中重复扣除。</p><p>商品页制作、推广和配送尚未确认，预估采用当前默认方案；最终以财报结算为准。</p>`);
$('#help').onclick=()=>{show('<div class="eyebrow">操作说明</div><h2>定价与备货</h2><p>沿用展厅谈妥的供应商，选择备货卡片，再调整售价和目标库存。确认采购后进入商品页工作室。</p><p>点击罗盘格查看对应金额。前两格是单件价格，其余金额是本轮总额预估。</p><p>售价超过参考价 1.3 倍后会增加退款风险；实际需求、费用与可用资金均按本轮游戏规则计算。</p><button id="motion" class="setting-button">桌面动效：'+(world?.getPaused()?'关':'开')+'</button>');$('#motion').onclick=()=>{world?.setPaused(!world.getPaused());$('#motion').textContent='桌面动效：'+(world?.getPaused()?'关':'开');};};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#dialog').open)send('exit');});
addEventListener('pagehide',()=>{disposed=true;clearTimeout(editTimer);world?.dispose();});
addEventListener('message',async e=>{
  if(e.source!==parent||e.origin!==origin||e.data?.channel!==channel)return;
  if(e.data.type==='suspend'){world?.setSuspended(true);return;}
  if(e.data.type==='dispose'){disposed=true;clearTimeout(editTimer);world?.dispose();return;}
  if(e.data.type!=='model'||disposed)return;
  model=e.data.model;for(const [field,value] of sentEdits)if(model.draft[field]===value)sentEdits.delete(field);render();
  if(purchaseAfterEdit&&!pendingEdits.size&&!sentEdits.size){purchaseAfterEdit=false;purchase();}
  if(!starting){starting=true;await document.fonts.ready;if(disposed)return;try{world=createPricingWorld($('#world'),inspect,model.quality);render();$('#loading').remove();requestAnimationFrame(()=>requestAnimationFrame(()=>send('mounted')));}catch(error){console.error(error);send('failed');}}
});
if(parent===window){$('#loading span').textContent='请从游戏园区进入定价财务室。';}else send('ready');
