import { SERVICES, CONTACT, DRAFT_KEY, serviceFor, normalizeDraft, draftErrors, formatBrief } from './model.js?v=fcd816f690';

// Reuse the installed ReactBits CutButton via the application's Button adapter.
// This module only prepares a local brief; it never changes the simulation or sends data.
export function createServicesUI({ React, Button }) {
  const h = React.createElement;
  const button = (label, onClick, props = {}) => h(Button, { variant: 'outline', type: 'button', onClick, ...props }, label);
  const arrow = () => h('svg', { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', 'aria-hidden': true }, h('path', { d: 'M5 12h14m-6-6 6 6-6 6', stroke: 'currentColor', strokeWidth: 1.6 }));
  function Nav() {
    return h('nav', { className: 'portal-nav portal-nav-v21 services-navigation', 'aria-label': '首页主要入口' },
      [['home-intelligence', '出海情报'], ['home-start', '模拟经营'], ['home-services', '企业服务'], ['home-cases', '卖家案例']].map(([id, label], i) =>
        h('a', { key: id, href: `#${id}` }, h('small', { 'aria-hidden': true }, `0${i + 1}`), h('span', null, label), arrow())));
  }
  function Home({ onOpen }) {
    return h('section', { id: 'home-services', className: 'services-home', 'aria-labelledby': 'services-home-title' },
      h('header', { className: 'services-home-heading' }, h('span', { className: 'eyebrow' }, '03 / 企业经营服务'),
        h('h2', { id: 'services-home-title' }, '把下一步经营，', h('span', { className: 'signal-text' }, '落到实处')),
        h('p', null, '先在模拟中看懂生意，再为自己的产品和团队，找到一项具体帮助。')),
      h('div', { className: 'services-home-grid' }, SERVICES.map((s, i) => h('article', { key: s.id },
        h('span', { className: 'services-index' }, `0${i + 1} / ${s.short}`), h('h3', null, s.name), h('p', null, s.question),
        h('p', { className: 'services-home-outcome' }, ['一页判断、一份成本测算、三项行动建议。', '商品文案、素材修改建议与上架检查清单。', '一次经营带练、一份团队能力反馈。'][i]), h('small', null, s.scope)))),
      h('div', { className: 'services-home-action' }, h('div', null, h('strong', null, '一位负责人，协调专业伙伴'), h('p', null, '先梳理问题与资料，再确认成果、费用和排期。')),
        button(h(React.Fragment, null, '整理服务需求', arrow()), onOpen, { variant: 'solid', 'data-services-home-trigger': true })),
      h('p', { className: 'services-quiet' }, '目前可在本机形成需求清单，复制或下载带走。'));
  }
  function Review({ onOpen }) {
    return h('section', { className: 'services-review', 'aria-label': '把经营复盘用于真实业务' },
      h('div', null, h('span', { className: 'eyebrow' }, '从模拟，到自己的生意'), h('h3', null, '把这轮经验，变成下一步'), h('p', null, '有真实商品或团队问题？整理成一份需求清单，再决定需要哪项帮助。')),
      button('整理真实业务需求', onOpen, { 'data-service-review-trigger': true }));
  }
  function Workspace({ context }) {
    const [draft, setDraft] = React.useState(() => { try { return normalizeDraft(JSON.parse(localStorage.getItem(DRAFT_KEY))); } catch { return normalizeDraft(); } });
    const [errors, setErrors] = React.useState({}), [formed, setFormed] = React.useState(false), [message, setMessage] = React.useState('');
    const form = React.useRef(null), result = React.useRef(null), output = React.useRef(null);
    const service = serviceFor(draft.serviceId), brief = formatBrief(draft);
    const persist = next => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(normalizeDraft(next))); return true; } catch { return false; } };
    const change = next => { setDraft(next); setFormed(false); setMessage(persist(next) ? '' : '浏览器无法保存草稿；离开前请先形成清单并下载。'); };
    const update = (key, value) => { change({ ...draft, [key]: value }); setErrors(e => ({ ...e, [key]: undefined })); };
    const changeService = id => { if (id !== draft.serviceId) change({ ...draft, serviceId: id, ready: [false, false, false] }); };
    const generate = e => {
      e.preventDefault(); const invalid = draftErrors(draft); setErrors(invalid);
      if (Object.keys(invalid).length) { form.current?.elements.namedItem(Object.keys(invalid)[0])?.focus(); return; }
      let saved = true; try { localStorage.setItem(DRAFT_KEY, JSON.stringify(normalizeDraft(draft))); } catch { saved = false; }
      setFormed(true); setMessage(saved ? '清单已形成并保存在本机，尚未发送。' : '清单已形成；浏览器无法保存，请复制或下载。');
      requestAnimationFrame(() => { result.current?.focus(); result.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
    };
    const copy = async () => {
      try { if (!navigator.clipboard?.writeText) throw new Error('No clipboard'); await navigator.clipboard.writeText(brief); setMessage('清单已复制，尚未发送。'); }
      catch { output.current?.focus(); output.current?.select(); try { if (document.execCommand('copy')) { setMessage('清单已复制，尚未发送。'); return; } } catch {} setMessage('请复制已选中的清单，或下载保存。'); }
    };
    const download = () => {
      const url = URL.createObjectURL(new Blob(['\ufeff', brief], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = '跨境大学-经营服务需求清单.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('清单已下载，尚未发送。');
    };
    const field = (key, label, props = {}) => h('div', { className: `services-field ${props.wide ? 'is-wide' : ''}`, key }, h('label', { htmlFor: `services-${key}` }, label),
      h(props.multiline ? 'textarea' : 'input', { id: `services-${key}`, name: key, value: draft[key], maxLength: props.maxLength || 120, autoComplete: 'off', rows: props.multiline ? 4 : undefined,
        placeholder: props.placeholder, required: key === 'product' || key === 'problem', 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? `service-error-${key}` : undefined,
        onChange: e => update(key, e.target.value) }), errors[key] && h('small', { id: `service-error-${key}`, className: 'services-error' }, errors[key]));
    return h('div', { className: 'services-workspace' },
      h('header', { className: 'services-space-heading' }, h('span', { className: 'eyebrow' }, '企业经营服务 / 需求准备'), h('h2', { id: 'campaign-dialog-title' }, '先把下一步，说清楚'),
        h('p', null, '选一项帮助，核对资料，再带走一份需求清单。草稿自动保存在本机，不会发送。'),
        context && h('p', { className: 'services-context' }, `本轮练习：${context}。下方填写你的真实业务，模拟资金与成绩不会带入。`)),
      h('ol', { className: 'services-steps', 'aria-label': '整理需求的顺序' }, ['确认问题', '准备资料', '形成需求清单'].map((name, i) => h('li', { key: name }, h('span', null, `0${i + 1}`), name))),
      h('form', { ref: form, noValidate: true, onSubmit: generate },
        h('section', { className: 'services-stage', 'aria-labelledby': 'services-step-one' }, h('h3', { id: 'services-step-one' }, h('span', null, '01'), '你想先推进哪件事？'),
          h('div', { className: 'services-choices', role: 'group', 'aria-label': '选择服务方向' }, SERVICES.map(s => button(s.name, () => changeService(s.id), { key: s.id, 'aria-pressed': s.id === service.id }))),
          h('div', { className: 'services-detail-grid' },
            h('fieldset', { className: 'services-surface' }, h('legend', null, '问题与目标'),
              field('company', '企业简称（选填）', { maxLength: 60, placeholder: '便于识别这份清单…' }),
              field('product', '商品名称或训练使用的商品方向', { placeholder: '填写这次讨论的一款商品…' }),
              field('target', '目标国家 / 平台（选填）', { placeholder: '例如：美国 / Amazon，或待定…' }),
              field('problem', '这次最想解决的一件事', { multiline: true, maxLength: 800, placeholder: service.example })),
            h('article', { className: 'services-surface services-scope', 'aria-label': '所选服务范围' }, h('span', { className: 'services-index' }, service.short), h('h3', null, service.name), h('p', null, service.intro),
              h('h4', null, '成果包括'), h('ul', null, service.outputs.map(x => h('li', { key: x }, x))),
              h('dl', null, h('div', null, h('dt', null, '服务范围'), h('dd', null, service.scope)), h('div', null, h('dt', null, '参考试价'), h('dd', null, service.price)), h('div', null, h('dt', null, '成果周期'), h('dd', null, service.time))),
              h('p', { className: 'services-quiet' }, '资料齐备、范围与伙伴排期确认后起算；费用以正式报价为准。'), h('p', { className: 'services-boundary' }, service.boundary)))),
        h('section', { className: 'services-stage', 'aria-labelledby': 'services-step-two' }, h('h3', { id: 'services-step-two' }, h('span', null, '02'), '已有的勾选，暂缺的先列清楚'),
          h('p', null, '只记录资料准备情况，不上传文件。未勾选的项目会列为待准备。'),
          h('div', { className: 'services-materials' }, service.materials.map((label, i) => h('label', { key: service.id + i },
            h('input', { type: 'checkbox', name: `material-${i}`, checked: draft.ready[i], onChange: e => { const ready = [...draft.ready]; ready[i] = e.target.checked; update('ready', ready); } }), h('span', null, label)))),
          h('div', { className: 'services-extra-fields' }, field('timing', '期望时间（选填）', { maxLength: 100, placeholder: '例如：下月准备上架…' }), field('notes', '待补资料或其他说明（选填）', { multiline: true, maxLength: 600, placeholder: '把暂时没有的资料或需要确认的事写在这里…' })),
          h('div', { className: 'services-generate' }, h('p', null, '确认以上内容后，形成可带走的清单。'), button('形成需求清单', undefined, { type: 'submit', variant: 'solid' }))),
        h('section', { className: 'services-stage services-result', 'aria-labelledby': 'services-step-three' }, h('h3', { id: 'services-step-three', ref: result, tabIndex: -1 }, h('span', null, '03'), formed ? '清单已就绪，核对后带走' : '下一步：核对并带走清单'),
          formed ? h(React.Fragment, null, h('textarea', { ref: output, value: brief, readOnly: true, rows: 14, 'aria-label': '可复制的经营服务需求清单' }),
            h('div', { className: 'services-export' }, button('复制需求清单', copy, { variant: 'solid' }), button('下载需求清单', download)),
            button('删除本机草稿', () => { if (!window.confirm('删除这份本机需求草稿？经营进度不受影响。')) return; try { localStorage.removeItem(DRAFT_KEY); } catch { setMessage('未能删除本机草稿，请检查浏览器存储设置。'); return; } setDraft(normalizeDraft()); setFormed(false); setMessage('本机需求草稿已删除，经营进度保留。'); }, { className: 'services-delete' })) : h('p', { className: 'services-quiet' }, '填写商品与问题后，点击上方“形成需求清单”。'),
          h('p', { role: 'status', 'aria-live': 'polite', className: 'services-status' }, message))),
      h('footer', { className: 'services-handoff' }, h('strong', null, '一位负责人，协调专业伙伴'), h('p', null, '实际交付方、服务范围、费用和合作约定，均在排期前确认。'),
        CONTACT.placeholder && h('div', null, h('span', null, '商务对接 · 演示邮箱'), h('code', null, CONTACT.address)), h('small', null, '正式联系方式待公布。此页只整理本机草稿，清单不会自动发送。')));
  }
  return { Nav, Home, Review, Workspace };
}
