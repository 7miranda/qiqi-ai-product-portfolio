// Teaching scenarios, not live tax, exchange-rate or platform-availability data.
// Each country is explicit. A zero customs duty never implies zero import tax.
export const TAX_VERSION = '2026-10-teaching-1';
const eu = 'https://europa.eu/youreurope/business/finance-and-tax/vat/vat-rules-rates/index_en.htm';
const profile = (country, currency, fx, duty, importRate, taxName, source, fact) =>
  ({ country, currency, fx, duty, importRate, taxName, source, fact, fxFee: currency === 'USD' ? 0 : .01 });
export const TAX = {
  singapore: profile('新加坡', 'SGD', 1.3, 0, .09, '进口 GST', 'https://www.iras.gov.sg/taxes/goods-services-tax-(gst)/claiming-gst-(input-tax)/importing-of-goods/', '普通消费品通常不在四类应税货品内；关税为零仍需考虑进口 GST。'),
  london: profile('英国', 'GBP', .77, .04, .20, '进口 VAT', 'https://www.gov.uk/goods-sent-from-abroad/tax-and-duty', '关税与进口 VAT 分开核算；商品分类、货值及进口方式会改变实际处理。'),
  'los-angeles': profile('美国', 'USD', 1, .08, 0, '进口增值税（本模型不设）', 'https://www.cbp.gov/trade/basic-import-export', '关税取决于商品分类和原产地等条件；8% 是游戏参数，不是美国统一实际税率。'),
  berlin: profile('德国', 'EUR', .92, .04, .19, '进口 VAT', eu, '欧盟关税规则与德国进口增值税是两层费用。'),
  paris: profile('法国', 'EUR', .92, .04, .20, '进口 VAT', eu, '同在欧盟，进口增值税标准税率仍可能不同。'),
  tokyo: profile('日本', 'JPY', 150, .03, .10, '进口消费税', 'https://www.customs.go.jp/english/c-answer_e/imtsukan/1111_e.htm', '进口消费税与关税分别计算；部分商品可能适用减税或豁免。'),
  sydney: profile('澳大利亚', 'AUD', 1.5, .05, .10, '进口 GST', 'https://www.abf.gov.au/importing-exporting-and-manufacturing/importing/cost-of-importing-goods', '进口 GST 的计税基础会包含货值、相关运费及关税。'),
  toronto: profile('加拿大', 'CAD', 1.36, .05, .05, '进口 GST', 'https://www.cbsa-asfc.gc.ca/import/postal-postale/dtytx-drttx-eng.html', '本关按商业进口的联邦 GST 简化；目的地省税和最终零售税未模拟。'),
  dubai: profile('阿联酋', 'AED', 3.67, .05, .05, '进口 VAT', 'https://u.ae/en/information-and-services/finance-and-investment/clearing-the-customs-and-paying-customs-duty', '海关估价、关税及 VAT 分开理解；特殊商品和自由区规则另有差异。'),
  'mexico-city': profile('墨西哥', 'MXN', 18, .12, .16, '进口 IVA', 'http://omawww.sat.gob.mx/aduanas/importando_exportando/guia_importacion/Paginas/contribuciones_que_puedan_causarse_con_importacion.aspx', '进口关税与 IVA 不应混成一项；游戏关税为平衡参数，未模拟特定清关方案。'),
  'sao-paulo': profile('巴西', 'BRL', 5, .20, .17, '进口综合税负（教学参数）', 'https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/compras-internacionais', '巴西进口税制包含多层税费。本关用单独的综合参数演示，不代表真实 II、ICMS 或其他税的合计税率。'),
  amsterdam: profile('荷兰', 'EUR', .92, .04, .21, '进口 VAT', eu, '荷兰进口 VAT 与欧盟关税分开核算；经营者可能符合抵扣或递延条件。'),
};
export const TAX_NOTE = '教学估算：关税按国家与品类配置，除明确说明外均为游戏参数，不是实时 HS 税率。按发货订单分摊货值与头程费用，卖家承担进口税费；未模拟起征点、原产地优惠、抵扣、消费端销售税和退税。固定汇率仅用于展示。';
export function taxQuote(marketId, product, orders = 0, unitCost = 0, firstMileUnit = 0) {
  const p = TAX[marketId];
  if (!p) throw new Error(`Missing tax profile: ${marketId}`);
  const round = n => Math.round(n * 100) / 100;
  const categoryFactor = { electronics: .8, home: 1, lifestyle: 1.2, furniture: 1.1, outdoor: 1, future: .9 }[product?.category] ?? 1;
  const dutyRate = round(p.duty * categoryFactor * 100) / 100;
  const customsValue = round(orders * (unitCost + firstMileUnit));
  const tariff = round(customsValue * dutyRate);
  const importTax = round((customsValue + tariff) * p.importRate);
  return { ...p, dutyRate, customsValue, tariff, importTax, version: TAX_VERSION };
}
export const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok Shop', fee: .06, entry: 0, traffic: 1, conversion: 1, detail: '模拟佣金6%；内容和达人触达+20%；入驻费$0' },
  { id: 'amazon', name: 'Amazon', fee: .15, entry: 39, traffic: 1, conversion: 1.12, detail: '模拟佣金15%；购买意愿+12%；每轮店铺费$39' },
  { id: 'direct', name: '独立站', fee: 0, entry: 500, traffic: .75, conversion: 1, detail: '无平台佣金；首次建站$500；初期触达为75%' },
];
// REQ-054: the friendly arrival floor (75%) only protects the cheapest tier; faster tiers lift it by 10 / 20 points.
export const FIRST_MILE = [
  { id: 'sea', name: '海运', days: 14, unit: .4, arrivalBonus: 0, detail: '运输14天 · 每件$0.40 × 体积系数' },
  { id: 'mixed', name: '海空联运', days: 7, unit: 1, arrivalBonus: .1, detail: '运输7天 · 每件$1.00 × 体积系数' },
  { id: 'air', name: '空运', days: 2, unit: 2.2, arrivalBonus: .2, detail: '运输2天 · 每件$2.20 × 体积系数' },
];
export const BIDS = [
  { id: 'low', name: '长尾词 · 低出价', clicks: .85, conversion: 1.18, range: [.9, 1.1] },
  { id: 'balanced', name: '品类词 · 均衡出价', clicks: 1, conversion: 1, range: [.8, 1.2] },
  { id: 'high', name: '热门词 · 高出价', clicks: 1.25, conversion: .86, range: [.65, 1.35] },
];
export const TIME_SLOTS = [
  { id: 'all', name: '全天投放', traffic: 1, conversion: 1 },
  { id: 'evening', name: '当地晚间', traffic: .9, conversion: 1.15 },
  { id: 'offpeak', name: '低峰时段', traffic: 1.1, conversion: .9 },
];
export const OFFSITE = [
  { id: 'none', name: '暂不做站外推广', detail: '保持当前方案', visitors: 1, price: 1, cost: 0, rating: 0 },
  { id: 'deal', name: 'Deal 站促销', detail: '到访×1.5，成交价八五折，费用$300', visitors: 1.5, price: .85, cost: 300, rating: 0 },
  { id: 'review', name: '测评种草', detail: '增加少量到访，评分+0.2，费用$400', visitors: 1.08, price: 1, cost: 400, rating: .2 },
];
export const CONFIG_DEFAULTS = { platform: 'tiktok', firstMile: 'air', terms: 'cash', negotiation: 'none', bid: 'balanced', timeSlot: 'all', offsite: 'none', seasonPrep: false };
export const SEASONS = ['备战期', '预热期', '收割期'];
export function season(round) { return { index: (round - 1) % 3, name: SEASONS[(round - 1) % 3], untilHarvest: 2 - (round - 1) % 3 }; }
// Explicit product × city values are materialized in product-fit.json. This is
// editorial game calibration, never claimed as real sales or market research.
