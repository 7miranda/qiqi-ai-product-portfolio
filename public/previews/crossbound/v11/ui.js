import { feedbackState } from '../v2/records.js';
import { HELP, PROMOTIONS } from './model.js';
import { countryBadgeAsset } from './badges.js?v=2';
import { explorationAwards } from '../v2/progress.js';
import { goal, goalChannelText } from '../v2/release.js';
import { STOCK_CARRYOVER } from './balance.js';

// Reuse the demo's React instance, buttons, panels and visual classes.
export function createCrossboundUI({ React, Button, engine, Passport, passportData, growth }) {
  const h = React.createElement;
  const cash = n => n == null ? '暂无' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const count = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0);
  const pct = n => n == null ? '暂无' : `${(n * 100).toFixed(1)}%`;
  const button = (label, onClick, props = {}) => h(Button, { variant: 'outline', onClick, ...props }, label);
  function range(p, key, monetary = false, offset = 0) {
    const bounds = p?.bounds?.[key];
    const fmt = monetary ? cash : count;
    if (!bounds || p.settled) return fmt((p?.[key] || 0) + offset);
    if (bounds[0] === bounds[1]) return `约${fmt(bounds[0] + offset)}`;
    return `${fmt(bounds[0] + offset)}–${fmt(bounds[1] + offset)}`;
  }
  function Help({ id }) {
    const content = HELP[id];
    return content ? h('details', { className: 'v11-help' }, h('summary', { 'aria-label': content[0] }, '? ', content[0]), h('p', null, content[1])) : null;
  }
  // REQ-053 P2-1: every HELP card in one place. Optional reading: no red dot, no unread count, never opens by itself.
  const HANDBOOK = [
    ['选品与定价', ['conversion']],
    ['库存与退货', ['inventory', 'returns']],
    ['税费与推广成本', ['tariff', 'cac']],
  ];
  function Handbook() {
    const help = engine.help || HELP;
    return h(React.Fragment, null,
      h('h2', { id: 'campaign-dialog-title' }, '总部手册'),
      h('p', { className: 'panel-note' }, '经营规则与名词解释都在这里，想查再查；每轮结算的战报会结合你这一轮的数字再讲一遍。'),
      HANDBOOK.map(([title, ids]) => h('section', { key: title, className: 'report-insights-panel v11-handbook' },
        h('h3', null, title),
        ids.filter(id => help[id]).map(id => h('details', { key: id, className: 'v11-help' }, h('summary', null, help[id][0]), h('p', null, help[id][1]))))));
  }
  function useSettlement(company) {
    const key = `crossbound-settlement-v11:${company.runSeed ?? 'legacy'}:${company.round}`;
    const read = () => { try { return JSON.parse(localStorage.getItem(key)) || { phase: 'report' }; } catch { return { phase: 'report' }; } };
    const [stored, setStored] = React.useState(() => ({ key, value: read() }));
    const value = stored.key === key ? stored.value : read();
    const save = next => { setStored({ key, value: next }); try { localStorage.setItem(key, JSON.stringify(next)); } catch {} };
    return { ...value, active: ['task', 'reward', 'build'].includes(value.phase), done: value.phase === 'done',
      start: () => save({ phase: 'task' }), reward: receipt => save({ phase: 'reward', receipt }),
      build: () => save({ ...value, phase: 'build' }), finish: () => save({ ...value, phase: 'done' }) };
  }
  function SettlementProgress({ view, flow }) {
    const step = view === 'complete' ? 0 : ['operations', 'review-task'].includes(view) ? 1 : 2;
    return h('ol', { className: 'listing-local-steps v11-settlement-steps', 'aria-label': '本轮收尾进度' },
      ['看本轮战报', '接总部来电', '领取奖励与建设'].map((label, i) => h('li', { key: label, className: step === i ? 'is-current' : i < step ? 'is-done' : '', 'aria-current': step === i ? 'step' : undefined }, h('b', null, i < step ? '✓' : `0${i + 1}`), label)),
      flow.done && h('li', { className: 'v11-settlement-finished' }, '本轮引导已结束'));
  }
  function SettlementActions({ company, ops, flow, onContinue, onSkip, onAdjust, onHQ }) {
    const g = growth(company, ops), ready = g.facilities.some(f => f.ready);
    const label = '开启下一轮';
    return h('div', { className: 'result-next-v23' },
      h('article', null, h('span', null, STOCK_CARRYOVER ? '继续经营 / 现金与余货保留' : '继续经营 / 现金保留'), h('h3', null, '下一轮，带着经验出发'),
        h('p', null, `现有现金${cash(company.cash)}${STOCK_CARRYOVER ? '和余货会保留' : '会保留，下一轮重新备货'}。${!flow.done && g.nextTask?.available ? '总部还有一条经营线索，看看再出发。' : '可以继续经营原市场，也可以去下一站。'}`),
        h('div', { className: 'result-next-actions' }, button(label + ' →', onContinue, { variant: 'solid', 'data-guide':'next-round' }),
          button('调整本轮方案', onAdjust))));
  }
  // REQ-053 §4.7: target once, the lane that passed, one money line, one link to HQ (growth, achievements, 四维评估 moved there).
  function SettlementGoal({ company, onOpen }) {
    const r = company.report;
    if (!r) return null;
    const g = goal(r);
    return h('section', { className: 'listing-confirmed-v23 v11-round-achievements v11-settlement-goal', 'aria-label': '本轮目标' },
      g.passed && h(CountryBadge, { marketId: r.marketId, tier: g.tier }),
      h('div', null, h('span', null, `本轮目标 / ${g.target} 单未退款，或贡献利润 $5,000`),
        h('p', { className: g.passed ? 'signal-text' : '' }, goalChannelText(g)),
        h('p', null, `收入 ${cash(r.netRevenue)} · 成本 ${cash(r.totalCosts)} · 利润 ${cash(r.profit)} · 现金变化 ${cash(r.cashChange)}${r.receivables > 0 ? `（货款 ${cash(r.receivables)} 下一轮开局到账）` : ''}`)),
      button('成长、成就与四维评估在总部 →', onOpen));
  }
  function ReviewTask({ task, onSubmit, feedback }) {
    const [selected, setSelected] = React.useState('');
    if (!task) return null;
    return h(React.Fragment, null, h(CallIntro, { round: task.rewardRound, title: '买家差评，需要回应' }),
      h('span', { className: 'eyebrow' }, `总部来电 / 第${task.round}轮售后复盘`), h('h2', { id: 'campaign-dialog-title' }, task.title),
      h('p', { className: 'panel-lead' }, task.mission),
      h('div', { className: 'operation-signals' }, task.metrics.map(m => h('article', { key: m.label }, h('small', null, m.label), h('strong', null, m.value), h('p', null, m.detail)))),
      h('div', { className: 'operation-actions' }, [
        ['amplify', '增加推广预算', '先拉新订单，把销量补回来'],
        ['investigate', '回复买家，核查退款原因', '对照商品描述与交付，确定下轮改进方向'],
        ['erase', '隐藏差评，再继续卖', '先让商品页看起来更好'],
      ].map(([id, label, detail], i) => button(h(React.Fragment, null, h('span', null, `0${i + 1}`), h('strong', null, label), h('small', null, detail)), () => setSelected(id), { key: id, 'aria-pressed': selected === id }))),
      feedback && h('div', { className: 'operation-feedback', role: 'status' }, h('b', null, '再看一下线索'), h('p', null, feedback)),
      h('div', { className: 'operation-bottom' }, h('span', null, `首次完成 +${task.xp}经验 / +${task.research}建设点`), button('确认处理方案', () => onSubmit(selected), { disabled: !selected })),
      h('p', { className: 'panel-note' }, '这是经营判断练习。完成排查后，仍需在下一轮实际调整方案；历史差评和评分会保留。'));
  }
  function LevelUp({ reward }) {
    if (!reward?.promotion) return null;
    return h('section', { className: 'v11-level-up', role: 'status', 'aria-label': '等级晋升' },
      h('span', { className: 'eyebrow' }, '新的经营里程碑'), h('h3', null, reward.promotion),
      h('p', null, reward.unlocked?.length ? `获得建设资格：${reward.unlocked.map(f => f.name).join('、')}` : '新的称号已记录，继续积累经验与建设点。'));
  }
  function RewardActions({ reward, ready, onContinue, onSkip }) {
    return h('div', { className: 'prize-actions' },
      button(reward.kind === 'challenge' && ready ? '下一步：建设公司 →' : '开启下一轮 →', onContinue),
      reward.kind === 'challenge' && ready && button('稍后建设，先开启下一轮', onSkip));
  }
  function NotificationDock({ company, ops, unread, onAchievements, onTask, onHQ, onCommunity }) {
    const key = `crossbound-notices-v11:${company.runSeed ?? 'legacy'}`;
    const read = () => { try { const n = JSON.parse(localStorage.getItem(key)); return Array.isArray(n) ? n : []; } catch { return []; } };
    const [stored, setStored] = React.useState(() => ({ key, dismissed: read() }));
    const [collapsed, setCollapsed] = React.useState(false);
    const dismissed = stored.key === key ? stored.dismissed : read(), g = growth(company, ops);
    const ready = g.facilities.filter(f => f.ready), messages = [];
    const feedback=feedbackState(company);
    if(company.history.length>=1&&!feedback.first) messages.push({id:'community-first',title:'总部来电 · 共建者专线',detail:'三句话告诉总部你的体验 · 50建设点',action:onCommunity,persistent:true});
    else if(company.history.length>=3&&!feedback.deep) messages.push({id:'community-deep',title:'总部回访',detail:'三轮之后，聊聊哪里还值得打磨',action:onCommunity,persistent:true});
    const event = company.v2?.events.find(e => e.dueRound === company.round && company.stage >= e.stage && !e.choice);
    if (event) messages.push({ id: `event:${event.id}`, title: '总部来电 · 新经营事件', detail: event.title, action: onTask });
    if (company.v2?.firstEntry) messages.push({ id: `first:${company.v2.firstEntry.marketId}`, title: '新市场足迹 · +5建设点', detail: '到公司总部看看这个国家的小知识', action: onHQ });
    if (unread.length) messages.push({ id: `achievements:${unread.map(x => x.key).join('|')}`, title: `新成就 · ${unread.length}项`, detail: unread.at(-1).name, action: onAchievements });
    if (g.nextTask?.available) messages.push({ id: `task:${g.nextTask.id}`, title: g.reviewTask ? '总部来电 · 售后提醒' : '总部来电', detail: g.nextTask.title, action: onTask });
    if (ready.length) messages.push({ id: `build:${ready.map(f => f.id).join('|')}`, title: '公司可以建设了', detail: ready.map(f => f.name).join('、'), action: onHQ });
    const visible = messages.filter(m => m.persistent || !dismissed.includes(m.id));
    if (!visible.length) return null;
    const dismiss = id => { const next = [...dismissed, id]; setStored({ key, dismissed: next }); try { localStorage.setItem(key, JSON.stringify(next)); } catch {} };
    return h('aside', { className: 'v11-notification-dock', 'aria-label': '消息提醒' },
      h('div', { className: 'v11-notification-heading' }, h('span', { role: 'status', 'aria-live': 'polite' }, `消息提醒 · ${visible.length}`),
        button(collapsed ? '展开 ＋' : '收起 −', () => setCollapsed(!collapsed), { 'aria-expanded': !collapsed })),
      !collapsed && h('div', { className: 'v11-notification-list' }, visible.map(m => h('div', { className: 'v11-notification-row', key: m.id },
        button(h(React.Fragment, null, h('strong', null, m.title), h('small', null, m.detail)), () => { if(!m.persistent)dismiss(m.id); m.action(); }, { className: 'v11-notification-link' }),
        !m.persistent && button('×', () => dismiss(m.id), { className: 'v11-notification-dismiss', 'aria-label': `收起${m.title}` })))));
  }
  function ListingOptimization({ company, product, published, onOptimize }) {
    if (!engine.valid(company)) return null;
    const asset = company.listingAssets[product.id], canOptimize = asset && !published && asset.baseScore < 95 && !company.listingInvestments.some(e => e.round === company.round && e.productId === product.id);
    if (!canOptimize) return null;
    return h('div', { className: 'listing-reuse v11-listing-optimization' },
      h('p', null, `已有商品页${asset.baseScore}分，本轮可优化一次（最高95分）。`),
      button('花$300，优化+5分', onOptimize, { disabled: company.cash < 300 }));
  }
  function Promotion({ company, channel, selection, onChange, onBudget }) {
    if (!engine.valid(company)) return null;
    const p = engine.products.find(p => p.id === company.productId), selected = engine.choice(channel, selection, p);
    const categories = [...new Map(engine.products.map(p => [p.category, p.categoryLabel])).entries()];
    return h('section', { className: 'listing-edit-panel v11-promotion', 'aria-label': '推广具体方案' },
      h('header', null, h('span', null, '再想一步 / 具体怎么推广'), h('h4', null, channel === 'creator' ? '这次，找谁合作？' : channel === 'ads' ? '广告先讲什么？' : '内容先拍什么？')),
      h('div', { className: 'decision-choice-list' }, PROMOTIONS[channel].map(option => button(
        h(React.Fragment, null, h('strong', null, option.name), h('small', null, option.detail)),
        () => { onChange({ id: option.id, category: selected.category }); if (option.suggestedBudget) onBudget(option.suggestedBudget); },
        { key: option.id, 'aria-pressed': selected.id === option.id }))),
      channel === 'creator' && selected.id === 'vertical' && h('label', { className: 'market-select-label' }, '达人擅长的领域',
        h('select', { value: selected.category, onChange: e => onChange({ id: selected.id, category: e.target.value }) }, categories.map(([id, name]) => h('option', { key: id, value: id }, name)))),
      h('p', { className: 'panel-note', role: 'status' }, channel === 'creator' ? `当前成交分佣${pct(selected.commission)}。${selected.matched ? '达人领域对口，购买意愿+30%。' : '触达仍有爆单或翻车波动。'}` : selected.matched ? channel === 'ads' ? '素材与品类匹配，购买意愿+10%。' : '选题与品类匹配，到访+10%，其中10%可延续到下轮。' : channel === 'ads' ? '素材与品类不匹配，购买意愿-5%。可以换个讲法。' : '这个选题没有品类加成，仍保留内容长尾。'),
    );
  }
  function MarketFacts({ company, market }) {
    if (!engine.valid(company) || !market) return null;
    const visited = company.roundStart.visitedMarkets.includes(market.id);
    const cold = company.previousMarket && company.previousMarket !== market.id && !visited;
    return h('p', { className: 'panel-note' }, visited ? '这个市场进过了，留下来不再收进入费。' : cold ? '首次进入这一新市场：收一次进入费，本轮购买意愿按90%冷启动估算。' : '首次进入这个市场，收一次进入费；以后留下来经营不再收。');
  }
  function CountryBadge({ marketId, tier }) {
    const asset = countryBadgeAsset(marketId, tier);
    if (!asset) return h('div', { className: 'passport-stamp', 'aria-hidden': true }, '+');
    return h('div', { className: `passport-stamp country-badge${asset.locked ? ' is-locked' : ''}`, 'data-badge-tier': asset.tier, 'aria-hidden': true },
      h('img', { src: asset.src, alt: '', width: 144, height: 144, loading: 'lazy', decoding: 'async' }),
      asset.locked && h('span', { className: 'country-badge-lock' },
        h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 },
          h('rect', { x: 5, y: 10, width: 14, height: 11, rx: 3 }),
          h('path', { d: 'M8 10V7a4 4 0 0 1 8 0v3M12 14v3' }))));
  }
  function AchievementHall({ company, onContinue, renderAssessment, renderPassportExtras }) {
    const [tab, setTab] = React.useState('passport');
    const milestones = engine.milestones(company);
    return h('section', { className: 'clarity-view v11-achievements' },
      h('span', { className: 'eyebrow' }, '我的公司 / 跨轮积累'), h('h2', { id: 'campaign-dialog-title' }, '出海成就'),
      h('div', { className: 'clarity-switches', 'aria-label': '成就分类' },
        button('出海护照', () => setTab('passport'), { 'aria-pressed': tab === 'passport' }),
        button(`经营里程碑 ${milestones.filter(m => m.earned).length}/${milestones.length}`, () => setTab('milestones'), { 'aria-pressed': tab === 'milestones' }),
        renderAssessment && button('我的经营评估', () => setTab('assessment'), { 'aria-pressed': tab === 'assessment' })),
      tab === 'assessment' ? renderAssessment() : tab === 'passport' ? h(React.Fragment, null, renderPassportExtras?.(), h(Passport, { company, onContinue })) : h('div', { className: 'passport-country-grid' }, milestones.map((m, i) => h('article', { className: `passport-country ${m.earned ? 'passport-tier-gold' : ''}`, key: m.id },
        h('div', { className: 'passport-stamp', 'aria-hidden': true }, m.earned ? '✦' : String(i + 1).padStart(2, '0')),
        h('span', { className: 'eyebrow' }, m.earned ? `第${m.round}轮达成` : '待点亮'), h('h3', null, m.name), h('p', null, m.description), h('strong', null, m.earned ? '已收藏 ✓' : '继续经营，留下故事')))),
    );
  }
  function achievementKeys(company) {
    const passport = passportData(company);
    return [...passport.countries.filter(c => c.tier).map(c => ({ key: `${c.marketId}:${c.tier}`, name: `${c.countryName} · ${c.tier === 'gold' ? '金章' : c.tier === 'silver' ? '银章' : '铜章'}` })),
      ...engine.milestones(company).filter(m => m.earned).map(m => ({ key: m.id, name: m.name })),
      ...explorationAwards(company, engine.markets).filter(a => a.kind !== 'country').map(a => ({ key: a.id, name: a.title }))];
  }
  function useAchievements(company) {
    const key = `crossbound-achievements-seen:${company.runSeed ?? 'original'}`;
    const [seen, setSeen] = React.useState(() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } });
    const items = achievementKeys(company), unread = items.filter(item => !seen.includes(item.key));
    const markSeen = () => { const keys = items.map(i => i.key); setSeen(keys); try { localStorage.setItem(key, JSON.stringify(keys)); } catch {} };
    return { unread, markSeen };
  }
  function RoundAchievements({ company, onOpen }) {
    const r = company.report;
    if (!r) return null;
    const {target,passed:qualified,tier:badgeTier} = goal(r);
    const tier = {gold:'金章',silver:'银章',bronze:'铜章'}[badgeTier];
    const country = engine.markets.find(m => m.id === r.marketId)?.country || '';
    const newlyEarned = engine.milestones(company).filter(m => m.earned && m.round === company.round);
    return h('section', { className: 'listing-confirmed-v23 v11-round-achievements', 'aria-label': '本轮成就' },
      qualified && h(CountryBadge, { marketId: r.marketId, tier: badgeTier }),
      h('div', null, h('span', null, '本轮成就 / 收藏这一步成长'),
        h('p', null, qualified ? `✦ ${country} · ${tier}` : `国家印章尚未达成：${r.keptOrders < target ? `还差${target - r.keptOrders}单未退款订单` : '贡献利润需大于$0'}。`),
        newlyEarned.length > 0 && h('p', { className: 'signal-text' }, `新里程碑：${newlyEarned.map(m => m.name).join(' · ')}`)),
      button('查看出海成就 →', onOpen));
  }
  function Report({ report: r }) {
    if (!r) return null;
    const funnel = [
      ['商品到访', count(r.visitors), `含自然奖励${count(r.organicBonus)}次、历史内容${count(r.carryVisitors)}次。`],
      ['基础购买意愿', pct(r.baseConversion), '商品与市场匹配决定起点。'],
      ['售价影响', `${r.priceFactor.toFixed(2)}倍`, '相对参考价，售价越高通常越少人下单。'],
      ['形成需求', `${count(r.demand)}件`, r.saturated ? '已超过市场容量，超出部分购买机会减半。' : '合并商品页、配送、评分及推广内容后的需求。'],
      ['及时可售', `${count(r.units)}件`, `${r.leadDays}天交期；${count(r.delayedUnits)}件新货错过本轮销售窗口。`],
      ['实际订单', `${count(r.orders)}单`, `库存限制后，${count(r.stockouts)}件需求未成交。`],
      ['发生退款', `${count(r.refunds)}单`, `${r.returnRestocked}件回库、${r.returnWriteoffs}件不可再售。`],
      ['最终成交', `${count(r.keptOrders)}单`, '已经扣除退款订单。'],
    ];
    const takeaway = r.stockouts ? `本轮需求${count(r.demand)}件，可售${count(r.units)}件，${count(r.stockouts)}件机会没接住；下轮先比较交期与补货。` : r.priceRefundRate > 0 ? `售价超过参考价130%，额外退款比例${pct(r.priceRefundRate)}；下轮可只调整售价验证。` : r.refunds ? `这轮${r.refunds}单退款，商品损失与退件处理合计${cash(r.writeoffCost + r.returnHandlingCost)}；下轮保持其他条件，比较配送与商品页。` : '订单已完成交付。下一轮可固定其他条件，只改变一个经营选择。';
    const attribution = h('section', { className: 'report-insights-panel' }, h('h4', null, '订单从哪里来'),
      h('p', null, `本轮选择：${r.promotionChoice?.name || '未记录'}。按来源到访占比分配订单，为教学估算。`),
      h('div', { className: 'v11-table-wrap' }, h('table', null, h('thead', null, h('tr', null, ['来源', '到访', '订单', '未退款', '投入＋佣金', 'CAC'].map(s => h('th', { key: s, scope: 'col' }, s)))),
        h('tbody', null, r.attribution.map(s => h('tr', { key: s.id }, h('th', { scope: 'row' }, s.name), h('td', null, count(s.visitors)), h('td', null, s.orders), h('td', null, s.keptOrders), h('td', null, cash(s.spend + s.commission)), h('td', null, cash(s.cac))))))),
      h('p', null, `TACOS ${pct(r.tacos)}。内容制作投入也计成本，额外自然到访不收费。`), h(Help, { id: 'cac' }));
    return h('section', { className: 'report-insights-v23 v11-report' }, h('header', { className: 'report-insights-heading' },
      h('span', { className: 'eyebrow' }, `第${r.round}轮 / 用自己的数字复盘`), h('h3', null, '从被看见，到真正成交'), h('p', null, takeaway)),
      h('ol', { className: 'report-insights-funnel v11-funnel' }, funnel.map(([name, number, note], i) => h('li', { key: name },
        h('span', { className: 'report-insights-step' }, h('small', null, `0${i + 1}`), name), h('strong', null, number),
        h('details', { className: 'v11-help' }, h('summary', null, '? 这一步怎么算'), h('p', null, note))))),
      r.stockReturnUnits > 0 && h('section', { className: 'report-insights-panel v11-stock-return' }, h('h4', null, `未售出清仓返现 +${cash(r.stockReturn)}`),
        h('p', null, `${count(r.stockReturnUnits)}件 × 单件成本 $${((r.stockReturnCost ?? r.stockReturn) / r.stockReturnUnits).toFixed(2)}${r.stockReturnFee ? `，扣5%清仓手续费 ${cash(r.stockReturnFee)}` : ''}。没卖完的货已按成本退回，钱回到你手里，下一轮重新备货。`), h(Help, { id: 'inventory' })),
      r.round < 4 ? h('details', { className: 'decision-optional' }, h('summary', null, '想知道订单从哪里来？展开看看'), attribution) : attribution,
      h('div', { className: 'report-insights-pair' },
        h('section', { className: 'report-insights-panel' }, h('h4', null, '退款与交付'), h('ul', { className: 'report-insights-reasons' }, r.refundReasons.map(s => h('li', { key: s.id }, h('span', null, s.label), h('b', null, `${s.count}单`)))),
          h('p', null, `货品报损${cash(r.writeoffCost)}，处理费${cash(r.returnHandlingCost)}；预估关税${cash(r.tariff)}。`), h(Help, { id: 'returns' }), h(Help, { id: 'tariff' })),
        h('section', { className: 'report-insights-panel' }, h('h4', null, '商品口碑带到下一轮'), h('p', null, `评分 ${r.ratingBefore.toFixed(2)} → ${r.ratingAfter.toFixed(2)} ★，新增差评${r.badReviews}条。`), h('p', null, `下轮评分对购买意愿的影响约 -${pct(r.nextRatingImpact)}。`), r.badReviews >= 10 && h('p', { role: 'status' }, '总部来电提醒：先核对描述与交付，再增加推广。'), h(Help, { id: 'conversion' }))),
    );
  }
  function Clearance({ company, onChange }) {
    const [selected, setSelected] = React.useState(null);
    // REQ-052: settlement already returns all stock at cost; keep the manual flow for when carry-over returns.
    if (!STOCK_CARRYOVER || !engine.valid(company) || ![5, 6].includes(company.stage)) return null;
    const inventory = engine.products.filter(p => company.inventory[p.id] > 0);
    if (!inventory.length) return null;
    const product = engine.products.find(p => p.id === selected), cost = product && (company.inventoryCosts[product.id] ?? product.cost * company.inventory[product.id]);
    return h('section', { className: 'report-insights-panel v11-clearance' }, h('h4', null, '余货，留着卖还是清仓？'),
      inventory.map(p => h('div', { className: 'v11-stock-row', key: p.id }, h('span', null, `${p.name} · ${company.inventory[p.id]}件`), button('按成本五折清仓', () => setSelected(p.id)))),
      selected && h('div', { className: 'operation-feedback', role: 'alert', 'aria-live': 'assertive' },
        h('b', null, `确认清仓${product.name}？`), h('p', null, `全部${company.inventory[selected]}件变现${cash(cost * .5)}，损失约${cash(cost * .5)}，不再结转下轮。`),
        button('保留库存', () => setSelected(null)), button('确认清仓', () => { onChange(engine.clearStock(company, selected)); setSelected(null); })), h(Help, { id: 'inventory' }));
  }
  function History({ company }) {
    const records = company.history;
    if (!records.length) return null;
    const profits = records.map(r => r.profit), lo = Math.min(0, ...profits), hi = Math.max(1, ...profits), span = hi - lo;
    const points = profits.map((p, i) => `${10 + i / Math.max(1, profits.length - 1) * 280},${90 - (p - lo) / span * 80}`).join(' ');
    const totals = ['organic', 'ads', 'creator'].map(id => {
      const entries = records.flatMap(r => r.attribution || []).filter(s => s.id === id);
      const orders = entries.reduce((a, b) => a + b.keptOrders, 0), spend = entries.reduce((a, b) => a + b.spend + b.commission, 0);
      return { id, name: { organic: '自然与内容', ads: '广告', creator: '达人' }[id], orders, cac: orders ? spend / orders : null };
    }).sort((a, b) => (a.cac ?? Infinity) - (b.cac ?? Infinity));
    return h('details', { className: 'decision-optional' }, h('summary', null, '历史经营成绩与渠道累计成本'),
      h('svg', { viewBox: '0 0 300 110', className: 'v11-profit-chart', role: 'img', 'aria-label': '各轮贡献利润变化' }, h('line', { x1: 10, x2: 290, y1: 90 - (0 - lo) / span * 80, y2: 90 - (0 - lo) / span * 80, stroke: '#36505a' }), h('polyline', { points, fill: 'none', stroke: '#65d1db', strokeWidth: 2 })),
      h('ul', null, records.map(r => h('li', { key: r.round }, `第${r.round}轮：${cash(r.profit)}`))),
      h('ul', null, totals.map(s => h('li', { key: s.id }, `${s.name}：${s.orders}单未退款，累计CAC ${cash(s.cac)}`))));
  }
  function Cockpit({ company, ops, preview, onOpen, onBuild, onTask, onHandbook }) {
    const [open, setOpen] = React.useState(false);
    if (!engine.valid(company)) return null;
    const target = goal(company).target, g = growth(company, ops), p = company.report || preview;
    const snapshot = [['市场', engine.markets.find(m => m.id === company.marketId)?.countryLabel], ['商品', engine.products.find(p => p.id === company.productId)?.name], ['售价', company.price == null ? null : cash(company.price)], ['目标备货', company.quantity ? `${company.quantity}件` : null], ['渠道', engine.channels.find(c => c.id === company.trafficPlanId)?.name], ['履约', company.fulfillmentPlanId && { economy: '经济专线', standard: '标准履约', express: '加急履约' }[company.fulfillmentPlanId]]];
    const spent = company.ledger.filter(e => e.round === company.round && e.cashDelta < 0).reduce((a, e) => a - e.cashDelta, 0);
    const expected = company.report ? `${p.keptOrders}单` : preview?.bounds?.keptOrders ? range(preview, 'keptOrders') + '单' : '待选择商品后估算';
    const product = engine.products.find(p => p.id === company.productId), budget = company.trafficBudget || 900;
    const efficiencies = company.trafficPlanId ? engine.channels.map(c => {
      const selected = PROMOTIONS[c.id].find(option => option.categories?.includes(product?.category)) || PROMOTIONS[c.id].at(-1);
      const simulated = engine.simulate({ ...company, trafficPlanId: c.id, trafficBudget: budget, promotionChoice: { id: selected.id, category: product?.category } }, 'mean');
      return { ...c, efficiency: simulated.currentRoundVisitors / budget };
    }) : [];
    return h('aside', { className: `v11-cockpit ${open ? 'is-open' : ''}`, 'aria-label': '本轮经营看板' },
      button(h(React.Fragment, null, h('span', null, '本轮看板'), h('span', { className: 'v11-header-toggle-icon', 'aria-hidden': true }, open ? '−' : '＋')), () => setOpen(!open), { 'aria-expanded': open, 'aria-label': open ? '收起本轮看板' : '展开本轮看板' }),
      open && h('div', { className: 'v11-cockpit-body' }, h('h3', null, `第${company.round}轮 · ${target}单${goal(company).modern?'或利润$5,000':''}`),
        h('p', null, `未退款订单${company.report ? '' : '预计'} ${expected}`), h('progress', { max: target, value: Math.min(target, p?.keptOrders || 0), 'aria-label': '本轮订单目标进度' }),
        h('p', null, `本轮已投入${cash(spent)} / 开轮现金${cash(company.roundStart.cash)}`), h('progress', { max: Math.max(1, company.roundStart.cash), value: Math.min(company.roundStart.cash, spent), 'aria-label': '预算使用进度' }),
        h('dl', null, snapshot.map(([label, v]) => h('div', { key: label }, h('dt', null, label), h('dd', null, v || '待决定')))),
        company.trafficPlanId && h('section', null, h('h4', null, '每美元触达 · 同预算对照'), efficiencies.map(c => {
          return h('div', { key: c.id, className: company.trafficPlanId === c.id ? 'signal-text' : '' }, h('span', null, `${c.name} 约${c.efficiency.toFixed(1)}次/$`), h('progress', { max: Math.max(1, ...efficiencies.map(c=>c.efficiency)), value: c.efficiency, 'aria-label': `${c.name}每美元到访` }));
        }), h('small', null, `均按${cash(budget)}、对口内容和常态效果试算；达人实际会有波动。`),
        h('h4', null, company.report ? '订单来源 · 估算分摊' : '预计订单来源'),
        (p?.attribution || []).map(s => {
          const bounds = preview?.attributionBounds?.[s.id];
          const label = company.report ? `${s.orders}单` : bounds ? `${count(bounds[0])}–${count(bounds[1])}单` : '待估算';
          return h('div', { key: s.id }, h('span', null, `${s.name} ${label}`), h('progress', { max: Math.max(1, p.orders), value: s.orders, 'aria-label': `${s.name}订单占比` }));
        })),
        p?.saturated && h('p', { role: 'status' }, '市场接近饱和，超出容量部分购买机会减半。'),
        button(company.report ? '查看本轮战报' : '继续当前选择', onOpen),
        g.nextTask?.available && button('总部来电 · 有新任务', onTask, { className: 'v11-call-pulse' }),
        g.facilities.some(f => f.ready) && button('公司总部 · 可建设设施', onBuild),
        h(Help, { id: 'conversion' }), onHandbook && button('总部手册 · 规则与名词', onHandbook, { className: 'v11-handbook-entry' }), h(History, { company })),
    );
  }
  function GrowthSummary({ company, ops, onTask, onBuild }) {
    const g = growth(company, ops);
    return h('section', { className: 'report-insights-panel' }, h('h4', null, `公司设施 ${ops.upgrades.length}/4`),
      h('div', { className: 'v11-facility-grid' }, g.facilities.map(f => h('article', { key: f.id }, h('b', null, f.name),
        h('span', null, f.owned ? '已建成 ✓' : f.ready ? '可以建设 ↑' : f.xpMissing ? `需要${f.minXp}经验` : f.needsPrevious ? `先建设${f.previousName}` : '继续积累建设点'), !f.owned && h('small', null, `建设点 ${Math.min(ops.research, f.cost)}/${f.cost}`),
        !f.owned && h('progress', { max: f.cost, value: Math.min(ops.research, f.cost), 'aria-label': `${f.name}建设点进度` })))),
    );
  }
  function CallIntro({ round, title }) {
    return h('div', { className: 'module-guidance-v20 v11-call-intro' }, h('div', null,
      h('span', { className: 'v11-call-avatar', 'aria-hidden': true }, '林'), h('b', null, '总部来电 · 运营伙伴'),
      h('p', null, title || '有一条经营线索，想和你一起拿个主意。')), h('strong', { className: 'signal-text' }, round <= 3 ? '+200经验 · +40建设点' : '+100经验 · +20建设点'));
  }
  return { range, Help, Handbook, useSettlement, SettlementProgress, SettlementActions, SettlementGoal, ReviewTask, LevelUp, RewardActions, NotificationDock, ListingOptimization, Promotion, MarketFacts, CountryBadge, AchievementHall, useAchievements, RoundAchievements, Report, Clearance, History, Cockpit, GrowthSummary, CallIntro };
}
