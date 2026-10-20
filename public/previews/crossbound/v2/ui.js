import { TAX, TAX_NOTE, taxQuote, PLATFORMS, FIRST_MILE, BIDS, TIME_SLOTS, OFFSITE, season } from './catalog.js';
import { passport, explorationAwards, assessment, benchmark, badgeCelebration, rememberBadgeCelebration } from './progress.js';
import { productFit } from './product-fit.js';

export function createV2UI({ React, Button, engine, Base, tasks }) {
  const h = React.createElement, cash = n => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = n => `${(n * 100).toFixed(1)}%`;
  const button = (label, onClick, props = {}) => h(Button, { variant: 'outline', onClick, ...props }, label);
  const panel = (title, ...body) => h('section', { className: 'report-insights-panel v2-panel' }, h('h4', null, title), ...body);
  const details = (title, ...body) => h('details', { className: 'decision-optional v2-details' }, h('summary', null, title), ...body);
  const rows = pairs => h('dl', { className: 'v2-metrics' }, pairs.map(([label, value]) => h('div', { key: label }, h('dt', null, label), h('dd', null, value))));
  // Presentation receipts are separate from the game ledger and survive rollback.
  const badgeReceipts = new Map();
  function readBadgeReceipts(key) {
    let saved = {};
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      if (value && typeof value === 'object' && !Array.isArray(value)) saved = value;
    } catch {}
    for (const [marketId, tier] of Object.entries(badgeReceipts.get(key) || {})) saved = rememberBadgeCelebration(saved, { marketId, tier });
    return saved;
  }
  function BadgeCelebration({ company }) {
    const receiptKey = `crossbound-badge-celebrations:${company.runSeed ?? company.v2?.identity ?? 'legacy'}`;
    const [award, setAward] = React.useState(() => badgeCelebration(company, engine.markets, readBadgeReceipts(receiptKey)));
    const dialogRef = React.useRef(null);
    const dismiss = () => setAward(null);
    React.useEffect(() => {
      if (!award) return;
      const dialog = dialogRef.current;
      // The report is also a native dialog; its parent effect opens it after the
      // child effects. Open this card next frame so it is above the report.
      const frame = requestAnimationFrame(() => {
        if (!dialog.isConnected) return;
        dialog.showModal();
        const seen = rememberBadgeCelebration(readBadgeReceipts(receiptKey), award);
        badgeReceipts.set(receiptKey, seen);
        try { localStorage.setItem(receiptKey, JSON.stringify(seen)); } catch {}
      });
      // Do not let Escape also close the report underneath this native modal.
      const escape = e => {
        if (e.key === 'Escape' && dialog.open) {
          e.preventDefault(); e.stopImmediatePropagation(); dismiss();
        }
      };
      document.addEventListener('keydown', escape, true);
      return () => {
        cancelAnimationFrame(frame);
        document.removeEventListener('keydown', escape, true);
        if (dialog.open) dialog.close();
        const title = document.getElementById('campaign-dialog-title');
        if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
      };
    }, [award, receiptKey]);
    if (!award) return null;
    const label = { bronze: '铜章', silver: '银章', gold: '金章' };
    return h('dialog', { ref: dialogRef, className: `v2-badge-celebration tier-${award.tier}`,
      'aria-labelledby': 'badge-celebration-title', 'aria-describedby': 'badge-celebration-description',
      onCancel: e => { e.preventDefault(); dismiss(); } },
      h('button', { type: 'button', className: 'v2-badge-close', 'aria-label': '关闭徽章弹窗，继续查看战报', onClick: dismiss, autoFocus: true }, '×'),
      h('span', { className: 'v2-badge-eyebrow' }, award.previousTier ? '出海成就 / 印章升级' : '出海成就 / 新的足迹'),
      h('div', { className: 'v2-badge-art' }, h(Base.CountryBadge, { marketId: award.marketId, tier: award.tier })),
      h('h2', { id: 'badge-celebration-title' }, '恭喜你获得', h('strong', null, `${award.country} · ${label[award.tier]}`)),
      h('p', { id: 'badge-celebration-description', className: 'v2-badge-description' },
        award.previousTier ? `从${label[award.previousTier]}升级为${label[award.tier]}，这一次，你又向前了一步。` : `在${award.country}留下第一枚印章，新的出海故事从这里开始。`),
      h('dl', { className: 'v2-badge-results' },
        h('div', null, h('dt', null, '本轮未退款订单'), h('dd', null, `${award.keptOrders.toLocaleString('zh-CN')} 单`)),
        h('div', null, h('dt', null, '本轮贡献利润'), h('dd', null, cash(award.profit)))),
      h('p', { className: 'v2-badge-saved' }, '已收录至「出海成就」'),
      h('button', { type: 'button', className: 'v2-badge-continue', onClick: dismiss }, '继续查看本轮战报', h('span', { 'aria-hidden': true }, '→')));
  }
  function Choices({ label, options, value, onChange }) {
    return h('fieldset', { className: 'v2-choices' }, h('legend', null, label), h('div', { className: 'decision-choice-list' },
      options.map(o => button(h(React.Fragment, null, h('strong', null, o.name), o.detail && h('small', null, o.detail)), () => onChange(o.id),
        { key: o.id, 'aria-pressed': value === o.id }))));
  }
  function TaxCard({ company, market, preview }) {
    const id = market?.id || company.marketId, product = engine.products.find(p => p.id === company.productId);
    if (!TAX[id]) return null;
    const tax = taxQuote(id, product);
    return details(`${tax.country} · 关税、进口税与收款费用`,
      rows([['关税（教学参数）', `${product ? '' : '品类基准 '}${pct(tax.dutyRate)}`], [tax.taxName, pct(tax.importRate)], ['收款手续费', '净销售额的3.5%'], ['换汇成本', pct(tax.fxFee)], ['固定演示汇率', `1 USD = ${tax.fx} ${tax.currency}`]]),
      h('p', null, tax.fact), preview?.tax?.country === tax.country && h('p', null, `当前方案预计：关税${cash(preview.tariff)}，进口税${cash(preview.importTax)}。实际以发货结算为准。`),
      h('p', { className: 'panel-note' }, TAX_NOTE),
      h('a', { href: tax.source, target: '_blank', rel: 'noreferrer' }, '查看税制参考来源 ↗'));
  }
  function Finance({ company, onChange, preview }) {
    const [loan, setLoan] = React.useState(null);
    if (!company.v2) return null;
    const debt = [...company.v2.payables.map(r => ({ ...r, label: '采购款' })), ...company.v2.loans.map(r => ({ ...r, label: '贷款本息' }))].filter(r => !r.paid);
    const incoming = company.v2.receivables.filter(r => !r.paid);
    const need = Math.max(preview?.cashShortfall || 0, debt.filter(r => r.dueRound <= company.round).reduce((s, r) => s + r.amount, 0) - company.cash);
    const amounts = [...new Set([2000, 5000, 10000, 20000, ...(need > 20000 ? [Math.min(200000, Math.ceil(need / 1000) * 1000)] : [])])];
    return details(preview?.cashShortfall ? `现金缺口 ${cash(preview.cashShortfall)} · 查看过桥方案` : '资金时间线 · 回款、账期与过桥方案',
      rows([['可用现金', cash(company.cash)], ['平台及佣金应收', cash(incoming.reduce((s, r) => s + r.amount, 0))], ['待付采购款与贷款', cash(debt.reduce((s, r) => s + r.amount, 0))]]),
      h('ol', null, h('li', null, '备货：现款支付或记录下轮到期采购款。'), h('li', null, '发货：先付运输、税费、佣金与仓储费，销售净收入计入应收。'), h('li', null, '交付后14天：推进到下轮开局时回款，再支付到期采购款和贷款。')),
      incoming.map((r, i) => h('p', { key: `in${i}` }, `第${r.dueRound}轮开局到账：${r.kind === 'commission' ? '退货佣金追回' : '平台净销售款'} ${cash(r.amount)}`)),
      debt.map((r, i) => h('p', { key: `out${i}` }, `${r.dueRound <= company.round ? '已到期' : `第${r.dueRound}轮到期`}：${r.label} ${cash(r.amount)}`)),
      company.stage <= 4 && !company.v2.loans.some(l => l.round === company.round) && h(React.Fragment, null,
        h('p', null, '过桥贷款每轮最多一次，下轮偿还，单轮利息12%。本金不算营业收入。'),
        h('div', { className: 'v2-inline-actions' }, amounts.map(amount => button(`借入 ${cash(amount)}`, () => setLoan(amount), { key: amount }))),
        loan && h('div', { className: 'operation-feedback', role: 'alert' }, h('p', null, `借入${cash(loan)}，下轮需偿还${cash(loan * 1.12)}，其中利息${cash(loan * .12)}。`),
          button('确认借款', () => { onChange(engine.act(company, { type: 'loan', amount: loan })); setLoan(null); }, { variant: 'solid' }), button('取消', () => setLoan(null)))));
  }
  function Events({ company, onChange }) {
    if (!company.v2) return null;
    const now = company.v2.events.filter(e => e.dueRound === company.round && company.stage >= e.stage);
    const pending = company.v2.events.filter(e => e.dueRound > company.round || e.dueRound === company.round && company.stage < e.stage);
    if (!now.length && !pending.length && !company.v2.eventHistory.length) return null;
    return panel('总部来电 · 经营事件',
      now.map(e => h('article', { className: 'v2-event', key: e.id }, h('h4', null, e.title),
        h('p', null, e.kind === 'rival' ? company.marketId !== e.marketId || company.productId !== e.productId ? '跟卖发生在上轮的商品与市场；你已经换了经营组合，本轮不受这次跟卖影响。' : `第${e.encounter}次与老 K 交手；不应对时购买意愿降低${Math.min(45,30 + 3 * (e.encounter - 1))}%。` : e.kind === 'slow-delivery' ? '上一轮经济专线留下跨轮影响，本轮购买意愿降低10%。' : e.kind === 'demand-shift' ? '本轮到访降低10%，可以调整本地内容。' : '教学案例：归类、原产地、进口税与包装合规各有不同义务。缺少准备会让本轮新货延迟3天；这张卡不判定真实反倾销税或 EPR 适用范围。'),
        e.choice ? h('p', { className: 'signal-text' }, company.v2.eventHistory.find(r => r.id === e.id)?.outcome) :
          h('div', { className: 'decision-choice-list' }, engine.eventChoices(e).map(c => button(h(React.Fragment, null, h('strong', null, c.name), h('small', null, `${c.detail}${c.cost ? ` · ${cash(c.cost)}` : ''}`)), () => onChange(engine.act(company, { type: 'event', id: e.id, choice: c.id })),
            { key: c.id, disabled: c.cost > company.cash || c.id === 'complaint' && !company.v2.trademark }))),
        e.kind === 'rival' && !company.v2.trademark && h('small', null, '本轮未提前登记商标，不能选择商标投诉。可选择其他应对。'))),
      pending.length > 0 && h('p', { className: 'panel-note' }, `还有${pending.length}条线索尚未揭晓；下轮或进入发货环节时回总部查看。`),
      company.v2.eventHistory.length > 0 && details('已处理事件档案', h('ul', null, company.v2.eventHistory.map(e => h('li', { key: e.id }, `第${e.resolvedRound}轮 · ${e.title}：${e.outcome}`)))));
  }
  function StageOptions({ company, onChange, market, product, preview, channel }) {
    if (!company.v2) return h('p', { className: 'panel-note' }, '本轮沿用原有结算；下一轮自动启用各国税费与 V2 经营规则。');
    const c = engine.config(company), change = patch => onChange(engine.configure(company, patch)), phase = season(company.round);
    const stockTest = company.v2.tests.find(r => r.round === company.round && r.productId === company.productId);
    return h('div', { className: 'v2-stage-options' },
      company.stage === 0 && panel('这次，在哪个平台经营？',
        h('p', null, `${market?.country || '当前市场'} · `, h(MarketStamp, { company, marketId: market?.id })),
        h(Choices, { label: '经营平台', options: PLATFORMS, value: c.platform, onChange: platform => change({ platform }) }),
        h('p', { className: 'panel-note' }, '这里模拟三种平台经营模式，不代表各平台已在所有国家开放入驻；费率也是游戏参数。')),
      [0, 1, 4].includes(company.stage) && h(TaxCard, { company, market, preview }),
      company.stage === 1 && product && panel('这个商品，适合这个市场吗？', rows([['商品', product.name], ['本地匹配指数', (productFit[product.id]?.[market?.id] ?? 1).toFixed(3)]]),
        h('p', { className: 'panel-note' }, '100款商品与12个市场均有明确的游戏匹配值，进入购买意愿计算。它是游戏标定数据，不是实测销量；还需结合售价、税费和交期判断。')),
      company.stage === 2 && panel('备货前，再比较一次',
        h(Choices, { label: '头程运输', options: FIRST_MILE, value: c.firstMile, onChange: firstMile => change({ firstMile }) }),
        details('采购阶梯与工厂谈判',
          h('p', null, '按本次新增采购量：400件起95折、800件起9折、1200件起85折。在供应商原报价上计算，已有库存不算新采购。'),
          h('p', null, '供应伙伴来信：可以接受更高起订量换价，也可以保持当前价格申请一轮账期。确认进货后记入经营决策。'),
          h(Choices, { label: '工厂谈判方案', options: [{ id: 'none', name: '按常规条件', detail: '保留所选供应商MOQ' }, { id: 'volume', name: '提高起订量，换更低价', detail: '新增采购至少800件，阶梯价再打97折' }, { id: 'credit', name: '保留价格，争取账期', detail: '采购款下轮支付，仍需支付本轮头程费' }], value: c.negotiation, onChange: negotiation => change({ negotiation, terms: negotiation === 'credit' ? 'credit' : 'cash' }) })),
        preview && rows([['当前采购单价', cash(preview.unitCost)], ['新增采购', `${preview.unitsToBuy}件`], ['备货＋头程', `${preview.leadDays}天`], ['及时可售 / 延迟到货', `${preview.units} / ${preview.delayedUnits}件`]]),
        details('小预算测款 · 先验证，再备货',
          stockTest ? h('p', { role: 'status' }, `样本匹配指数 ${stockTest.score.toFixed(2)}，${stockTest.score >= 1.1 ? '信号较强，可以小批验证。' : stockTest.score >= 1 ? '信号中等，留意获客成本。' : '信号偏弱，考虑换品或控制数量。'}测款信号不是订单承诺。`) :
            button('花$150，获取一次测款信号', () => onChange(engine.act(company, { type: 'test' })), { disabled: company.cash < 150 }),
          h('p', { className: 'panel-note' }, '同轮、同商品与市场保持同一样本结果，回滚不能换一份好运。')),
        phase.index !== 2 && h('label', { className: 'v2-check' }, h('input', { type: 'checkbox', checked: c.seasonPrep, onChange: e => change({ seasonPrep: e.target.checked }) }), `提前备战本季 $300 · 收割期触达×1.3（未备战×1.1）`)),
      company.stage === 3 && panel('推广节奏与站外补充',
        channel === 'ads' && h(React.Fragment, null, h(Choices, { label: '关键词出价', options: BIDS.map(b => ({ ...b, detail: `竞价效果波动 ${pct(b.range[0])}–${pct(b.range[1])}` })), value: c.bid, onChange: bid => change({ bid }) }),
          h(Choices, { label: '投放时段', options: TIME_SLOTS.map(t => ({ ...t, detail: `触达×${t.traffic} · 购买意愿×${t.conversion}` })), value: c.timeSlot, onChange: timeSlot => change({ timeSlot }) })),
        h(Choices, { label: '站外补充', options: OFFSITE, value: c.offsite, onChange: offsite => change({ offsite }) }),
        details('品牌保护', company.v2.trademark ? h('p', null, '模拟商标已登记，遇到跟卖时可以准备投诉证据。') : button('登记模拟商标 $600', () => onChange(engine.act(company, { type: 'trademark' })), { disabled: company.cash < 600 }))),
      h(Events, { company, onChange }),
      h(Finance, { company, onChange, preview }));
  }
  function ReportExtras({ report: r }) {
    if (r?.modelVersion !== 'v2') return null;
    return panel('从销售额，到到账金额',
      rows([['经营平台', r.platform.name], ['关税', cash(r.tariff)], [r.tax.taxName, cash(r.importTax)], ['收款手续费', cash(r.paymentFee)], ['换汇费用', cash(r.fxFee)], ['头程运输', cash(r.firstMileCost)], ['余货仓储', cash(r.warehouseCost)], ['达人毛佣金 / 下轮追回', `${cash(r.commissionGross)} / ${cash(r.commissionRecovery)}`], ['待到账款项', cash(r.receivables)], ['未付采购与贷款', cash(r.liabilities)]]),
      h('p', null, `当地币种净销售额 ${r.localRevenue.toLocaleString()} ${r.tax.currency}；固定演示汇率 1 USD = ${r.tax.fx} ${r.tax.currency}。`),
      details('完整利润对账', rows(profitRows(r).map(x => [x.label, cash(x.amount)])), h('p', null, `收入减全部成本：${cash(r.profit)}；净资产变化：${cash(r.assetChange)}。贷款本金、到期付款、应收到账不会重复计入利润。`)),
      r.attribution.some(a => a.id === 'ads' && a.spend > 0) && h('p', null, `${r.bid.name} · ${r.timeSlot.name}：本轮竞价系数${r.adVariation.toFixed(2)}，广告ACOS ${r.acos == null ? '暂无成交' : pct(r.acos)}。`),
      h('p', { className: 'panel-note' }, TAX_NOTE));
  }
  function CompanyGrowth({ company, ops, onChange }) {
    const a = assessment(company, ops, engine.markets, tasks), phase = season(company.round);
    const buildings = ['起步档口', '运营办公室', '品牌大楼'], level = company.history.length >= 6 && a.passport.earned >= 3 ? 2 : company.history.length >= 2 ? 1 : 0;
    return panel('公司成长',
      company.v2?.firstEntry && h('div', { className: 'operation-feedback' }, h('strong', null, `初访${TAX[company.v2.firstEntry.marketId].country} · 5建设点`), h('p', null, TAX[company.v2.firstEntry.marketId].fact)),
      h('div', { className: 'v2-building-track' }, buildings.map((name, i) => h('div', { key: name, className: i <= level ? 'is-earned' : '' },
        h('svg', { viewBox: '0 0 72 72', role: 'img', 'aria-label': name }, h('path', { d: i === 0 ? 'M8 60V30h56v30M5 30l8-17h46l8 17M20 60V40h18v20M47 40h9v10' : i === 1 ? 'M14 62V20h44v42M9 62h54M23 29h8v8h-8zm18 0h8v8h-8zM23 44h8v8h-8zm18 0h8v8h-8z' : 'M20 64V10h32v54M12 64h48M27 18h5v6h-5zm13 0h5v6h-5zM27 32h5v6h-5zm13 0h5v6h-5zM27 46h5v6h-5zm13 0h5v6h-5z', fill: 'none', stroke: 'currentColor', strokeWidth: 2 })), h('strong', null, name), h('small', null, i === 0 ? '开始经营' : i === 1 ? '完成2轮' : '完成6轮且3国达标')))),
      h('p', null, `本季${phase.name} · ${phase.untilHarvest ? `还有${phase.untilHarvest}轮进入收割期` : '本轮收割'}。沿用当前园区，成长形态在总部展示。`),
      details('本轮模拟对标', h('p', { className: 'panel-note' }, '下面是固定种子的模拟商家，不是真实玩家或联网排行榜。'), h('ol', null, benchmark(company).map(r => h('li', { key: r.name, className: !r.simulated ? 'signal-text' : '' }, `${r.name}${r.simulated ? '（模拟）' : ''} · ${cash(r.profit)}`)))),
      onChange && h(Events, { company, onChange }));
  }
  function RegionRewards({ company, ops }) {
    const p = passport(company, engine.markets), awards = explorationAwards(company, engine.markets);
    return panel('区域称号与探索奖励',
      h('div', { className: 'v2-inline-actions' }, p.regions.map(r => h('span', { key: r.name, className: r.complete ? 'signal-text' : '' }, `${r.name}经营者 · ${r.complete ? '已达成' : `${r.members.filter(c => c.tier).length}/${r.members.length}`} · 30建设点`))),
      h('p', null, `12国全金：环球经营者 · ${p.gold}/12 · 100建设点。首次进入每个国家奖励5建设点。`),
      awards.filter(a => ops?.completed.includes(a.id)).length > 0 && h('p', { className: 'signal-text' }, `已发放${awards.filter(a => ops?.completed.includes(a.id)).reduce((s, a) => s + a.points, 0)}建设点；每项只领取一次。`));
  }
  function HonorSummary({ company, ops }) {
    const a = assessment(company, ops, engine.markets, tasks);
    return h('p', { className: 'v2-honor-summary' }, '✦ ', a.title, ` · 四维经营评估 ${a.averageScore}/100 · 游戏内荣誉`);
  }
  function MarketStamp({ company, marketId }) {
    const tier = passport(company, engine.markets).countries.find(c => c.id === marketId)?.tier;
    return h('span', { className: 'v2-market-stamp' }, tier ? h(Base.CountryBadge, { marketId, tier }) : h('small', null, '待留印章'));
  }
  const originalHall = Base.AchievementHall;
  function AchievementHall(props) {
    return h(originalHall, { ...props, renderAssessment: () => h(Assessment, props), renderPassportExtras: () => h(RegionRewards, props) });
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function Assessment({ company, ops }) {
    const a = assessment(company, ops, engine.markets, tasks);
    const [name, setName] = React.useState(''), [contact, setContact] = React.useState(''), [consent, setConsent] = React.useState(false), [message, setMessage] = React.useState('');
    const key = 'crossbound-assessment-contacts-v2';
    const read = () => { const v = JSON.parse(localStorage.getItem(key) || '[]'); if (!Array.isArray(v)) throw new Error('记录格式不正确'); return v; };
    const save = e => {
      e.preventDefault();
      if (!consent || !name.trim() || !contact.trim()) return;
      try {
        const list = read().filter(r => r.number !== a.number);
        list.push({ number: a.number, name: name.trim(), contact: contact.trim(), title: a.title, rounds: a.rounds, score: a.averageScore, savedAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(list)); setMessage('已保存在本机浏览器中，没有上传。重复填写会更新同一公司记录。');
      } catch { setMessage('本机保存失败，请检查浏览器存储空间。'); }
    };
    const exportContacts = () => {
      try {
        const list = read(), fields = ['number', 'name', 'contact', 'title', 'rounds', 'score', 'savedAt'];
        const csv = v => `"${String(v ?? '').replace(/^\s*[=+\-@]/, "'$&").replaceAll('"', '""')}"`;
        download(new Blob(['\ufeff' + [fields, ...list.map(r => fields.map(f => r[f]))].map(row => row.map(csv).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'crossbound-本机联系名单.csv');
        setMessage(`已导出本机${list.length}条记录。`);
      } catch { setMessage('导出失败，本机记录无法读取。'); }
    };
    const certificate = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 900;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#08161c'; ctx.fillRect(0, 0, 1200, 900);
      ctx.strokeStyle = '#6b8c64'; ctx.lineWidth = 2; ctx.strokeRect(32, 32, 1136, 836);
      const text = (s, y, size = 30, color = '#d4e5e8') => { ctx.font = `${size}px sans-serif`; ctx.fillStyle = color; ctx.fillText(s, 90, y); };
      text('CROSSBOUND / 模拟经营荣誉卡', 120, 24, '#8baab5'); text(a.title, 230, 64, '#adff2f');
      text(`完成 ${a.rounds} 轮 · ${a.passport.earned} 国达标 · 最佳利润 ${cash(a.best)}`, 310, 30);
      a.scores.forEach((s, i) => { text(`${s.name}  ${s.value}/100`, 400 + i * 85, 26); ctx.fillStyle = '#17323a'; ctx.fillRect(380, 378 + i * 85, 650, 16); ctx.fillStyle = '#80c4c5'; ctx.fillRect(380, 378 + i * 85, s.value * 6.5, 16); });
      text(`编号 ${a.number}`, 790, 17, '#8baab5'); text('游戏内表现记录 · 非职业资质或真实合作承诺', 835, 21, '#8baab5');
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) download(blob, 'crossbound-经营荣誉卡.png');
    };
    return panel('我的经营评估',
      h('span', { className: 'eyebrow' }, '累计表现 / 游戏内荣誉'), h('h3', null, a.title),
      h('div', { className: 'v2-assessment-grid' }, a.scores.map(s => h('article', { key: s.key }, h('strong', null, `${s.name} ${s.value}/100`), h('progress', { max: 100, value: s.value, 'aria-label': s.name }), h('p', null, s.detail)))),
      h('p', null, `下一步建议：${a.suggestion}`), button('保存经营荣誉卡', certificate, { variant: 'solid' }),
      details('段位规则与评估口径', h('p', null, '四维等权平均：完成至少一轮且20分为探索者；45分且2国达标为达人；65分且5国达标为区域卖家之星；85分、10国达标且每维至少60分为全球经营合伙人。'),
        h('p', null, '盈利力结合最佳单轮与近5轮平均；稳定性扣除退款和亏损轮影响；广度按12国达标比例；认知按总部来电所有作答正确率。称号均为游戏荣誉。'), h('small', null, a.number)),
      details('可选：留下联系方式',
        h('p', null, '评估可以直接查看。信息只保存在当前设备的浏览器，可导出本机名单；清除浏览器数据后会丢失，不会自动发送给任何人。'),
        h('form', { onSubmit: save, className: 'v2-contact-form' },
          h('label', null, '称呼', h('input', { value: name, maxLength: 60, required: true, onChange: e => setName(e.target.value) })),
          h('label', null, '联系方式（邮箱或其他联系账号）', h('input', { value: contact, maxLength: 160, required: true, onChange: e => setContact(e.target.value) })),
          h('label', { className: 'v2-check' }, h('input', { type: 'checkbox', checked: consent, onChange: e => setConsent(e.target.checked) }), '同意将这份信息保存在本机'),
          h('button', { type: 'submit', disabled: !consent, className: 'v2-save' }, '保存到本机')),
        h('div', { className: 'v2-inline-actions' }, button('导出本机名单 CSV', exportContacts), button('删除我的本机联系记录', () => {
          try { localStorage.setItem(key, JSON.stringify(read().filter(r => r.number !== a.number))); setMessage('当前公司的联系记录已删除。'); } catch { setMessage('删除失败，请检查浏览器存储。'); }
        })), h('p', { role: 'status' }, message)));
  }
  return { StageOptions, TaxCard, Finance, Events, ReportExtras, CompanyGrowth, RegionRewards, MarketStamp, AchievementHall, Assessment, HonorSummary, BadgeCelebration };
}
export function profitRows(r) {
  const fields = [['cogs', '已售货品成本'], ['writeoffCost', '退货报损'], ['returnHandlingCost', '退件处理'], ['listingCost', '商品页'], ['shippingCost', '履约运费'], ['platformFees', '平台佣金'], ['commission', '达人佣金（扣应追回款）'], ['marketingCost', '推广预算'], ['launchCost', '市场运营'], ['tariff', '关税'], ['importTax', '进口税'], ['paymentFee', '收款手续费'], ['fxFee', '换汇'], ['packagingCost', '差异化包装'], ['warehouseCost', '仓储'], ['firstMileCost', '头程'], ['offsiteCost', '站外推广'], ['testingCost', '测款'], ['eventCost', '事件处理'], ['trademarkCost', '模拟商标'], ['seasonPrepCost', '旺季准备'], ['interestCost', '贷款利息'], ['platformEntryCost', '店铺费用'], ['expansionCost', '下轮安排'], ['clearanceLoss', '清仓货值损失']];
  return [{ id: 'netRevenue', label: '净销售收入', amount: r.netRevenue }, ...fields.map(([id, label]) => ({ id, label, amount: -(r[id] || 0) }))];
}
