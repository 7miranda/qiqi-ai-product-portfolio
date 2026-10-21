li.useEffect(()=>{
  if(!V11.valid(t)||t.stage>=6)return;
  const rec=recommend(V11,t),value=rec.choice;if(!value)return;
  A(value.id);if(t.stage===1)Ae(value.id);
  if(t.stage===2){M(value.quantity);w(value.price);qe(value.supplierId)}
  if(t.stage===3){N(value.budget);setV11Promotion({[value.id]:value.promotionChoice});oi(rec.listing);bt(t.currentListing?'promote':'create')}
},[t.round,t.stage,t.runSeed]);
