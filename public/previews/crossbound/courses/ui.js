import { CHAPTERS, PHASES, PRACTICES, WEEKS, CAMP } from './model.js?v=4b5ea73d10';

// Reuse the site's installed ReactBits CutButton. Reading a course never changes a game save.
export function createCoursesUI({ React, Button }) {
  const h = React.createElement;
  const button = (label, onClick, props = {}) => h(Button, { type: 'button', variant: 'outline', onClick, ...props }, label);
  const caption = '企业线下培训 · 课程方案展示';
  function Facts() {
    return h('dl', { className: 'course-facts' },
      [['16', '个章节'], ['64', '个小节'], ['27', '小时核心课堂'], ['8', '周建议陪跑']].map(([value, label]) =>
        h('div', { key: label }, h('dt', null, label), h('dd', null, value))));
  }
  function Home({ onOpen }) {
    return h('section', { id: 'home-courses', className: 'courses-home', 'aria-labelledby': 'courses-home-title' },
      h('header', { className: 'courses-home-heading' }, h('span', { className: 'eyebrow' }, '03 / 工厂出海基础课程'),
        h('h2', { id: 'courses-home-title' }, '带着一款产品，', h('br'), h('span', { className: 'signal-text' }, '学会做海外生意')),
        h('p', null, '先选国家和客户，再算清费用、找客户、接订单、把货交好。16章逐步讲清，每章都有例子、练习和可以带走的工作表。'),
        h('p', { className: 'course-format' }, caption)),
      h(Facts),
      h('ol', { className: 'course-phases' }, PHASES.map((phase, index) => h('li', { key: phase.id },
        h('span', { className: 'course-phase-number' }, `0${index + 1}`), h('div', null,
          h('small', null, `第${phase.from}–${phase.to}章 · 16小节`), h('h3', null, phase.title), h('p', null, phase.outcome))))),
      h('div', { className: 'course-home-actions' }, button('查看16章完整课纲', () => onOpen('syllabus'), { variant: 'solid', 'data-courses-trigger': true }),
        button('了解8周线下陪跑', () => onOpen('camp'))),
      h('p', { className: 'course-note' }, '围绕同一款产品，逐周做成企业未来90天行动计划。陪跑周期、人数与交付安排为首期建议，开班前确认。'));
  }
  function Chapter({ chapter }) {
    return h('details', { className: 'course-chapter', open: chapter.number === 1 || undefined },
      h('summary', null, h('span', { className: 'course-chapter-index' }, String(chapter.number).padStart(2, '0')),
        h('span', null, chapter.title), h('small', null, '4小节 · 90分钟'), h('span', { className: 'course-expand', 'aria-hidden': true }, '+')),
      h('div', { className: 'course-chapter-body' }, h('p', { className: 'course-teach' }, chapter.teach),
        h('ol', { className: 'course-sections' }, chapter.sections.map(([title, detail], i) => h('li', { key: title },
          h('span', { className: 'course-section-number' }, `${chapter.number}.${i + 1}`),
          h('div', null, h('h4', null, title), h('p', null, detail))))),
        h('div', { className: 'course-lesson-notes' },
          h('div', null, h('h4', null, '先看一个例子'), h('p', null, chapter.example)),
          h('div', null, h('h4', null, '你来练什么'), h('p', null, chapter.practice)),
          h('div', null, h('h4', null, '完成后带走'), h('p', null, chapter.takeaway)),
          h('div', null, h('h4', null, '怎样算完成'), h('p', null, chapter.check)))));
  }
  function Syllabus() {
    return h('section', { className: 'course-syllabus', 'aria-labelledby': 'course-syllabus-heading' },
      h('h3', { id: 'course-syllabus-heading' }, '16章，每章4小节，一步步做出自己的方案'),
      h('p', { className: 'course-note' }, '16章共24小时。学完后从三种做法中选一种，再做3小时完整练习。点击章节，查看学什么、怎么练、带走什么。'),
      PHASES.map(phase => h('section', { key: phase.id, className: 'course-phase-detail', 'aria-labelledby': `course-phase-${phase.id}` },
        h('header', null, h('small', null, `第${phase.from}–${phase.to}章 · 16小节`), h('h3', { id: `course-phase-${phase.id}` }, phase.title), h('p', null, phase.outcome)),
        CHAPTERS.filter(c => c.number >= phase.from && c.number <= phase.to).map(chapter => h(Chapter, { key: chapter.number, chapter })))),
      h('section', { className: 'course-practices', 'aria-labelledby': 'course-practices-title' },
        h('h3', { id: 'course-practices-title' }, '三种做法，选一种完整练习'), h('p', { className: 'course-note' }, '两次线下练习，每次90分钟，共3小时。练习结果写进未来90天行动计划。'),
        h('div', { className: 'course-practice-grid' }, PRACTICES.map(route => h('article', { key: route.id }, h('h4', null, route.title),
          h('h5', null, '先练'), h('ul', null, route.first.map(text => h('li', { key: text }, text))),
          h('h5', null, '再练'), h('ul', null, route.second.map(text => h('li', { key: text }, text))))))),
      h('p', { className: 'course-game-note' }, '模拟经营可以帮助观察不同选择怎样影响订单、费用和库存。课程练习还要回到企业资料，完成工作表、说明理由，再换条件重新判断。游戏过关和成绩不直接代表课程掌握程度。'));
  }
  function Camp() {
    return h('section', { className: 'course-camp', 'aria-labelledby': 'course-camp-heading' },
      h('header', { className: 'course-view-heading' }, h('span', { className: 'course-format' }, CAMP.status),
        h('h3', { id: 'course-camp-heading' }, '每周学、每周做，老师逐份反馈'),
        h('p', null, '建议2家企业，每家3–5人。共同课堂、三选一练习和企业专题辅导均在线下开展，可在集中培训场地或企业会议室进行。')),
      h('ol', { className: 'course-camp-loop' }, [
        ['课前带资料', '带同一款产品及本周资料，先查缺项。'],
        ['线下学与练', '老师示范，企业小组跟做，再换条件独立完成。'],
        ['每周交作业', '每家企业交1份作业，负责人统稿，8周共8份。'],
        ['反馈后修改', '每份获得1次反馈，保留修改前后两个版本。'],
      ].map(([title, text], i) => h('li', { key: title }, h('small', null, `0${i + 1}`), h('h4', null, title), h('p', null, text)))),
      h('p', { className: 'course-note' }, '第1–7周：下次课前给书面反馈。第8周：结营现场给点评单，再修订。'),
      h('h3', null, '8周怎样排课'), h('p', { className: 'course-note' }, '第1周上2次，之后每周1次，共9次课堂，每次3小时。企业专题辅导另排时间。'),
      h('div', { className: 'course-table-wrap', tabIndex: 0, role: 'region', 'aria-label': '8周线下课程与作业表，可横向滚动' },
        h('table', { className: 'course-table' }, h('caption', null, '8周企业线下陪跑建议课表'),
          h('thead', null, h('tr', null, ['周次', '线下课程', '每周企业作业'].map(label => h('th', { key: label, scope: 'col' }, label)))),
          h('tbody', null, WEEKS.map(week => h('tr', { key: week.week }, h('th', { scope: 'row' }, `第${week.week}周`),
            h('td', null, week.lessons.join('；'), h('small', null, `${week.hours}小时${week.week === 1 ? ' · 分2次' : ''}`)), h('td', null, week.assignment)))))),
      h('section', { className: 'course-tutoring' }, h('h3', null, '每家企业，再有两次单独辅导'),
        h('div', null, h('article', null, h('h4', null, '第3周课后 · 60分钟'), h('p', null, '核产品、费用和付款收款安排，检查开卖准备与介绍草稿。留下一份问题清单，写清先补什么、谁来补。')),
          h('article', null, h('h4', null, '第6周课后 · 60分钟'), h('p', null, '核库存、售后、经营记录和分工。留下一份调整清单，写清修改项、负责人和期限。')))),
      h('section', { className: 'course-hours' }, h('h3', null, '每家企业29小时，怎样组成'),
        h('p', null, h('strong', null, '24小时基础课 ＋ 3小时做法练习 ＋ 2小时企业辅导 ＝ 29小时。')),
        h('p', null, '前两项为27小时核心课堂。企业辅导另排，不占课堂；零基础可按缺口另加最多3小时补修，全部补修者最多32小时。作业及修订另留时间。')),
      h('p', { className: 'course-plan-note' }, '以上周期、人数、课时、辅导和反馈均为首期建议方案。开班前确认企业、老师、场地、费用与服务范围。'));
  }
  function Prepare() {
    return h('section', { className: 'course-prepare', 'aria-labelledby': 'course-prepare-heading' },
      h('h3', { id: 'course-prepare-heading' }, '带一款产品，带一个真实问题'),
      h('p', null, '适合准备尝试海外业务的工厂负责人、业务负责人，以及产品、营销、销售、财务和供应链协作人员。同一人可兼任多个角色，关键事项要有人负责。'),
      h('div', { className: 'course-prepare-grid' },
        h('section', null, h('h4', null, '课前准备'), h('ul', null, ['一款先讨论的产品，及尺寸、材质、包装、图片等已有资料。', '现有客户、报价、成本或交货资料，缺少的先标出来。', '一个希望解决的问题，以及每周可以统稿的企业负责人。'].map(text => h('li', { key: text }, text)))),
        h('section', null, h('h4', null, '结营带走'), h('ul', null, ['选定的国家、客户、产品和经营做法。', '费用、资金、开卖、找客户、交货与分工等配套工作表。', '未来30天、60天、90天的任务、负责人和检查条件。'].map(text => h('li', { key: text }, text))))),
      h('p', { className: 'course-note' }, '资料不足时，课堂使用明确标注的模拟案例。真实企业资料在脱敏和授权明确后使用。'),
      h('div', { className: 'course-plan-note' }, h('strong', null, '这是一套线下课程与陪跑方案。'), h('p', null, '当前网页用于了解大纲和交付安排。开班日期、费用与正式联系方式待确认；此页不提交报名，也不代表已安排课程。')));
  }
  function Workspace({ initialView = 'syllabus' }) {
    const [view, setView] = React.useState(['syllabus', 'camp', 'prepare'].includes(initialView) ? initialView : 'syllabus');
    return h('div', { className: 'courses-workspace' },
      h('header', { className: 'course-space-heading' }, h('span', { className: 'eyebrow' }, caption),
        h('h2', { id: 'campaign-dialog-title' }, '工厂出海基础课程'),
        h('p', null, '围绕同一款产品，把选市场、算费用、找客户和交货，一步步做清楚。每章90分钟，讲完就练，最后形成企业未来90天行动计划。')),
      h(Facts),
      h('nav', { className: 'course-view-switch', 'aria-label': '选择课程内容' }, [['syllabus', ['课程大纲']], ['camp', ['8周', '线下陪跑']], ['prepare', ['参加前', '准备']]].map(([id, parts]) =>
        button(h('span', { className: 'course-view-label' }, parts.map(part => h('span', { key: part }, part))), () => setView(id), { key: id, 'aria-label': parts.join(''), 'aria-pressed': view === id, 'aria-controls': 'course-current-view' }))),
      h('div', { id: 'course-current-view' }, view === 'camp' ? h(Camp) : view === 'prepare' ? h(Prepare) : h(Syllabus)));
  }
  return { Home, Workspace };
}
