import { goal, financialStatements, rank, seasonRank } from './release.js';
import { assessment } from './progress.js';
import { feedbackState, saveFeedback, validComment, saveLead, leadRecords } from './records.js';

export function createReleaseUI({React,Button,engine,tasks,profitRows}) {
  const h=React.createElement, money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n||0);
  const button=(label,onClick,props={})=>h(Button,{variant:'outline',onClick,...props},label);
  const panel=(title,...children)=>h('section',{className:'report-insights-panel v2-panel'},h('h3',null,title),...children);
  const download=(data,name,type='text/plain')=>{const url=URL.createObjectURL(new Blob([data],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  function ReportTabs({active='report',onSelect}) {
    return h('nav',{className:'clarity-switches','aria-label':'结算内容'},[['report','本轮战报'],['financials','财报'],['assessment','经营评估']].map(([id,label])=>button(label,()=>onSelect(id),{key:id,'aria-pressed':active===id})));
  }
  function GoalCard({company}) {
    const report=company.report, g=goal(report||company);
    return h('details',{className:'v2-details decision-optional'},h('summary',null,g.modern?`本轮目标 · ${g.target}单或利润$5,000`:'本轮目标 · 原规则'),h('p',{className:'signal-text'},g.modern?`${g.target}单未退款，或贡献利润达到$5,000；任一达成即可盖章。`:`本轮沿用原规则：${g.target}单未退款且盈利。`),
      report&&h('p',null,`${g.passed?'目标已达成':'继续积累经营经验'} · 未退款${report.keptOrders}单 · 贡献利润${money(report.profit)}`),
      g.modern&&h('small',null,'订单通道达标为铜章，利润通道达标为银章，两项同时达标为金章。已有最高等级印章会保留。'));
  }
  function GrowthProgress({ops}) {
    const r=rank(ops),s=seasonRank(ops);
    return panel(r.nextXp?'下一站成长':'本月经营段位',r.nextXp?h(React.Fragment,null,h('p',null,`LV.${r.level} ${r.name} · 距离LV.${r.level+1}还差${r.nextXp-r.xp}经验`),h('progress',{max:r.nextXp-r.minimumXp,value:r.xp-r.minimumXp,'aria-label':'等级进度'})):
      h(React.Fragment,null,h('p',null,`${s.month} · ${s.title} · ${s.points}分${s.next?`，距下一段位${s.next-s.points}分`:''}`),h('progress',{max:500,value:s.next?s.points%500:500,'aria-label':'本月段位进度'}),h('small',null,'当前为本机月度成长记录；跨玩家同步局与周成绩服务尚未接通。')),
      h('small',null,'每完成一轮自动获得100经验，同轮重玩不重复发放。总部任务另计奖励。'));
  }
  function Financials({company,onSelect}) {
    const reports=company.history.length?company.history:company.report?[company.report]:[];
    const [number,setNumber]=React.useState(reports.at(-1)?.round),[tab,setTab]=React.useState('income');
    const report=reports.find(r=>r.round===Number(number))||reports.at(-1), f=financialStatements(company,report);
    const table=(title,rows)=>h('div',{className:'v3-table-wrap'},h('table',null,h('caption',null,title),h('thead',null,h('tr',null,h('th',null,'科目'),h('th',null,'本期'),h('th',null,'较期初变化'))),h('tbody',null,rows.map(([label,amount,delta,note])=>h('tr',{key:label},h('th',{scope:'row'},label,note&&h('small',null,note)),h('td',null,money(amount)),h('td',null,delta==null?'—':`${delta>0?'↑ ':delta<0?'↓ ':''}${money(Math.abs(delta))}`))))));
    if(!f)return panel('财报',h('p',null,'完成发货与本轮安排后生成财报。'));
    const c=f.closing,o=f.opening;
    const rows=!f.legacy?[
      ['现金',c.cash,c.cash-o.cash,'现在可使用的钱'],['存货',c.inventory,c.inventory-o.inventory,'余货按采购成本计价'],['应收账款',c.receivables,c.receivables-o.receivables,'已售货款及待追回佣金'],['资产合计',c.assets,c.assets-o.assets],
      ['应付采购款',c.payables,c.payables-o.payables,'已经采购、尚未支付'],['桥贷未还本金',c.principal,c.principal-o.principal],['应付利息',c.interest,c.interest-o.interest,'已计利润费用、到期支付'],['负债合计',c.liabilities,c.liabilities-o.liabilities],['净资产',c.equity,c.equity-o.equity,'资产减负债'],
    ]:[];
    const income=profitRows(report),net=report.netRevenue||0,gross=report.grossRevenue??net+(report.refundAmount||0);
    return h(React.Fragment,null,h(ReportTabs,{active:'financials',onSelect}),h('h2',{id:'campaign-dialog-title'},'经营财报'),
      h('label',{className:'v3-report-round'},'查看轮次 ',h('select',{value:report.round,onChange:e=>setNumber(e.target.value)},reports.map(r=>h('option',{key:r.round,value:r.round},`第${r.round}轮`)))),
      h('nav',{className:'clarity-switches','aria-label':'三大财报'},[['income','利润表'],['balance','资产负债表'],['cash','现金流量表']].filter(([id])=>!f.legacy||id==='income').map(([id,label])=>button(label,()=>setTab(id),{key:id,'aria-pressed':tab===id}))),
      tab==='income'||f.legacy?panel('利润表',table('本轮收入与费用',[
        ['销售收入',gross],['退款',-(gross-net)],['净销售收入',net],
        ['已售货品成本',-(report.cogs||0)],['毛利',net-(report.cogs||0)],...income.filter(r=>!['netRevenue','cogs'].includes(r.id)).map(r=>[r.label,r.amount]),['净利润',report.profit]]),h('p',null,`本轮赚了${money(report.profit)}；采购形成的未售库存不重复扣为费用。`)):
      tab==='balance'?panel('资产负债表',table('本轮期末资产与负债',rows),f.cashRisk&&h('p',{className:'v3-warning'},'现金可能接不上应付，请先核对待到账货款和到期债务。'),h('p',null,`净资产${money(c.equity)}。利润和现金的差别包括应收变化${money(c.receivables-o.receivables)}、存货变化${money(c.inventory-o.inventory)}以及负债变化${money(c.liabilities-o.liabilities)}。`)):
      panel('现金流量表',table('本轮实际收付', [['期初现金',o.cash],...f.flow.map(r=>[r.label,r.amount]),['现金净变动',f.movement],['期末现金',f.cashEnd]]),h('p',null,'贷款本金和应收到账是现金流，不再重复计入利润。')),
      !f.legacy&&panel('三表核对',h('ul',null,['资产＝负债＋净资产','净资产变动＝本轮净利润','期末现金＝资产负债表现金＝实际现金'].map((label,i)=>h('li',{key:label,className:f.checks[i]?'signal-text':'v3-warning'},`${f.checks[i]?'✓':'核对异常'} ${label}`)))),
      f.reason&&h('p',null,f.reason));
  }
  const questions=[
    ['这趟出海，感觉怎么样？',['很上头，还想再开一轮','看懂了，挺有收获','有点绕，但愿意再试','没找到感觉']],
    ['哪一步最想给总部打电话？',['选市场和选品','定价备货','上架推广','发货、看账和下一轮']],
    ['下期拨款，你最想先修哪里？',['操作再少一点','把账讲得更清楚','更多经营故事','更多商品和成就']],
  ];
  const communityBadge='./assets/badges/community-v1/co-builder.png';
  const badgeArt=(className='')=>h('img',{className:`v3-community-badge ${className}`,src:communityBadge,alt:'共建者徽章：金色桂冠与翡翠地球，三根相连的立柱',width:240,height:240});
  function Community({company,onReward,onDone}) {
    const saved=feedbackState(company);
    // Keep the entry mode stable when saving the first survey causes a parent render.
    const [deep]=React.useState(()=>!!saved.first&&company.history.length>=3);
    const [answers,setAnswers]=React.useState([]),[comment,setComment]=React.useState(''),[receipt,setReceipt]=React.useState(null),[error,setError]=React.useState('');
    const complete=deep?!!saved.deep:!!saved.first,step=answers.length,length=Array.from(comment.trim()).length;
    const claim=deep?saved.deepClaim:saved.firstClaim,earned=!deep||!!claim?.substantive;
    const submit=()=>{try{
      if(complete||receipt||!validComment(comment)||(!deep&&answers.length!==3))return;
      const substantive=!!comment.trim();
      const value=deep?{deep:true,comment:comment.trim()}:{first:true,answers,fun_score:4-answers[0],stuck_step:answers[1],want_most:answers[2],comment:comment.trim()};
      saveFeedback(company,value);onReward({type:'community',id:deep?'deep':'first',run:String(company.v2?.identity||company.runSeed),rounds:company.history.length,substantive});
      setError('');setReceipt({points:deep?(substantive?30:0):(substantive?70:50),earned:!deep||substantive});
    }catch{setError('本机保存失败，请重试；已保存的奖励记录会自动核对，不会重复发放。')}};
    const showBadge=receipt?receipt.earned:earned;
    return h(React.Fragment,null,h('span',{className:'eyebrow'},'总部来电 / 一起把公司做得更好'),h('h2',{id:'campaign-dialog-title'},deep?'总部回访':'共建者专线'),
      complete||receipt?panel('总部回执',h('div',{className:'v3-community-receipt',role:'status'},
        showBadge&&badgeArt(),h('h3',null,showBadge?`${receipt?'恭喜获得':'已获得'}${deep?'深度共建者':'共建者'}徽章`:'谢谢你回来看看'),
        h('p',null,receipt?`总部已收到，${receipt.points?`${receipt.points}建设点已入账。`:'这次回访已记录。'}`:'这次共建已经记录，奖励不会重复发放。'),
        showBadge&&h('p',{className:'v3-community-caption'},'你的声音，让下一次出海更好。徽章已收入「出海成就」。'),button('返回公司',onDone,{variant:'solid'}))):
      !deep&&step<3?panel(questions[step][0],h('p',null,'三句话，让总部知道下一笔研发预算往哪儿花。完成后自动获得50建设点和共建者徽章。'),
        h('div',{className:'operation-actions v3-community-options'},questions[step][1].map((label,i)=>button(label,()=>setAnswers([...answers,i]),{key:label}))),
        step>0&&h('p',{role:'status'},['收到，这个体感总部记下了。','明白，卡住的地方我们重点看。'][step-1])):
      panel(deep?'玩了三轮，哪一处最值得继续打磨？':'还有一句想对总部说的吗？',
        h('div',{className:'v3-community-incentive'},badgeArt(),h('div',null,h('strong',null,deep?'再留一句建议，点亮深度共建者徽章':'提交后，领取你的共建者徽章'),h('p',null,deep?'选填；15–100字建议可获得30建设点和深度共建者徽章。':'完成三问即可获得50建设点和共建者徽章；再写15–100字建议，额外获得20建设点。'))),
        h('label',null,'给总部的建议',h('textarea',{value:comment,maxLength:100,onChange:e=>setComment(e.target.value),rows:4,'aria-describedby':'community-comment-hint'})),
        h('p',{id:'community-comment-hint',role:'status'},length&&length<15?`再写${15-length}字${deep?'，即可领取30建设点和深度共建者徽章':'，即可额外获得20建设点'}；也可以清空跳过。`:`${length}/100字 · ${deep?'有效建议可领取深度共建者徽章':'提交即可领取共建者徽章'}`),
        error&&h('p',{role:'alert'},error),button('发送给总部',submit,{variant:'solid',disabled:!validComment(comment)})));
  }
  function CommunityCollection({company,ops}) {
    const run=String(company.v2?.identity||company.runSeed),first=ops.completed.includes(`community:${run}:first`),deep=ops.history.some(e=>e.type==='community'&&e.run===run&&e.id==='deep'&&e.substantive);
    return panel('一起共建',h('div',{className:'v3-community-collection'},badgeArt(first?'':'is-locked'),h('div',null,h('strong',{className:first?'signal-text':''},first?'共建者 · 已获得':'共建者 · 待点亮'),h('p',null,first?'谢谢你的建议，已写入这家公司的成长记录。':'完成首轮后，右侧消息栏会出现共建者专线。'),h('small',null,deep?'✦ 深度共建者 · 已获得':'完成三轮后的总部回访，留下建议还可点亮深度共建者。'))),h('small',null,'本期采纳公示：暂无已确认采纳的建议。正式采纳后会按徽章编号列出，不展示联系方式。'));
  }
  function Radar({scores}) {
    const point=(v,i)=>[120+Math.sin(i*Math.PI/2)*v*.8,120-Math.cos(i*Math.PI/2)*v*.8].join(',');
    return h('svg',{className:'v3-radar',viewBox:'0 0 240 240',role:'img','aria-label':scores.map(s=>`${s.name}${s.value}分`).join('，')},
      [25,50,75,100].map(v=>h('polygon',{key:v,points:scores.map((_,i)=>point(v,i)).join(' '),fill:'none',stroke:'#29434b'})),
      h('polygon',{points:scores.map((s,i)=>point(s.value,i)).join(' '),fill:'#adff2f33',stroke:'#adff2f',strokeWidth:2}),
      scores.map((s,i)=>h('text',{key:s.key,x:[120,205,120,35][i],y:[20,124,228,124][i],textAnchor:'middle',fill:'#b7d2da',fontSize:12},s.name)));
  }
  function Assessment({company,ops,onSelect}) {
    const a=assessment(company,ops,engine.markets,tasks),[form,setForm]=React.useState(false),[summary,setSummary]=React.useState(false),[input,setInput]=React.useState({email:'',category:'',followers:'',platform:'',wechat:'',consent:false}),[message,setMessage]=React.useState(''),[claimed,setClaimed]=React.useState(()=>leadRecords().some(r=>r.user_id===(company.v2?.identity||String(company.runSeed))));
    const change=(key,value)=>setInput({...input,[key]:value}),full=a.rounds>=3;
    const next=[20,45,65,85][a.level],gap=next?Math.max(0,next-a.averageScore):0;
    const save=e=>{e.preventDefault();try{saveLead(company,a,input);setClaimed(true);setForm(false);setMessage('报告已在本页解锁，信息已保存到本机。邮件服务尚未配置，未发送邮件；可下载报告。')}catch(error){setMessage(error.message)}};
    const certificate = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 900;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#08161c'; ctx.fillRect(0, 0, 1200, 900);
      ctx.strokeStyle = '#6b8c64'; ctx.lineWidth = 2; ctx.strokeRect(32, 32, 1136, 836);
      const text = (s, y, size = 30, color = '#d4e5e8') => { ctx.font = `${size}px sans-serif`; ctx.fillStyle = color; ctx.fillText(s, 90, y); };
      text('CROSSBOUND / 模拟经营荣誉卡', 120, 24, '#8baab5'); text(a.title, 230, 64, '#adff2f');
      text(`完成 ${a.rounds} 轮 · ${a.passport.earned} 国达标 · 最佳利润 ${money(a.best)}`, 310, 30);
      a.scores.forEach((s, i) => { text(`${s.name}  ${s.value}/100`, 400 + i * 85, 26); ctx.fillStyle = '#17323a'; ctx.fillRect(380, 378 + i * 85, 650, 16); ctx.fillStyle = '#80c4c5'; ctx.fillRect(380, 378 + i * 85, s.value * 6.5, 16); });
      text(`编号 ${a.number}`, 790, 17, '#8baab5'); text('游戏内表现记录 · 非职业资质或真实合作承诺', 835, 21, '#8baab5');
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) download(blob, 'crossbound-经营荣誉卡.png', 'image/png');
    };
    const reportText=()=>`CROSSBOUND ${full?'完整':'简版'}经营评估\n${a.number}\n${a.title}\n${a.scores.filter(s=>full||['profit','knowledge'].includes(s.key)).map(s=>`${s.name}：${s.value}/100；${s.detail}`).join('\n')}\n${a.suggestion}\n自主决策样本${a.evidenceRounds}轮，默认辅助${a.assistedRounds}轮不作为能力证据。\n${company.report?.financeEnd?`净资产：$50,000 → ${money(financialStatements(company,company.report).closing?.equity)}`:''}`;
    return h(React.Fragment,null,onSelect&&h(ReportTabs,{active:'assessment',onSelect}),panel('我的经营评估',h('span',{className:'eyebrow'},'游戏内荣誉 / 经营表现'),h('h2',{id:'campaign-dialog-title'},`✦ ${a.title}`),
      h(Radar,{scores:a.scores}),h('p',null,`完成${a.rounds}轮 · 自主决策样本${a.evidenceRounds}轮 · 默认辅助${a.assistedRounds}轮`),
      h('p',null,next?`距下一荣誉评分线还差${gap}分；还需满足市场广度条件。`:'已达到最高荣誉等级。'),h('progress',{max:next||100,value:a.averageScore,'aria-label':'荣誉段位进度'}),
      button('保存经营荣誉卡',certificate),h('p',null,a.rounds<1?'完成第一轮后可以领取简版报告。':full?'完整报告已可领取。':`简版报告已可领取，再玩${3-a.rounds}轮可解锁完整评级。`),
      !claimed&&!summary&&button('把这单做成真的',()=>setSummary(true),{variant:'solid',disabled:a.rounds<1}),
      summary&&!claimed&&!form&&h('div',{className:'operation-feedback'},h('p',null,`${a.title} · ${full?'完整四维评估':'盈利力与经营认知简报'}；${a.suggestion}`),button('领取报告',()=>setForm(true),{variant:'solid'})),
      form&&h('form',{className:'v2-contact-form',onSubmit:save},h('p',null,'填写后解锁报告。当前本地预览只保存到本机，不会自动向外发送信息。'),
        h('label',null,'邮箱（必填）',h('input',{type:'email',required:true,maxLength:160,value:input.email,onChange:e=>change('email',e.target.value)})),
        [['category','主营类目',['家居','3C数码','美妆个护','服饰','户外','其他']],['followers','粉丝量段',['尚未运营','1万以下','1–10万','10–100万','100万以上']],['platform','主平台',['抖音','小红书','视频号','B站','TikTok','其他']]].map(([key,label,options])=>h('label',{key},`${label}（必填）`,h('select',{required:true,value:input[key],onChange:e=>change(key,e.target.value)},h('option',{value:''},'请选择'),options.map(x=>h('option',{key:x,value:x},x))))),
        h('label',null,'微信号（选填，想聊真实合作再留）',h('input',{value:input.wechat,maxLength:80,onChange:e=>change('wechat',e.target.value)})),
        h('label',{className:'v2-check'},h('input',{type:'checkbox',required:true,checked:input.consent,onChange:e=>change('consent',e.target.checked)}),'同意将联系方式和本次评估保存在本机，用于报告记录'),h('button',{type:'submit',className:'v2-save'},'领取报告')),
      claimed&&h(React.Fragment,null,h('div',{className:'v2-assessment-grid'},a.scores.filter(s=>full||['profit','knowledge'].includes(s.key)).map(s=>h('article',{key:s.key},h('h4',null,`${s.name} ${s.value}/100`),h('p',null,s.detail)))),h('p',null,a.suggestion),
        button('下载这份报告',()=>download(reportText(),'crossbound-经营评估报告.txt'),{variant:'solid'})),
      message&&h('p',{role:'status'},message)),h(CommunityCollection,{company,ops}));
  }
  return {ReportTabs,GoalCard,GrowthProgress,Financials,Community,CommunityCollection,Assessment};
}
