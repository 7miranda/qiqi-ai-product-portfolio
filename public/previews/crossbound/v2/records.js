import { goal } from './release.js';
import { apiPath } from './api.js';
import { assessment } from './progress.js';
export const DATA_VERSION='2026-10-22';
export const userId=company=>company.v2?.collectionIdentity || company.v2?.identity || `legacy-${company.runSeed}`;
const uid=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const KEY='crossbound-outbox-20261021';
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}};
const localBackend=()=>typeof location!=='undefined' && /^https?:$/.test(location.protocol);
let sending=false;
export function enqueue(type,id,data) {
  try {
    const queue=read(KEY).filter(row=>row.id!==id);
    queue.push({id,type,data:{schema_version:DATA_VERSION,game_version:'crossbound-20261022',...data},at:new Date().toISOString()});
    localStorage.setItem(KEY,JSON.stringify(queue));
  } catch { /* Storage/network trouble must never block play. */ }
}
export async function flush() {
  if(sending || !localBackend()) return;
  const batch=read(KEY).slice(0,100); if(!batch.length) return;
  sending=true;
  try {
    const res=await fetch(apiPath('records'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({records:batch})});
    if(!res.ok) throw new Error('offline');
    const {accepted}=await res.json();
    const confirmed=new Set(accepted || []);
    // Keep newer revisions added while this batch was in flight.
    const sent=new Map(batch.map(r=>[r.id,JSON.stringify(r)]));
    const remaining=read(KEY).filter(r=>!confirmed.has(r.id)||sent.get(r.id)!==JSON.stringify(r));
    // Temporarily unmet prerequisites must not hold newer round snapshots behind them.
    const pending=remaining.filter(r=>sent.get(r.id)===JSON.stringify(r));
    localStorage.setItem(KEY,JSON.stringify([...remaining.filter(r=>sent.get(r.id)!==JSON.stringify(r)),...pending]));
  } catch {} finally {sending=false;}
}
export function track(company,event,details={},key=uid()) {
  const user=userId(company);
  enqueue('events',`${user}:event:${key}`,{user_id:user,run_seed:company.runSeed,round:company.round,event,...details});flush();
}
export function capture(company,ops,started,tasks=[],engine) {
  const user=userId(company);
  const source=typeof location==='undefined'?'direct':new URLSearchParams(location.search).get('utm_source')||'direct';
  const base={user_id:user,run_seed:company.runSeed,source,round:company.round,balance_version:company.balanceVersion||'historical',goal_version:company.goalVersion||'historical'};
  enqueue('events',`${user}:entry`,{...base,event:'game_enter'});
  if(!started) {flush();return;}
  enqueue('events',`${user}:start`,{...base,event:'game_start'});
  enqueue('events',`${user}:${company.round}:stage:${company.stage}`,{...base,event:'stage_reach',stage:company.stage});
  const detail=(state,report=state)=>({category:engine?.products.find(p=>p.id===state.productId)?.category,quantity:report.quantity??state.decisions?.[2]?.quantity,fulfillment:state.fulfillmentPlanId??state.decisions?.[4]?.id,promotion:state.decisions?.[3]?.promotionChoice?.id,rating_after:report.ratingAfter,bad_reviews:report.badReviews});
  for(const old of company.history){
    enqueue('round_reports',`${user}:round:${old.round}`,{...base,...detail(old),round:old.round,balance_version:old.balanceVersion||'historical',goal_version:old.goalVersion||'historical',completed:true,exit_stage:6,market:old.marketId,product:old.productId,price:old.price,channel:old.decisions?.[3]?.id,decisions:old.decisions||[],listing_score:old.listingScore,orders:old.orders,refunds:old.refunds,kept_orders:old.keptOrders,profit:old.profit,passed:goal(old).passed,used_default:(old.decisions||[]).map(d=>d.used_default??null)});
    enqueue('events',`${user}:${old.round}:complete`,{...base,round:old.round,event:'round_complete'});
  }
  const completed=company.stage===6, report=company.report;
  enqueue('round_reports',`${user}:round:${company.round}`,{...base,...detail(company,report||{}),completed,exit_stage:company.stage,
    market:company.marketId,product:company.productId,price:company.price,channel:company.trafficPlanId,
    decisions:company.decisions,listing_score:company.currentListing?.score || report?.listingScore,
    ...(report?{orders:report.orders,refunds:report.refunds,kept_orders:report.keptOrders,profit:report.profit,passed:goal(report).passed}:{}),
    used_default:company.decisions.map(d=>d.used_default ?? null)});
  (ops.history || []).forEach((event,index)=>{
    if(!['operation','review'].includes(event.type))return;
    enqueue('quiz_answers',`${user}:quiz:${index}`,{...base,round:event.round??null,task_type:event.type==='review'?'review':'hq',task_id:event.operationId || `review:${event.evidence?.round}`,choice:event.choiceId,correct:event.type==='review'?event.choiceId==='investigate':!!tasks.find(t=>t.id===event.operationId)?.choices.find(c=>c.id===event.choiceId)?.correct,operation:event});
  });
  if(engine&&company.history.length){const a=assessment(company,ops,engine.markets,tasks);enqueue('assessments',`${user}:assessment:${company.history.length}`,{...base,...assessmentData(a)});}
  flush();
}
export function captureExit(company) {
  const user=userId(company);
  enqueue('events',`${user}:${company.round}:exit`,{user_id:user,round:company.round,event:'round_exit',completed:company.stage===6,exit_stage:company.stage});
  if(localBackend() && navigator.sendBeacon) navigator.sendBeacon(apiPath('records'),new Blob([JSON.stringify({records:read(KEY).slice(0,100)})],{type:'application/json'}));
}
export function feedbackState(company) {
  try{return JSON.parse(localStorage.getItem(`crossbound-feedback:${userId(company)}`)||localStorage.getItem(`crossbound-feedback:${company.runSeed}`)||'{}')}catch{return {}}
}
export function saveFeedback(company,value) {
  const user=userId(company);
  const claim={type:'community',id:value.deep?'deep':'first',run:user,rounds:company.history.length,substantive:!!value.comment?.trim()};
  const next={...feedbackState(company),...value,[value.deep?'deepClaim':'firstClaim']:claim};
  localStorage.setItem(`crossbound-feedback:${user}`,JSON.stringify(next));
  enqueue('feedback',`${user}:${value.deep?'deep':'first'}`,{user_id:user,rounds_played:company.history.length,survey_version:'v2',...value});
  track(company,'feedback_submit',{survey_version:'v2',deep:!!value.deep},`feedback:${value.deep?'deep':'first'}`);flush();
  return next;
}
export function validComment(text) {return !text.trim() || (Array.from(text.trim()).length>=15 && Array.from(text.trim()).length<=100)}
export async function publishedAdoptions(signal) {
  const response=await fetch(apiPath('community/adoptions'),{signal,cache:'no-store'});
  if(!response.ok)throw new Error('公示暂时无法加载');
  const body=await response.json();
  if(!Array.isArray(body.releases))throw new Error('公示暂时无法加载');
  return body.releases;
}
export async function communityBadgeNumber(user) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user));
  return 'CO-'+Array.from(new Uint8Array(bytes)).slice(0,8).map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
}
export function csv(rows,fields) {
  const cell=v=>'"'+String(v??'').replace(/^\s*[=+\-@]/,"'$&").replaceAll('"','""')+'"';
  return '\ufeff'+[fields,...rows.map(r=>fields.map(f=>r[f]))].map(r=>r.map(cell).join(',')).join('\r\n');
}
export function leadRecords(){return read('crossbound-leads-20261021')}
export function assessmentData(a){return {...a,...Object.fromEntries(a.scores.map(s=>[s.key+'_score',s.value]))};}
export function saveLead(company,assessment,input) {
  if(!input.consent || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || !input.category || !input.followers || !input.platform || company.history.length<1) throw new Error('请补全必填项并同意本机保存。');
  const row={...input,user_id:userId(company),number:assessment.number,score:assessment.averageScore,
    consent_at:new Date().toISOString(),policy_version:'cooperation-v2',touchpoint:'report',tier:company.history.length>=3?'full':'brief',assessment:assessmentData(assessment)};
  const rows=leadRecords().filter(x=>x.user_id!==row.user_id);rows.push({user_id:row.user_id,number:row.number,tier:row.tier});
  localStorage.setItem('crossbound-leads-20261021',JSON.stringify(rows));
  const id=`${row.user_id}:lead:${uid()}`;enqueue('leads',id,row);track(company,'lead_submit',{tier:row.tier},id.slice(row.user_id.length+1));flush();return row;
}
