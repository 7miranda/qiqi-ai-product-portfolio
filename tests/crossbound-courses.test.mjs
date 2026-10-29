import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import {
  CHAPTERS, PHASES, PRACTICES, WEEKS, CAMP,
} from '../public/previews/crossbound/courses/model.js';

const chapterTitles = [
  '工厂第一次做海外生意 先选哪种做法',
  '先卖到哪个国家 哪些条件要查清',
  '到底谁会买 为什么愿意买',
  '先卖哪款产品 资料要准备到什么程度',
  '一件产品卖出去 扣掉费用还剩多少钱',
  '货款还没到账 前面的钱够不够付',
  '在哪里卖 开卖前还缺什么',
  '怎样介绍工厂和产品 让客户看明白',
  '怎样找到第一批客户 先花多少钱试一试',
  '客户有兴趣以后 怎样推进到下单',
  '订单来了 怎样备货并按时送到',
  '退货投诉和质量问题 怎么处理',
  '生意做得不好 先查哪里',
  '团队怎么分工 外部合作怎么管',
  '哪些工作可以让AI帮忙 结果由谁检查',
  '未来90天先做什么 什么时候继续或暂停',
];

// Source snapshots cover every original field without relying on a local source file.
const chapterDigests = [
  '645a20141210c2c2e488d0537c2ecbeeb23277af7b3c573730b7b9b261209149',
  '161f4d1e210f7671e3c895934f1536a1c60f60d605dd4872766244b58d5aa4fc',
  'd765ef09dc32fe2623abf28f576d9284f18ef39626a17e0da65e2310262acd98',
  'd4b5a15cb332d03117a3c4c97ee1704da6f7322b66db5802e9dfc6cbb733a4a4',
  '0cb87af63208223f3b398cc7313c6268bd9a30196c908ce436a715b41b4d87a1',
  '39d56509e1f3dd10341685efb3b9d8c06545fc33300dfea32f783bedf6adac65',
  'ba944c31b5e9b78f6813fe0dbacc802471e8e40434a3d36b17324b01572bf739',
  '058a0bd6a7f1327ce91eea2659d095d3ba8aeafe0c3b0a1f03dd09bcb455eeb4',
  '7eb1d196cb7ccd4e53da3fe92c44daffbeb32c2a21227afad25e42bd39a25267',
  '5192a3a507be5f97c60fbef5a4461a9aafa02721bdd8df959b716e5f75d48184',
  '1b2c068f24522f7edf8d1dc8df3e7f7146b4dbdbbc184671cb0c0f92bf5729f0',
  'c951c87c34245e4ca447e78550f91aa7f4e420408d47610b8b7da3db97a189d9',
  '98d3bb20eeb1ab0db64be5aaa490f57d4d0c2cfb7d6e8b8d532317af05f9e697',
  '65406821e5ac27c1e7ac9c7f29f7983e37a274dc1e1588143855506569806fa1',
  '72811a25932a17f3f7735b6227bd5a7db186d2584e3a3fbf70bb257637320815',
  '54df66c952fb24fe3842fe31f1f198fd289e8565fc5d20de50dfc6b7040044b1',
];

test('the curriculum contains all 16 chapters and 64 complete section pairs', () => {
  assert.equal(CHAPTERS.length, 16);
  assert.deepEqual(CHAPTERS.map(chapter => chapter.number), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.deepEqual(CHAPTERS.map(chapter => chapter.title), chapterTitles);
  assert.equal(CHAPTERS.flatMap(chapter => chapter.sections).length, 64);
  for (const chapter of CHAPTERS) {
    assert.equal(chapter.sections.length, 4, `chapter ${chapter.number}`);
    for (const pair of chapter.sections) {
      assert.equal(pair.length, 2);
      for (const text of pair) assert.equal(typeof text === 'string' && text.trim().length > 0, true);
    }
    for (const field of ['teach', 'example', 'practice', 'check', 'takeaway']) {
      assert.equal(typeof chapter[field] === 'string' && chapter[field].trim().length > 0, true, field);
    }
  }
});

test('original titles, teaching notes, section details, examples, exercises and checks stay complete', () => {
  for (const [index, chapter] of CHAPTERS.entries()) {
    const originalFields = Object.fromEntries(
      ['number', 'title', 'teach', 'sections', 'example', 'practice', 'check'].map(key => [key, chapter[key]]),
    );
    const digest = createHash('sha256').update(JSON.stringify(originalFields)).digest('hex');
    assert.equal(digest, chapterDigests[index], `source content of chapter ${chapter.number}`);
  }
});

test('business checks retain cost, cash, evidence, AI review and action-plan boundaries', () => {
  assert.match(CHAPTERS[1].check, /待核实/);
  assert.match(CHAPTERS[4].example, /100美元.*5美元.*80美元.*15美元/);
  assert.match(CHAPTERS[4].check, /最终净利润的区别/);
  assert.match(CHAPTERS[5].check, /不会把未收到的货款当成现有资金/);
  assert.match(CHAPTERS[8].check, /不会只因播放量高/);
  assert.match(CHAPTERS[14].example, /没有的认证.*缺尺寸/);
  assert.match(CHAPTERS[14].check, /没有测量过的节省时间/);
  assert.match(CHAPTERS[15].check, /90天是安排工作的时间，不是收益承诺/);
});

test('four readable phases cover chapters 1–16 once in order', () => {
  assert.deepEqual(PHASES.map(phase => phase.id), ['choose', 'prepare', 'deliver', 'improve']);
  assert.deepEqual(PHASES.map(({ from, to }) => [from, to]), [[1, 4], [5, 8], [9, 12], [13, 16]]);
  assert.deepEqual(
    PHASES.flatMap(({ from, to }) => Array.from({ length: to - from + 1 }, (_, i) => from + i)),
    CHAPTERS.map(chapter => chapter.number),
  );
  for (const phase of PHASES) {
    assert.ok(phase.title.trim());
    assert.ok(phase.outcome.trim());
  }
});

test('three business practices preserve both halves of the selected transaction exercise', () => {
  assert.deepEqual(PRACTICES, [
    {
      id: 'supply', title: '给合作方供货',
      first: ['检查买方要求、样品、报价、验收、付款和各方责任。'],
      second: ['模拟生产、交货和对账；遇到延期或质量争议，写出处理办法。'],
    },
    {
      id: 'enterprise', title: '自己卖给海外企业客户',
      first: ['判断客户的采购需要，准备回复、报价和下一步联系。'],
      second: ['模拟送样、接单、交期确认和收款，处理一项临时变化。'],
    },
    {
      id: 'consumer', title: '直接卖给海外消费者',
      first: ['检查商品资料，做一份商品介绍草稿，查收款和发货准备。'],
      second: ['模拟下单、付款、发货和退款，核对费用与剩余库存。'],
    },
  ]);
});

test('eight weeks retain their teaching sequence and a distinct assignment each week', () => {
  assert.deepEqual(WEEKS.map(week => week.week), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(WEEKS.map(week => week.lessons), [
    ['第1至4章'], ['第5至6章'], ['第7至8章'], ['第9至10章'],
    ['第11至12章'], ['第13至14章'],
    ['第15章和所选做法练习上半段'], ['所选做法练习下半段和第16章'],
  ]);
  assert.deepEqual(WEEKS.map(week => week.assignment), [
    '确定先做哪种生意、选哪个国家、找哪类客户、先卖哪款产品。',
    '完成一件产品的费用表和付款收款日期表。',
    '完成开卖准备清单和一份商品或工厂介绍草稿。',
    '完成第一次找客户的尝试安排和客户跟进表。',
    '完成备货发货安排和客户问题处理表。',
    '完成一页生意检查表，以及团队分工和交接表。',
    '提交AI辅助样稿，以及所选做法的报价、客户回复或商品介绍等准备草稿。',
    '完成交易练习，汇报未来90天行动计划并按意见修改。',
  ]);
  assert.equal(new Set(WEEKS.map(week => week.assignment)).size, 8);
});

test('weekly classroom hours add up to 24 foundation hours plus 3 practice hours over 9 sessions', () => {
  assert.deepEqual(WEEKS.map(week => week.hours), [6, 3, 3, 3, 3, 3, 3, 3]);
  assert.equal(WEEKS.length, CAMP.weeks);
  assert.equal(CAMP.foundationHours, 24);
  assert.equal(CAMP.practiceHours, 3);
  assert.equal(CAMP.classroomHours, 27);
  assert.equal(WEEKS.reduce((hours, week) => hours + week.hours, 0), CAMP.classroomHours);
  assert.equal(CAMP.foundationHours + CAMP.practiceHours, CAMP.classroomHours);
  assert.equal(CAMP.sessions, 9);
  assert.equal(WEEKS.reduce((sessions, week) => sessions + week.hours / 3, 0), CAMP.sessions);
});

test('each enterprise has 29 hours including tutoring, with a 32-hour optional maximum', () => {
  assert.equal(CAMP.status, '首期建议方案');
  assert.equal(CAMP.enterprises, 2);
  assert.equal(CAMP.peopleMin, 3);
  assert.equal(CAMP.peopleMax, 5);
  assert.equal(CAMP.tutoringHours, 2);
  assert.equal(CAMP.totalHours, 29);
  assert.equal(CAMP.maxRemedialHours, 3);
  assert.equal(CAMP.maxTotalHours, 32);
  assert.equal(CAMP.classroomHours + CAMP.tutoringHours, CAMP.totalHours);
  assert.equal(CAMP.totalHours + CAMP.maxRemedialHours, CAMP.maxTotalHours);
});

test('all teaching and tutoring are offline, with weeks 3 and 6 tutoring and eight feedback rounds', () => {
  assert.match(CAMP.format, /线下培训.*课程和企业专题辅导均线下开展/);
  assert.deepEqual(CAMP.tutoringWeeks, [3, 6]);
  assert.equal(CAMP.tutoringMinutesEach, 60);
  assert.match(CAMP.tutoringScope, /第3周和第6周.*每家企业.*另安排60分钟线下专题辅导.*不占27小时课堂/);
  assert.equal(CAMP.tutoringWeeks.length * CAMP.tutoringMinutesEach / 60, CAMP.tutoringHours);
  assert.equal(CAMP.assignments, 8);
  assert.equal(CAMP.feedbackPerAssignment, 1);
  assert.equal(CAMP.assignments, WEEKS.length);
  assert.match(CAMP.feedback, /第1至7周作业在下次课前给书面反馈/);
  assert.match(CAMP.feedback, /第8周结营时给现场点评单.*按意见修订/);
  assert.match(CAMP.confirmation, /首期方案建议.*开班前确认人员、场地、费用和服务范围/);
});

test('public course content exposes no internal files, invented enrolment, prices or return promises', () => {
  const publicText = JSON.stringify({ CHAPTERS, PHASES, PRACTICES, WEEKS, CAMP });
  assert.doesNotMatch(publicText, /\/Users\/|file:\/\/|\.work\/|plain_course_shared|内部PPT|领导讨论|汇报领导/);
  assert.doesNotMatch(publicText, /立即报名|报名链接|已开班|限时优惠|扫码付费|¥|￥|学费\s*\d|报名费\s*\d/);
  assert.doesNotMatch(publicText, /保证收益|承诺盈利|保底收益|保证出单|保证成交/);
  for (const field of ['price', 'enrolmentUrl', 'signupUrl', 'startDate']) {
    assert.equal(Object.hasOwn(CAMP, field), false, field);
  }
});
