import {feedbackState} from './records.js';

export function createRecoveryUI({React,engine}) {
  const h=React.createElement,money=n=>'$'+Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
  const stages=['市场研究所','选品展厅','定价与备货','推广室','物流发货','本轮安排'];
  return function Recovery({company,failure,onClose,onRestart,onCommunity}) {
    const ref=React.useRef(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);
    React.useEffect(()=>{const d=ref.current,focus=document.activeElement;d.showModal();return()=>{d.close();focus?.focus?.({preventScroll:true})}},[]);
    const saved=feedbackState(company),start=engine.restartRound(company);
    function retry(){if(busy)return;setBusy(true);try{onRestart()}catch(e){setError(e.message||'保存失败，请重试。');setBusy(false)}}
    return h('dialog',{ref,className:'cb-recovery','aria-labelledby':'cb-recovery-title',onCancel:e=>{e.preventDefault();if(!busy)onClose()}},
      h('div',{className:'cb-recovery-shell'},
        h('header',{className:'cb-recovery-head'},h('span',null,'CROSSBOUND / 第 '+company.round+' 轮经营'),h('button',{type:'button',onClick:onClose,disabled:busy,'aria-label':'返回当前方案，调整投入'},'返回调整 ↗')),
        h(React.Fragment,null,
          h('div',{className:'cb-recovery-hero'},h('small',null,'经营暂停 / '+(failure.listing?'商品页工作室':stages[failure.stage])),h('h1',{id:'cb-recovery-title'},'您已破产'),h('p',null,'当前现金不足以继续这份方案。可以作废本次尝试，回到本轮起点重新经营。')),
          h('div',{className:'cb-recovery-grid'},
            h('section',{className:'cb-recovery-card'},h('div',{className:'cb-recovery-amounts'},...[[ '当前现金',failure.cash],['所需现金',failure.required],['资金缺口',failure.shortfall]].map(([label,value])=>h('div',{key:label},h('small',null,label),h('strong',null,money(value))))),
              h('div',{className:'cb-recovery-restore'},h('div',null,h('small',null,'重启后可用现金'),h('strong',null,money(start.cash))),h('p',null,'回到第 '+company.round+' 轮 · 选择市场')),
              h('button',{type:'button',className:'cb-recovery-primary',onClick:retry,disabled:busy},busy?'正在恢复…':'重启本轮 →'),h('p',{className:'cb-recovery-note'},'本次尝试作废 · 不增加轮次 · 前 '+company.history.filter(r=>r.round<company.round).length+' 轮成绩保留')),
            h('aside',{className:'cb-recovery-offer'},h('small',null,'总部来电 / 共建者专线'),h('img',{src:'./assets/badges/community-v3/co-creator-star.webp',alt:'共建者徽章'}),h('h2',null,saved.first?'谢谢你，公司的共建者。':'带着补助，重新出发。'),
              saved.first?h('p',null,'你的问卷已记录，共建奖励不会重复领取。已到账的补助和徽章会保留。'):h(React.Fragment,null,h('strong',{className:'cb-recovery-grant'},'+$10,000'),h('p',null,'完成 3 个小问题，领取经营现金补助。原有 50 建设点和共建者徽章照常获得，有效建议再加 20 点。'),h('button',{type:'button',className:'cb-recovery-primary cb-recovery-lime',onClick:onCommunity},'填写问卷，领取补助 →'),h('small',null,'仅可领取一次 · 也可直接重启本轮')))),
          h('div',{className:'cb-recovery-rules'},h('p',null,'↺ 本轮采购、制作费用、借款与成长记录一起回退'),h('p',null,'◇ 补助无需偿还，不计经营利润'))),
        error&&h('p',{role:'alert',className:'cb-recovery-error'},error)));
  };
}
