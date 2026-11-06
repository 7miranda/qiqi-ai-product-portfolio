// The round checkpoint lives with the company save, not in transient scene state.
const [v11Failure,v11SetFailure]=li.useState(null),v11Recovering=li.useRef(false);
function i(value){
  v11SetCompany(current=>{
    const next=typeof value==='function'?value(current):value;
    if(!next||next.engineVersion!=='v2')return next;
    const same=next.v2.identity===current.v2?.identity&&next.round===current.round;
    const sameOwner=(next.v2.collectionIdentity||next.v2.identity)===(current.v2?.collectionIdentity||current.v2?.identity||`legacy-${current.runSeed}`);
    const baseline=same?(current.recoveryOps||V11Growth.serialize(V11Growth.roundStartOps(r,current))):V11Growth.serialize(sameOwner?r:IG());
    return {...next,recoveryOps:next.recoveryOps||baseline};
  });
}
li.useLayoutEffect(()=>{
  if(t.engineVersion==='v2'&&!t.recoveryOps)i(t);
},[t.v2?.identity,t.round,t.recoveryOps]);
function v11Recover(quote=pr){
  const problem=cashFailure(t,quote);
  if(!problem||!V11.valid(t))return false;
  v11SetFailure(problem);return true;
}
function v11CommunityReward(claim){
  if(!claim)return;
  s(cur=>V11Growth.claimCommunity(cur,claim));
  i(cur=>V11.grantCommunity(cur,claim));
}
function v11RestartRound(){
  if(v11Recovering.current||t.stage>=6)return;
  v11Recovering.current=true;
  try{
    let company=t,ops=V11Growth.restoreRoundOps(r,t);
    const saved=feedbackState(t);
    for(const claim of [saved.firstClaim,saved.deepClaim].filter(Boolean)){
      company=V11.grantCommunity(company,claim);ops=V11Growth.claimCommunity(ops,claim);
    }
    company=V11.restartRound(company);
    if(saved.firstClaim)company=V11.grantCommunity(company,saved.firstClaim);
    company.recoveryOps=V11Growth.serialize(ops);
    const encoded=V11.serialize(company),growth=V11Growth.serialize(ops);
    if(!V11.deserialize(encoded)||!growth)throw Error('恢复存档校验失败，请返回调整后重试。');
    saveRecovery(localStorage,encoded,growth);
    // Drafts are scoped to the old attempt and must never select a stale supplier/listing on retry.
    for(const key of ['crossbound-pricing-draft-v1','crossbound-studio-draft-v1','crossbound-world-w1-v1','crossbound-supply-choice-v1'])try{localStorage.removeItem(key)}catch{}
    if(o2.current)clearTimeout(o2.current);
    Bt(false);N0.current=true;jt(null);De({productId:null,supplierId:"standard",quantity:400});setV11Promotion({});oi({rule:'listing-v1',titleId:'name',imageId:'product',detailId:'summary',mode:'build'});
    v11Flow.finish();tn(null);u(null);window.CrossboundScenes?.reset?.();
    s(ops);v11SetCompany(company);v11SetFailure(null);d('market');u('decision');
    Ai('本轮已恢复，重新选择市场开始经营。');
  }catch(error){throw new Error('本轮恢复未完成，请重试或刷新后继续。'+(error.message||''));}
  finally{v11Recovering.current=false;}
}
