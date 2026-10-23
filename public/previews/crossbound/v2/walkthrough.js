// Targets are real game controls. Confirmation steps wait for game state to change.
const choice=(target,title,body,keep)=>({target,title,body,keep,event:'change'});
const read=(target,title,body,keep='看懂了')=>({target,title,body,keep});
const commit=(body)=>({target:'[data-guide="commit"]',title:'确认这一项决定',body,wait:true});
export function walkthroughPlan(id,view){
  const plans={
    '1:enter':[{target:'.mission-guidance-actions button',title:'从这里开始你的第一单',body:'点击发光的「选择市场」。接下来我会带你选商品、备货、推广，再一起看这一轮赚了多少。',wait:true}],
    '1:finish':[{target:'[data-guide="next-round"]',title:'第一轮完成，带着经验继续',body:'点击「开启下一轮」。现金和余货会保留；第二轮只会在新增玩法出现时提示你。',wait:true}],
    '1:return':[{target:'[data-guide="report"]',title:'你已经读懂第一份财报',body:'点击「本轮战报」返回，就可以开启下一轮。',wait:true}],
    '1:market':[choice('#market-choice','先选卖到哪个国家','点开国家列表选择市场。第一次可以保留新加坡；确认后会扣除市场进入费。','保留当前市场'),commit('点击页面里的「继续」，确定市场并进入选品。现在还不会采购商品。')],
    '1:product':[{...choice('.room-controls > .catalog-products button[aria-pressed="true"]','挑一件你想卖的商品','点击商品卡选择商品，看看进货价和建议售价。第一次也可以先试当前选中的商品。','就选当前商品'),event:'click',listen:'.room-controls > .catalog-products button'},commit('点击「继续」确定商品。下一步才会决定买多少、卖多少钱。')],
    '1:stock':[choice('label[for="campaign-price"]','这件商品卖多少钱？','拖动售价滑块，比较售价与进货成本。价格太高会影响购买意愿；也可以先保留推荐价。','保留当前售价'),choice('label[for="campaign-quantity"]','先买多少件来试？','拖动库存滑块调整备货量。备得多会占用更多现金，第一次可以保留推荐数量。','保留当前数量'),commit('核对下面的现金变化，再点击「继续」确认进货。进货要花钱，余货会保留到下一轮。')],
    '1:listing':[
      {...choice('.listing-edit-panel:first-child .listing-choice-group:first-of-type button[aria-pressed="true"]','标题先告诉买家：卖什么','点击标题选项，决定是否补充用途或关键规格。当前已经选了推荐方案，也可以直接保留。','保留当前标题'),event:'click',listen:'.listing-edit-panel:first-child .listing-choice-group:first-of-type button'},
      {...choice('.listing-edit-panel:first-child .listing-choice-group:nth-of-type(2) button[aria-pressed="true"]','再选一张买家能看清的主图','点击主图选项，比较完整商品、放大主体和规格标注。制作费用会显示在每个选项旁。','保留当前主图'),event:'click',listen:'.listing-edit-panel:first-child .listing-choice-group:nth-of-type(2) button'},
      {...choice('.listing-edit-panel:nth-child(2) .listing-choice-group button[aria-pressed="true"]','最后把商品详情讲清楚','点击详情选项，决定用途、规格和包装写到哪一步。描述越清楚，买家越容易买对。','保留当前详情'),event:'click',listen:'.listing-edit-panel:nth-child(2) .listing-choice-group button'},
      {target:'[data-guide="publish"]',title:'亲手确认上架',body:'点击这个「继续」发布商品页，只扣本次制作费。上架完成后，我们再选择推广方式。',wait:true}],
    '1:promotion':[{...choice('.room-controls > .decision-choice-list','怎样让买家看到商品？','选内容、广告或达人推广，再看下面的具体方案。不同渠道的预算和成交佣金不同。','保留当前渠道'),event:'click'},choice('label[for="campaign-budget"]','给推广留多少预算？','拖动滑块调整预算。推广花得多不一定赚得多，先看看获客成本预警。','保留当前预算'),commit('点击「继续」确认推广投入。下一步比较运费与配送速度。')],
    '1:delivery':[{...choice('.room-controls > .decision-choice-list','怎么把货送到买家手里？','点击配送方案比较价格与时效。更慢的配送可能增加退款，第一次可以使用标准方案。','保留当前配送'),event:'click'},commit('点击「继续」执行本轮发货结算，订单、退款和费用会按你的实际方案计算。')],
    '1:next':[{...choice('.room-controls > .decision-choice-list','下一轮想留在这里，还是换一站？','选好下轮安排。继续原市场可以积累经验，换市场则要重新考虑费用与需求。','保留当前安排'),event:'click'},commit('点击「继续」完成这一轮。接下来一起读战报，看看钱从哪里来、花到哪里去。')],
    '1:report':view==='financials'?[read('.v3-table-wrap tbody tr:nth-child(3)','第一笔：真正留下的销售收入','销售收入要先减去退款，才得到这一行的净销售收入。','继续看成本'),read('.v3-table-wrap tbody tr:nth-child(6)','再减去经营费用','货品之外，还要支付推广、运费、税费等费用。沿着这张表往下看，每笔都影响最后的赚亏。','看看最终利润'),read('.v3-table-wrap tbody tr:last-child','最后，这一行才是本轮赚亏','净销售收入减去所有本轮费用，就是净利润。你已经完成第一轮，可以返回本轮战报开启下一轮。','我看懂本轮赚亏了')]:[read('.complete-profit','先看本轮赚了多少','这里是扣除本轮费用后的贡献利润。订单多不代表一定赚钱，先看最终留下了多少。','再看看钱花在哪'),{target:'[data-guide="financials"]',title:'打开财报，看一笔完整的账',body:'点击「财报」。我们会把收入、退款和各项费用逐项列出来。',wait:true}],
    '2:platform':[{...choice('[data-guide="platform"]','第二轮：多了经营平台','点击平台卡比较流量、入驻费和佣金。这里决定通过哪种店铺模式经营；也可以沿用推荐平台。','保留当前平台'),event:'click'}],
    '2:first-mile':[{...choice('[data-guide="first-mile"]','货先怎么运到海外？','点击头程方案比较海运、空运和海空联运。这段运费和到货时间，会影响本轮能卖多少货。','保留当前头程'),event:'click'}],
    '2:credit':[{...choice('[data-guide="credit"]','采购款现在付，还是下轮付？','展开的谈判方案里可以争取账期。账期暂时保留现金，但下轮仍要还货款。','保留当前付款方案'),event:'click'}],
    '2:event':[{target:'.v2-event .decision-choice-list',title:'这次轮到你处理经营事件',body:'阅读这通总部来电，点击一个应对方案。选择会真实改变费用或后续经营效果；有成本的选项会直接执行。',event:'click'}],
    '2:report':view==='financials'?[{target:'[data-guide="balance"]',title:'看看利润为什么还没变成现金',body:'点击「资产负债表」，找到现金、应收账款和应付采购款。卖出了货，也可能还要等回款。',event:'click'},read('[data-guide="balance-table"] tbody tr:nth-child(3)','这轮的钱主要卡在哪里？','应收是卖了货还没收到的钱，存货是还没卖出的商品，应付是以后要还的采购款。看完这张表，再决定下轮能投入多少。','看懂了，接下来自己经营')]:[{target:'[data-guide="financials"]',title:'第二轮重点：利润不等于现金',body:'点击「财报」，这次只看新增的应收、应付和平台费用，第一轮学过的步骤不再重复。',wait:true}],
  };
  return plans[id]||[];
}

export function activeWalkthrough(steps,state,view){
  for(let step of steps){
    if(step.id.endsWith(':report')&&state?.reports?.[Number(step.id.split(':')[0])]){
      if(step.id==='2:report')continue;
      step={...step,id:view==='financials'?'1:return':'1:finish'};
    }
    const key=`${step.id}:${['complete','financials'].includes(view)?view:'action'}`;
    const plan=walkthroughPlan(step.id,view),index=state?.walk?.[key]||0;
    if(index<plan.length)return {step,key,index,plan,item:plan[index]};
  }
  return null;
}

// The bubble is beside the target, never over the control the player must use.
export function bubblePosition(rect,width,height,bubbleHeight=240){
  const w=Math.min(330,width-24),gap=18;
  let left,top;
  if(width-rect.right>=w+gap+12){left=rect.right+gap;top=rect.top;}
  else if(rect.left>=w+gap+12){left=rect.left-w-gap;top=rect.top;}
  else {left=Math.max(12,Math.min(rect.left,width-w-12));top=rect.bottom+gap;
    if(top+bubbleHeight>height-12)top=rect.top-bubbleHeight-gap;}
  return {left,top:Math.max(12,Math.min(top,height-bubbleHeight-12)),width:w};
}

export function createWalkthrough({React}){
  const h=React.createElement;
  return function Walkthrough({guide,company,view}){
    const active=activeWalkthrough(guide.steps,guide.state,view);
    const token=active?`${active.key}:${active.index}`:'';
    const root=React.useRef(null),bubble=React.useRef(null),callbacks=React.useRef({});
    const [layout,setLayout]=React.useState(null);
    callbacks.current={advance:(method='acknowledged')=>active&&guide.advance(active.key,active.index+1,active.step.id,method),viewed:()=>active&&guide.viewed(active.step.id,token,active.step.segment)};
    React.useEffect(()=>{
      setLayout(null);
      if(!active)return;
      let stopped=false,element=null,scrolled=false,frame=0,notified=false;
      const selector=active.item.target;
      const find=()=>[...document.querySelectorAll(selector)].find(el=>{const details=el.closest('details');if(details&&!details.open)details.open=true;return el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';});
      const measure=()=>{
        if(stopped)return;
        const hiddenByAward=!!document.querySelector('.v2-badge-celebration[open]');
        element=find();
        if(!element||hiddenByAward){setLayout(null);return;}
        // Expand only the relevant optional group, not every panel on the page.
        const details=element.closest('details');if(details&&!details.open)details.open=true;
        const panel=element.closest('.campaign-panel'),rect=element.getBoundingClientRect();
        if(!scrolled){
          scrolled=true;
          element.scrollIntoView({block:'center',behavior:'instant'});
          if(panel){const r=element.getBoundingClientRect(),p=panel.getBoundingClientRect();panel.scrollTop+=r.top-Math.max(p.top+85,90);}
        }
        const r=element.getBoundingClientRect(),height=window.innerHeight,width=window.innerWidth;
        const topbar=element.closest('dialog')?.querySelector('.panel-topbar')?.getBoundingClientRect();
        const top=Math.max(r.top,topbar?.bottom||0,8),bottom=Math.min(r.bottom,height-8);
        if(bottom<=top||r.right<0||r.left>width){setLayout(null);return;}
        const clipped={left:Math.max(8,r.left),right:Math.min(width-8,r.right),top,bottom};
        const next={rect:clipped,box:bubblePosition(clipped,width,height,bubble.current?.offsetHeight||240)};
        setLayout(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
        if(!notified){notified=true;callbacks.current.viewed();}
      };
      const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
      const interact=e=>{
        const target=e.target.closest?.(active.item.listen||selector);
        if(!target||target.matches(':disabled')||e.target.closest('[disabled]'))return;
        if(active.item.event==='click'&&!e.target.closest('button,input,select'))return;
        if(!active.item.wait)callbacks.current.advance('interaction');
      };
      // Capture before React replaces a selected event's buttons with its outcome.
      if(active.item.event)document.addEventListener(active.item.event,interact,true);
      document.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);
      const observer=new MutationObserver(schedule);
      observer.observe(document.querySelector('.campaign')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
      const timer=setInterval(schedule,250);schedule();
      return()=>{stopped=true;clearInterval(timer);cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);if(active.item.event)document.removeEventListener(active.item.event,interact,true);};
    },[token]);
    React.useEffect(()=>{
      const node=root.current;if(!node)return;
      if(layout&&node.showPopover&&!node.matches(':popover-open'))node.showPopover();
      if(!layout&&node.hidePopover&&node.matches(':popover-open'))node.hidePopover();
    },[layout,token]);
    React.useEffect(()=>{
      if(!active)return;
      const escape=e=>{if(e.key==='Escape'&&root.current?.matches(':popover-open')){e.preventDefault();e.stopImmediatePropagation();guide.skipRound();}};
      document.addEventListener('keydown',escape,true);return()=>document.removeEventListener('keydown',escape,true);
    },[token,guide.skipRound]);
    if(!active)return null;
    const r=layout?.rect;
    return h('div',{ref:root,popover:'manual',className:'v5-walkthrough','data-guide-step':token,style:{visibility:layout?'visible':'hidden'}},
      r&&h('div',{className:'v5-spotlight',style:{left:r.left-5,top:r.top-5,width:r.right-r.left+10,height:r.bottom-r.top+10},'aria-hidden':true}),
      h('aside',{ref:bubble,className:'v5-coach',style:layout?.box,role:'region','aria-label':'新手操作指导','aria-live':'polite'},
        h('div',{className:'v5-coach-top'},h('span',null,company.round===1?`第一轮 · 第 ${active.step.segment}/4 段`:'第二轮 · 新玩法'),h('button',{type:'button',onClick:guide.skipRound,'aria-label':'跳过本轮引导'},'跳过 ×')),
        h('div',{className:'v5-coach-progress','aria-hidden':true},active.plan.map((_,i)=>h('i',{key:i,className:i<=active.index?'is-done':''}))),
        h('h3',null,active.item.title),h('p',null,active.item.body),
        active.item.keep?h('button',{type:'button',className:'v5-coach-keep',onClick:()=>callbacks.current.advance()},active.item.keep+' →'):h('small',null,'请操作高亮位置，完成后自动接着教'),
        h('button',{type:'button',className:'v5-coach-locate',onClick:()=>document.querySelector(active.item.target)?.scrollIntoView({block:'center',behavior:'instant'})},'定位到操作位置')));
  };
}
