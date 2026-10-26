// REQ-049 teaching calibration. Saved rounds retain their own economics.
export const BALANCE_VERSION = 'friendly-20261022';
export const friendly = state => state?.balanceVersion === BALANCE_VERSION;
// REQ-052 (interim): settlement returns unsold stock at cost, so nothing carries into the next round.
// Restoring carry-over needs a new product decision; do not flip this silently.
export const STOCK_CARRYOVER = false;
export const balanceRules = state => friendly(state)
  ? { conversion: .036, elasticity: 1.1, arrivalFloor: .75, priceRefundSlope: .12, maxPrice: 2 }
  : { conversion: .025, elasticity: 1.4, arrivalFloor: 0, priceRefundSlope: .02, maxPrice: 1.5 };
export function balanceOptions(state, kind, rows) {
  if (!friendly(state)) return rows;
  return rows.map(row => {
    if (kind === 'markets') return { ...row, launchCost: Math.round(row.launchCost * .6 * 100) / 100,
      freightFactor: row.id === 'los-angeles' ? 1.3 : row.freightFactor };
    if (kind === 'channels') return { ...row, budget: ({ ads: 2200, creator: 1800 })[row.id] ?? row.budget };
    if (kind === 'fulfillment' && row.id === 'express') return { ...row, costPerOrder: 6.5, risk: '基础运费 $6.50 / 单' };
    return row;
  });
}
// Unit contribution before acquisition cost: all variable operating costs are included.
export function acquisitionRisk(result) {
  if (!result) return null;
  const variable = ['cogs', 'writeoffCost', 'returnHandlingCost', 'shippingCost', 'platformFees',
    'tariff', 'importTax', 'paymentFee', 'fxFee', 'packagingCost'].reduce((sum, key) => sum + (result[key] || 0), 0)
    + (result.orders || 0) * (result.firstMileUnit || 0);
  const unitMargin = result.keptOrders > 0 ? (result.netRevenue - variable) / result.keptOrders : null;
  const paid = (result.attribution || []).filter(row => ['ads', 'creator'].includes(row.id) && row.spend > 0);
  return paid.map(row => ({ id: row.id, name: row.name, cac: row.cac, unitMargin,
    warning: unitMargin == null || row.cac == null || unitMargin <= 0 || row.cac > unitMargin * .5 }));
}
