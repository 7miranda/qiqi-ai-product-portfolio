export const DRAFT_KEY = 'crossbound-service-brief-v1';
export const CONTACT = { address: 'service@crossbound.example', placeholder: true };
export const SERVICES = [
  { id: 'diagnosis', name: '商品出海快诊', short: '先看清方向', question: '有产品，先去哪里卖？',
    intro: '围绕一款商品和一个目标国家，把成本、待验证的问题与下一步放在一起看。',
    scope: '一款商品 · 一个国家 · 一个主要问题', price: '¥699–999 / 单', time: '预计 3 天',
    outputs: ['一页商品与市场判断', '一份成本测算', '三项行动建议'],
    materials: ['商品规格、用途与包装尺寸重量', '采购成本、拟售价与运费依据', '目标国家及当前经营背景'],
    boundary: '聚焦经营判断；专项认证、税务意见与店铺操作另行确认。',
    example: '例如：我们已有一款桌灯，想判断目标市场的售价能否覆盖成本。' },
  { id: 'listing', name: '首件上架资料包', short: '把商品说明白', question: '有商品，怎样准备上架？',
    intro: '把已有的商品事实和授权素材，整理成一套清楚、完整、便于提交的上架资料。',
    scope: '一款商品 · 一个平台 · 一种语言', price: '¥1,999–3,999 / 款', time: '预计 7 天',
    outputs: ['标题、卖点与详情文案', '三份图片修改标注、两条视频脚本', '上架检查清单与一次集中修改'],
    materials: ['商品规格、拟售价与真实卖点', '已有图片及素材使用授权', '目标平台、语言与待补内容'],
    boundary: '3 天出初稿、7 天形成资料包；不含拍摄、账号上传与平台审核通过。',
    example: '例如：我们已有图片和规格，想补齐这款产品的英文上架资料。' },
  { id: 'training', name: '企业岗位训练', short: '让团队先协作', question: '有团队，怎样开始配合？',
    intro: '让 5–10 位同事围绕同一款商品，在 2 小时标准训练中走完一次经营决策。',
    scope: '5–10 人 · 同一款商品 · 2 小时', price: '¥4,900–9,800 / 场', time: '预计 7 天内安排',
    outputs: ['每组一份经营作业', '基于任务的集中反馈', '团队能力缺口与训练建议'],
    materials: ['参与人数、岗位与基础', '同一款商品及可用的脱敏资料', '训练目标、组织负责人和期望时间'],
    boundary: '企业组织学员与场地；按小组反馈，逐人辅导和专属课程另行确认。',
    example: '例如：我们准备组建跨境团队，想先看清选品、内容和履约怎样配合。' },
];
const limits = { company: 60, product: 120, target: 120, problem: 800, timing: 100, notes: 600 };
export function serviceFor(id) { return SERVICES.find(s => s.id === id) || SERVICES[0]; }
export function normalizeDraft(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const draft = { version: 1, serviceId: serviceFor(source.serviceId).id };
  for (const [key, limit] of Object.entries(limits)) draft[key] = typeof source[key] === 'string' ? source[key].slice(0, limit) : '';
  draft.ready = Array.from({ length: 3 }, (_, i) => source.ready?.[i] === true);
  return draft;
}
export function draftErrors(draft) {
  const d = normalizeDraft(draft), errors = {};
  if (!d.product.trim()) errors.product = '请填一款商品，或这次训练使用的商品方向。';
  if (!d.problem.trim()) errors.problem = '请写下这次最想推进的一件事。';
  return errors;
}
export function formatBrief(value) {
  const d = normalizeDraft(value), s = serviceFor(d.serviceId);
  const materials = s.materials.map((label, i) => `${d.ready[i] ? '已备有' : '待准备'}：${label}`).join('\n');
  return [
    '傲基跨境大学｜企业经营服务需求清单', '本机草稿 · 尚未发送', '',
    `所选服务：${s.name}`, `企业简称：${d.company.trim() || '待确认'}`,
    `商品或方向：${d.product.trim() || '待确认'}`, `目标国家 / 平台：${d.target.trim() || '待确认'}`,
    `本次问题：${d.problem.trim() || '待确认'}`, `期望时间：${d.timing.trim() || '待确认'}`, '',
    '准备材料', materials, `补充说明：${d.notes.trim() || '无'}`, '',
    '期望成果', ...s.outputs.map(x => `· ${x}`), '',
    `范围参考：${s.scope}`, `参考试价：${s.price}（非正式报价）`,
    `周期参考：${s.time}；资料齐备、范围及伙伴排期确认后起算。`, s.boundary, '',
    '待双方确认：实际交付方、服务范围、费用、合作约定与排期。',
    '本清单未发送，不代表下单或已安排服务。正式对接渠道待公布。',
  ].join('\n');
}
