import {track,userId} from './records.js';
const key=n=>`crossbound-tutorial-v2:${userId(n)}`;
export function tutorialState(n){try{return JSON.parse(localStorage.getItem(key(n))||'null')}catch{return null}}
function baseSteps(n,view){
  if(n.round===1){
    if(view==='complete'||view==='financials')return [{id:'1:report',segment:4,title:'读懂第一份战报',action:'先看净销售收入，再对照货品、推广、运费和税费。',effect:'收入扣掉这些费用才是利润；现金还会受到库存和回款影响。'}];
    if(view!=='decision')return [];
    const steps=[['market',1,'选择市场','比较买家需求和进入费用，再确认一个市场。','这笔进入费会先扣掉，后面备货和推广都要留预算。'],['product',1,'选择商品','选一件你能讲清用途的商品。','买家需求与商品匹配，会影响后面有多少人下单。'],['stock',2,'定价与备货','先看已填好的售价和备货量，需要时再调整。','价格太高会降低购买意愿；备得太多会把现金压在货里。'],[n.currentListing?'promotion':'listing',n.currentListing?3:2,n.currentListing?'选择推广':'做好商品页',n.currentListing?'选一种推广方式，再核对预算。':'选好标题、主图和详情，然后确认上架。',n.currentListing?'流量要花钱，先看每单毛利够不够覆盖获客成本。':'信息讲得越清楚，买家越容易买对，描述类退款也越少。'],['delivery',3,'安排交付','比较配送费用与时效，再确认发货。','慢一点可能省运费，也可能增加退款；结果会一起记入战报。'],['next',3,'安排下轮','决定继续当前市场还是探索下一站。','确认后完成这一轮，现金与余货会保留。']];
    const s=steps[n.stage];return s?[{id:`1:${s[0]}`,segment:s[1],title:s[2],action:s[3],effect:s[4]}]:[];
  }
  if(n.round===2){
    if(view==='v2-events')return [{id:'2:event',segment:2,title:'总部来电 · 经营事件',action:'先看事件影响，再选择一个应对办法。',effect:'处理费用和后续影响都会写入这一轮的经营记录。'}];
    if(view==='complete'||view==='financials')return [{id:'2:report',segment:2,title:'这轮的钱主要卡在哪一步？',action:'打开财报，看看应收、应付和平台费用。',effect:'应收是还没到账的钱，应付是尚未支付的进货款；两者都会影响下轮可用现金。'}];
    if(view==='decision'&&n.stage===0)return [{id:'2:platform',segment:1,title:'先选开店平台',action:'在市场下面比较平台，再确认这一站。',effect:'不同平台的入驻费用、流量和佣金不同。'}];
    if(view==='decision'&&n.stage===2)return [{id:'2:first-mile',segment:1,title:'货怎么运过去',action:'在备货方案中比较海运、空运和海空联运。',effect:'头程费用和到货天数会改变本轮可售数量。'},{id:'2:credit',segment:1,title:'货款什么时候付',action:'核对现款或账期采购，再看资金时间线。',effect:'账期能暂时保留现金，但到期仍要付款，利润不会凭空增加。'}];
  }
  return [];
}
export function tutorialSteps(n,view){
  const steps=baseSteps(n,view);
  if(n.round===2&&view==='decision'&&n.v2?.events?.some(e=>e.dueRound===n.round&&n.stage>=e.stage))steps.push(...baseSteps(n,'v2-events'));
  return steps;
}
export function checklist(n,state){
  const first=n.history.find(r=>r.round===1);
  return [!!first||n.round===1&&n.stage>=2,!!first||n.round===1&&(!!n.currentListing||n.stage>3),!!first,!!state?.reports?.[1],!!n.history.find(r=>r.round===2)&&['2:platform','2:first-mile','2:credit','2:event'].every(k=>state?.seen?.[k])];
}
export function createTutorialUI({React,Button}){
  const h=React.createElement;
  function useTutorial(company,started,view,onReward){
    const [state,setState]=React.useState(()=>tutorialState(company)), previous=React.useRef(null), resumed=React.useRef(false);
    const save=value=>{try{localStorage.setItem(key(company),JSON.stringify(value))}catch{}setState(value)};
    React.useEffect(()=>{setState(tutorialState(company));previous.current=null;resumed.current=false},[userId(company)]);
    React.useEffect(()=>{
      if(!started)return;
      if(!state){const fresh=company.history.length===0&&company.round===1;const next={eligible:fresh,seen:{},skipped:{},reports:{},started_at:Date.now()};save(next);if(fresh)track(company,'tutorial_started',{},'tutorial:start');return;}
      if(!state.eligible)return;
      if(!resumed.current){resumed.current=true;if(Object.keys(state.seen).length)track(company,'resumed',{stage:company.stage});}
      const steps=tutorialSteps(company,view).filter(s=>!state.skipped[s.id]);
      let next=state;
      for(const step of steps)if(!next.seen[step.id]){next={...next,seen:{...next.seen,[step.id]:true}};track(company,'step_viewed',{step:step.id,segment:step.segment},`tutorial:view:${step.id}`);}
      const prev=previous.current;
      if(prev&&prev.round===company.round&&(company.stage>prev.stage||company.stage===3&&company.currentListing&&!prev.listing)){
        for(const step of prev.steps)track(company,'step_completed',{step:step.id,used_default:company.decisions[prev.stage]?.used_default??null},`tutorial:done:${step.id}`);
      }
      previous.current={round:company.round,stage:company.stage,listing:!!company.currentListing,steps};
      if(next!==state)save(next);
    },[company,started,view,state]);
    React.useEffect(()=>{
      if(!started||!['complete','financials'].includes(view))return;
      let elapsed=0,last=Date.now();
      const timer=setInterval(()=>{const now=Date.now();if(!document.hidden&&!document.querySelector('.v2-badge-celebration[open]'))elapsed+=now-last;last=now;
        if(elapsed>=3000&&state?.eligible&&!state.reports[company.round]){save({...state,reports:{...state.reports,[company.round]:true}});}
      },500);
      const report=()=>track(company,'report_viewed',{view,dwell_ms:elapsed});
      addEventListener('pagehide',report);
      return()=>{clearInterval(timer);removeEventListener('pagehide',report);report()};
    },[company.round,started,view,state?.eligible,state?.reports?.[company.round]]);
    React.useEffect(()=>{
      if(!state?.eligible)return;
      const done=checklist(company,state);
      if(done.slice(0,4).every(Boolean)&&!Object.keys(state.skipped).some(k=>k.startsWith('1:'))){onReward({type:'tutorial',id:'licensed',run:userId(company),round:1});track(company,'completed',{round:1,first_settlement_ms:Date.now()-state.started_at},'tutorial:complete:1');}
      if(done[4]){onReward({type:'tutorial',id:'independent',run:userId(company),round:2});track(company,'completed',{round:2},'tutorial:complete:2');}
    },[company.stage,company.round,company.history.length,state]);
    const steps=state?.eligible?tutorialSteps(company,view).filter(s=>!state.skipped[s.id]):[];
    return {state,steps,done:checklist(company,state),skip:id=>{save({...state,skipped:{...state.skipped,[id]:true}});track(company,'step_skipped',{step:id},`tutorial:skip:${id}`)},resume:()=>{const skipped={...state?.skipped};for(const s of tutorialSteps(company,company.stage===6?'complete':'decision'))delete skipped[s.id];save({seen:{},reports:{},started_at:Date.now(),...state,eligible:true,skipped});track(company,'resumed',{stage:company.stage})}};
  }
  function Tutorial({guide,company,checklistOnly=false,onResume}){
    if(checklistOnly)return h('section',{className:'report-insights-panel v2-panel v4-guide'},h('h2',{id:'campaign-dialog-title'},'新手教程 · 边经营边学'),h('ol',null,['选好第一单的货','完成第一次上架','打完第一轮','读懂第一份战报','完成第二轮新系统'].map((label,i)=>h('li',{key:label},`${guide.done[i]?'✓':'○'} ${label}`))),h('p',null,'进度跟随你的真实经营动作。跳过提示后，也可以从这里接着看。'),h(Button,{variant:'solid',onClick:()=>{guide.resume();onResume()}},'回到当前经营步骤'));
    if(!guide.steps.length)return null;
    return h('aside',{className:'v4-guide','aria-label':'当前经营引导'},guide.steps.map(step=>h('div',{key:step.id},h('div',{className:'v4-guide-heading'},h('strong',null,`第${company.round}轮 · ${company.round===1?`第${step.segment}/4段`:'新系统'} · ${step.title}`),h('button',{onClick:()=>guide.skip(step.id),'aria-label':`跳过${step.title}引导`},'跳过提示 ×')),h('p',null,step.action),h('small',null,step.effect))));
  }
  return {useTutorial,Tutorial};
}
