// Installed inside the existing bundle closure, immediately before React mounts.
const v11Original = { create: c1, snapshot: Ove, listingProduct: OR, listingQuote: zR, publish: oG,
  normalize: Uve, simulate: zve, preview: Rl, commit: gg, rollback: lG, next: uG, previous: Vve,
  deserialize: Cre, serialize: Gve, report: $dt, listingSelection: N5, reportView: oN,
  opsCommit: jse, opsDeserialize: Yse, opsSerialize: Fxe, growth: UG, ledger: FG, explanation: Zse };
let v11LegacyDepth = 0;
function v11Legacy(fn, ...args) { v11LegacyDepth++; try { return fn(...args); } finally { v11LegacyDepth--; } }
const V11 = createCrossboundV2({ products: Zn, markets: ks, stocks: Tre, channels: Z_, fulfillment: J_, expansion: rG,
  supplier: sG, fit: Mre, old: v11Original });
const V11Growth = createGrowth({ tasks: U5, facilities: r2, createOps: IG, commitOps: v11Original.opsCommit, purchase: Xse, rank: Tg, snapshot: $se, baseGrowth: v11Original.growth });
const V11UI = createCrossboundUI({ React: li, Button: Ge, engine: V11, Passport: Fse, passportData: Cxe, growth: (n, e) => UG(n, e) });
const V2UI = createV2UI({ React: li, Button: Ge, engine: V11, Base: V11UI, tasks: U5 });
Kse = [...Kse, { id: 'tariff', label: '预估关税' }, { id: 'clearance', label: '清仓回款' }];
zxe.tariff = '预估关税'; zxe.clearance = '清仓回款';
for (const [id, label] of [['importTax','进口税'],['firstMile','头程运输'],['payment','收款手续费'],['fx','换汇成本'],['warehouse','仓储费'],['offsite','站外推广'],['platformEntry','店铺费用'],['events','事件处理'],['testing','测款'],['trademark','模拟商标'],['season','旺季准备'],['packaging','差异化包装'],['loan','过桥贷款'],['loanRepayment','贷款还款'],['payables','到期采购款'],['receipts','平台回款'],['commissionRecovery','追回退货佣金']]) {
  if (!Kse.some(r=>r.id===id)) Kse.push({ id, label }); zxe[id] = label;
}
c1 = () => v11LegacyDepth ? v11Original.create() : V11.create();
Ove = n => V11.valid(n) ? V11.snapshot(n) : v11Original.snapshot(n);
N5 = input => {
  const normalized = v11Original.listingSelection(input);
  return normalized ? { ...normalized, ...input?.optimizationPoints ? { optimizationPoints: input.optimizationPoints } : {} } : null;
};
OR = (p, input) => v11LegacyDepth ? v11Original.listingProduct(p, input) : V11.listingProduct(p, input);
zR = (n, input) => V11.valid(n) ? V11.listingQuote(n, input) : v11Legacy(v11Original.listingQuote, n, input);
oG = (n, input) => V11.valid(n) ? V11.publish(n, input) : v11Legacy(v11Original.publish, n, input);
Uve = (n, input) => V11.valid(n) ? V11.normalize(n, input) : v11Legacy(v11Original.normalize, n, input);
zve = n => V11.valid(n) ? V11.simulate(n) : v11Legacy(v11Original.simulate, n);
Rl = (n, input) => V11.valid(n) ? V11.preview(n, input) : v11Legacy(v11Original.preview, n, input);
gg = (n, input) => V11.valid(n) ? V11.commit(n, input) : v11Legacy(v11Original.commit, n, input);
lG = (n, stage) => V11.valid(n) ? V11.rollback(n, stage) : v11Legacy(v11Original.rollback, n, stage);
uG = n => V11.valid(n) ? V11.next(n) : V11.migrate(v11Legacy(v11Original.next, n));
Vve = n => V11.valid(n) ? V11.previous(n) : v11Legacy(v11Original.previous, n);
Cre = raw => {
  if (!raw) return null;
  let parsed; try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  if (['crossbound.v11','crossbound.v2'].includes(parsed?.format)) return V11.deserialize(parsed);
  const restored = v11Legacy(v11Original.deserialize, raw);
  return restored ? V11.migrate(restored) : null;
};
Gve = n => V11.valid(n) ? V11.serialize(n) : v11Legacy(v11Original.serialize, n);
// Preserve the pre-upgrade save once. Never reset or overwrite the user's game to test a feature.
try {
  const saved = localStorage.getItem('crossbound-company-v1');
  if (saved && !localStorage.getItem('crossbound-company-before-v11')) localStorage.setItem('crossbound-company-before-v11', saved);
  if (saved && !localStorage.getItem('crossbound-company-before-v2')) localStorage.setItem('crossbound-company-before-v2', saved);
} catch {}
jse = V11Growth.commit;
Yse = V11Growth.deserialize;
Fxe = V11Growth.serialize;
UG = V11Growth.growth;
FG = (n, round) => {
  const result = v11Original.ledger(n, round), report = result.report;
  if (report?.modelVersion === 'v2') {
    let balance = 0;
    result.costRows = profitRows(report).map(row => { const before = balance; balance = t0(balance + row.amount); return { ...row, before, after: balance }; });
    return result;
  }
  if (report && report.modelVersion !== 'v11') result.report = { ...report, formula: '此历史成绩按当时规则计算：访问机会结合市场、商品和售价形成需求，库存限制订单，配送方案影响退货；收入扣除对应货品与经营费用后得到贡献利润。历史成绩未按新规则重算。' };
  if (report?.modelVersion !== 'v11') return result;
  const rows = result.costRows.filter(row => !['expansion'].includes(row.id));
  if (report.tariff) rows.push({ id: 'tariff', label: '美国站预估关税', amount: -report.tariff });
  if (report.clearanceLoss) rows.push({ id: 'clearance', label: '清仓货值损失', amount: -report.clearanceLoss });
  const expansionRow = result.costRows.find(row => row.id === 'expansion'); if (expansionRow) rows.push(expansionRow);
  let balance = 0;
  result.costRows = rows.map(row => { const before = balance; balance = t0(balance + row.amount); return { ...row, before, after: balance }; });
  return result;
};
Zse = (n, category) => {
  if (category === 'tariff' || category === 'clearance') {
    const entries = n.entries.filter(e => e.category === category);
    return { id: category, category, title: category === 'tariff' ? '预估关税' : '清仓货值损失', text: category === 'tariff' ? HELP.tariff[1] : HELP.inventory[1], entries,
      profitAmount: n.costRows.find(row => row.id === category)?.amount ?? 0, ...Vxe(entries) };
  }
  return v11Original.explanation(n, category);
};
oN = props => ['v11','v2'].includes(props.report?.modelVersion) ? li.createElement(li.Fragment,null,li.createElement(V11UI.Report, props),li.createElement(V2UI.ReportExtras, props)) : li.createElement(v11Original.reportView, props);
// Copy and language only; historical numeric rules remain untouched.
Z_[0].benefit = '匹配选题增加到访，10%内容流量顺延下轮'; Z_[0].risk = '投入内容制作，成交仍取决于商品、售价与库存';
Z_[1].benefit = '稳定触达，素材方向会影响购买意愿';
Z_[2].benefit = '达人有爆单与翻车波动，可选择合作规模'; Z_[2].risk = '按实际合作达人支付5%–10%分佣';
Z_[2].summary = '选合作达人，再定预算；成交后另计分佣。';
J_[2].summary = '2天交付，提高购买意愿；仍可能发生质量与主观退货。';
J_[2].benefit = '加急提高购买意愿，不等于零退款';
