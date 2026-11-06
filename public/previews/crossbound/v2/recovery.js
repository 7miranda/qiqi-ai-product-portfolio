// Shared by every scene. Quotes remain authoritative; MOQ/locked-market errors are not bankruptcy.
export const COMMUNITY_CAPITAL = 10000;
export function cashFailure(company, quote) {
  if (!company || company.stage >= 6 || !quote || quote.marketBlocked || (quote.supplyBlockedReason && !quote.cashBlocked)) return null;
  const required = Math.max(0, quote.cashNeed ?? quote.cost ?? (Number.isFinite(quote.cashDelta)?-quote.cashDelta:0), quote.overdueAmount || 0);
  const shortfall = Math.round((required - company.cash) * 100) / 100;
  return Number.isFinite(shortfall) && shortfall > 0 ? {cash:company.cash, required, shortfall, stage:company.stage, listing:company.stage===3&&!company.currentListing} : null;
}
export const recoveryJournal = 'crossbound-round-recovery-v1';
export function saveRecovery(storage, company, operations) {
  if (!company || !operations) throw Error('恢复存档校验失败。');
  storage.setItem(recoveryJournal, JSON.stringify({company, operations}));
  finishRecovery(storage);
}
export function finishRecovery(storage) {
  const raw=storage.getItem(recoveryJournal); if(!raw)return;
  const value=JSON.parse(raw);
  if(typeof value.company!=='string'||typeof value.operations!=='string')throw Error('恢复记录不完整。');
  storage.setItem('crossbound-company-v1',value.company);
  storage.setItem('crossbound-operations-v1',value.operations);
  storage.removeItem(recoveryJournal);
}
