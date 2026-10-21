import { goal } from './release.js';
const KEY='crossbound-outbox-20261021';
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}};
const localBackend=()=>['localhost','127.0.0.1'].includes(location.hostname);
let sending=false;
export function enqueue(type,id,data) {
  try {
    const queue=read(KEY).filter(row=>row.id!==id);
    queue.push({id,type,data,at:new Date().toISOString()});
    localStorage.setItem(KEY,JSON.stringify(queue));
  } catch { /* Storage/network trouble must never block play. */ }
}
export async function flush() {
  if(sending || !localBackend()) return;
  const batch=read(KEY).slice(0,100); if(!batch.length) return;
  sending=true;
  try {
    const res=await fetch('/api/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({records:batch})});
    if(!res.ok) throw new Error('offline');
    const {accepted}=await res.json();
    const confirmed=new Set(accepted || []);
    // Keep newer revisions added while this batch was in flight.
    const sent=new Map(batch.map(r=>[r.id,JSON.stringify(r)]));
    localStorage.setItem(KEY,JSON.stringify(read(KEY).filter(r=>!confirmed.has(r.id)||sent.get(r.id)!==JSON.stringify(r))));
  } catch {} finally {sending=false;}
}
export function capture(company,ops,started,tasks=[]) {
  const user=company.v2?.identity || `legacy-${company.runSeed}`;
  if(!started) return;
  const base={user_id:user,run_seed:company.runSeed,round:company.round};
  enqueue('events',`${user}:start`,{...base,event:'game_start'});
  enqueue('events',`${user}:${company.round}:stage:${company.stage}`,{...base,event:'stage_reach',stage:company.stage});
  for(const old of company.history)enqueue('round_reports',`${user}:round:${old.round}`,{...base,round:old.round,completed:true,exit_stage:6,market:old.marketId,product:old.productId,price:old.price,channel:old.decisions?.[3]?.id,decisions:old.decisions,listing_score:old.listingScore,orders:old.orders,refunds:old.refunds,kept_orders:old.keptOrders,profit:old.profit,passed:goal(old).passed,used_default:(old.decisions||[]).map(d=>d.used_default??null)});
  const completed=company.stage===6, report=company.report;
  enqueue('round_reports',`${user}:round:${company.round}`,{...base,completed,exit_stage:company.stage,
    market:company.marketId,product:company.productId,price:company.price,channel:company.trafficPlanId,
    decisions:company.decisions,listing_score:company.currentListing?.score || report?.listingScore,
    ...(report?{orders:report.orders,refunds:report.refunds,kept_orders:report.keptOrders,profit:report.profit,passed:goal(report).passed}:{}),
    used_default:company.decisions.map(d=>d.used_default ?? null)});
  (ops.history || []).forEach((event,index)=>{
    if(!['operation','review'].includes(event.type))return;
    enqueue('quiz_answers',`${user}:quiz:${index}`,{...base,round:event.round || company.round,task_id:event.operationId || `review:${event.evidence?.round}`,choice:event.choiceId,correct:event.type==='review'?event.choiceId==='investigate':!!tasks.find(t=>t.id===event.operationId)?.choices.find(c=>c.id===event.choiceId)?.correct,operation:event});
  });
  flush();
}
export function captureExit(company) {
  const user=company.v2?.identity || `legacy-${company.runSeed}`;
  enqueue('events',`${user}:${company.round}:exit`,{user_id:user,round:company.round,event:'round_exit',completed:company.stage===6,exit_stage:company.stage});
  if(localBackend() && navigator.sendBeacon) navigator.sendBeacon('/api/records',new Blob([JSON.stringify({records:read(KEY).slice(0,100)})],{type:'application/json'}));
}
export function feedbackState(company) {
  try{return JSON.parse(localStorage.getItem(`crossbound-feedback:${company.v2?.identity||company.runSeed}`)||'{}')}catch{return {}}
}
export function saveFeedback(company,value) {
  const user=company.v2?.identity || String(company.runSeed);
  const claim={type:'community',id:value.deep?'deep':'first',run:user,rounds:company.history.length,substantive:!!value.comment?.trim()};
  const next={...feedbackState(company),...value,[value.deep?'deepClaim':'firstClaim']:claim};
  localStorage.setItem(`crossbound-feedback:${user}`,JSON.stringify(next));
  enqueue('feedback',`${user}:${value.deep?'deep':'first'}`,{user_id:user,rounds_played:company.history.length,...value});flush();
  return next;
}
export function validComment(text) {return !text.trim() || (Array.from(text.trim()).length>=15 && Array.from(text.trim()).length<=100)}
export function csv(rows,fields) {
  const cell=v=>'"'+String(v??'').replace(/^\s*[=+\-@]/,"'$&").replaceAll('"','""')+'"';
  return '\ufeff'+[fields,...rows.map(r=>fields.map(f=>r[f]))].map(r=>r.map(cell).join(',')).join('\r\n');
}
export function leadRecords(){return read('crossbound-leads-20261021')}
export function saveLead(company,assessment,input) {
  if(!input.consent || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || !input.category || !input.followers || !input.platform || company.history.length<1) throw new Error('请补全必填项并同意本机保存。');
  const row={...input,user_id:company.v2?.identity||String(company.runSeed),number:assessment.number,score:assessment.averageScore,
    consent_at:new Date().toISOString(),tier:company.history.length>=3?'full':'brief',assessment,delivery:'local_only'};
  const rows=leadRecords().filter(x=>x.user_id!==row.user_id);rows.push(row);
  localStorage.setItem('crossbound-leads-20261021',JSON.stringify(rows));
  enqueue('leads',`${row.user_id}:lead`,row);flush();return row;
}
