# crossbound 用户反馈与数据收集方案

> 2026-10-21。解决两件事：①反馈/留资的激励、触点与弹窗时机；②数据库表结构与有效字段。
> 前提：游戏目前是纯前端（localStorage 存档）。本方案 = 前端触点 + 一个轻 API + 一套表，失败不阻塞游戏。
> 与既有定版的关系：留资承接 REQ-034 纯荣誉版认证（留资入口已定版挂"出海评估报告"）；反馈激励用已有货币（建设点）与成就系统（REQ-040 成就馆）。

## 0. 与当前版本（f95a3b9）对齐——先分清"已有"和"新增"，不要重做

**已在游戏里、本方案直接复用的（不要重建）：**
- **评估报告本体已有**：四维评分（盈利力/稳定性/市场广度/经营认知）+ 段位 + 认证编号 + 短板建议，本地已实现（REQ-034）。T2 要做的只是给它加"摘要/完整"分层和留资门，**不是新建报告页**。
- **成就与货币系统已有**：成就馆（常驻入口+里程碑+红点提醒）、建设点、总部任务的发奖通道都已实现。共建者徽章 = **新增一枚徽章**挂进现成系统，不是新建徽章系统。
- **总部来电 UI 已有**：共建者专线复用其形态；但现任务都有"对错"，共建题**无对错**——需给任务系统加一个"共建题"类型标记（答完即完成、按映射入库），这是唯一要动老系统的地方。
- **同行榜 UI 已有（模拟数据版）**：本版**保持现状、不换数据源、不做公开排行榜**（2026-10-21 定版：v1 点开即玩、不做账号；战绩只在后台收）。

**本方案真正新增的（当前版本完全没有）：**
- 服务端全部：`users/leads/feedback/round_reports/quiz_answers/assessments/events/reward_claims` 8 张表 + 上报接口 + 本地重试队列；
- 留资表单页与后台留资名单（按评估分排序）；
- 反馈落库与后台聚合视图。

**结论**：游戏内要新写的只有三小块——共建题任务类型、报告分层+留资门、同行榜换数据源；其余全是服务端与后台。这也是本方案与 PRD REQ-044/045/046 的分工边界，执行时勿把已有功能再做一遍。

## 1. 总原则：三类数据，三种收法，不许混

| 数据 | 怎么收 | 激励 | 为什么 |
|---|---|---|---|
| 产品反馈（好玩吗/卡在哪/想要啥） | 主动问，3 题以内 | **建设点 + 「共建者」徽章** | 反馈是帮我们的忙，要即时回报；纯荣誉不够、纯金币显廉价，双管齐下 |
| 留资（联系方式） | 只出现在"领取"动作里 | **报告/清单本身**，不给金币 | 拿虚拟币换联系方式 = 羊毛与假号重灾区，数据全废；"领取我应得的东西"才是真动机 |
| 行为数据（每轮决策与成绩、来电答题对错） | 自动记，不弹窗、不打扰 | 无 | "游戏即面试"的核心资产：谁会选品、谁会定价、谁的经营认知过关，后台一目了然，比任何问卷都准 |

## 2. 触点与弹窗时机（定版）

### 2.0 分层收集：人走到哪层，数据收到哪层（2026-10-21 定版）

**原则：不设"玩满 N 轮才收集"的门槛。** 只玩一轮就走的人是多数，也是最该收的人（死在哪一步、为什么走，是迭代最值钱的信息）。按数据成熟度分三层：

| 层 | 时点 | 收什么 | 覆盖人群 |
|---|---|---|---|
| **L0 进门层** | 进入游戏起，全程 | events 漏斗（开始/到达步骤/中途退出点）+ 未完成轮次的进度快照 | 包括一轮没打完就走的人 |
| **L1 首轮层（主收集点）** | 第 1 轮结算 | 战报+答题自动收（REQ-044）；共建者专线在消息栏亮起（REQ-045）；**简版报告可领取→第 1 轮即可留资**（REQ-046） | 只玩一轮的人全覆盖 |
| **L2 深度层** | 第 3 轮结算 | 完整报告解锁；「总部回访」开放题 1 道（选填，15 字门槛，+30 建设点）；满 3 轮样本后台标"深度样本" | 少数深度玩家=高意向资产 |

关键设计两条：①**报告分级是奖励牵引不是门槛**——简版（≥1 轮：称号+盈利力+经营认知+一句话点评）第一轮就能拿；完整版（≥3 轮：四维全开+广度/稳定性评级）用"再玩 2 轮解锁完整评级"勾着往下玩。②**邮箱是只玩一轮人群的唯一召回通道**（后续同步局/新版本靠它通知），所以留资必须前置到第 1 轮，不能等"玩够了"。

总纪律：**只在结算后、情绪峰值出现；从不自动弹留资；每类弹窗有终身次数上限；已提交过的永不再弹。**

| # | 触点 | 时机 | 形式 | 给什么 | 频率 |
|---|---|---|---|---|---|
| T1 | 首轮反馈（共建者专线） | **第 1 轮结算后** | 「总部来电 · 共建者专线」在**右侧消息栏常驻提示**（复用现有消息系统，与成就提醒同栏），点开作答；**用户完成调研前不消失**（可折叠、不遮挡操作） | 答完 → **+50 建设点** + 解锁「共建者」徽章（进成就馆） | 常驻至完成（大版本更新出新题时可再亮起） |
| T2 | 留资·报告领取（MBTI 模式） | 任意轮结算的评估区，点「**把这单做成真的**」 | **第 1 轮起可领简版报告**（称号+盈利力+经营认知+一句话点评）；**满 3 轮解锁完整版**（四维全开+广度/稳定性评级）。流程：先展示**报告摘要**→ 点「领取报告」出表单 → **填邮箱** → 页面解锁对应版本报告 + 同一份**发送到邮箱** | 经营总结报告（页面+邮箱双达）+ 进"出海候补名单"；邮箱=唯一召回通道 | 入口常驻，**只在主动点击后出现，永不自动弹** |
| T3 | 留资·软提示 | 第 3 轮后仍未留资 | 成就馆/评估页常驻横幅（不弹窗） | 同 T2 | 常驻，不打扰 |
| T5 | 总部回访（深度层 L2） | **第 3 轮结算后** | 消息栏亮起「总部回访」：开放题 1 道"如果总部只能先帮你做一件事，你最想是哪件？"（**选填，填则 ≥15 字**） | 答完 **+30 建设点**；答者后台标"深度共建者"，留资跟进排最前 | 终身 1 次 |
| T4 | 同步局报告（未来） | 每期同步局结算 | 复用 T2 同一套 | 本周同题报告（名次+事件复盘） | 每期 1 次 |
| — | 退出挽留弹窗 | — | **不做** | 网页端拦截不可靠且体验差，与"不打断"原则冲突 | — |

## 3. 问卷与表单（字段定稿，宁少勿多）

**反馈收集方式（2026-10-21 用户定版）：不做问卷，做成一通「总部来电 · 共建者专线」。**
复用总部来电的 quiz 形态与文案腔调——玩家是在"玩"，不是在"填表"。3 道题、每题 ABCD、选项贴着游戏内容写且有梗；每答一题总部回一句回应文案（与现有 quiz 的 outcome 同写法）；答完结算奖励。

**题目 v2（2026-10-22 升级，用户指出 v1"太没有含金量"）**：v1 问的是爽不爽/卡不卡/先修啥——全是产品自嗨视角，答不出任何决策。v2 三题测三个真正值钱的维度：**来的人是谁（分流）、玩完想不想真做（意愿转化）、哪节课真教会了（教学有效性）**。题目定稿：

- **Q1（身份分流 → player_segment）** 总部：先对个暗号——现实里，你最接近哪种合伙人？
  A. 已经在做出海/带货了（老手） / B. 在做国内电商或内容，还没出海 / C. 完全新手，就是想搞懂跨境 / D. 纯路过，玩玩而已
  → 入库：veteran / domestic / newbie / casual。**这是所有分析的分母**：没有它，其他数据没法分人群看；老手的答案还会单独成组（= 免费专家评审）
- **Q2（意愿转化 → intent_shift）** 玩之前和现在比，你对"真去做一单跨境生意"的想法变了吗？
  A. 本来就想做，现在更想了 / B. 本来没想法，现在有点想试试 / C. 没什么变化 / D. 更不想了，比想象中麻烦
  → 入库：stronger / awakened / unchanged / deterred。**这是北极星的直接量尺**（玩懂→想做）；按 Q1 分组看：新手组 awakened 占比 = 教学转化率
- **Q3（顿悟时刻 → insight_moment）** 这一轮里，哪一下最让你"哦——原来是这么回事"？
  A. 关税和进口税，原来是两笔钱 / B. 退货的坑，货退回来基本等于扔了 / C. 广告费吃利润，卖得多不等于赚得多 / D. 钱要等回款，账上赚钱手里没钱
  → 入库：tax / returns / ads / cashflow。告诉我们**哪节课真教进去了**；选得最少的那个环节 = 教学失效点，优先重做
- 3 题之后一个**选填**文字框，问法升级（→ help_wanted）：**"如果总部能帮你把一单生意真的做成，你最想我们帮你搞定哪件事？"** 不填可交；**填则最少 15 字**（实时提示"还差 X 字"，DB CHECK 兜底），写满视为有效共建建议、额外 +20 建设点。这题挖的是**真实服务需求**（选品/货源/物流/达人对接……），是未来真实业务的机会清单，比"想吐槽什么"值钱得多
- v1 的 fun_score / stuck_step / want_most 三个字段**废弃**（stuck 的定位价值已由战报+答题数据覆盖，不必再问玩家）

> 选项文案纪律：必须像游戏里的话（有情境、有梗、贴合刚玩完的那一轮），不许出现问卷腔（"请对以下方面打分"之类）。后续版本换题时同此口径。

**填写方式总原则（2026-10-21 用户定版）：选项为主，少打字。** 能做成选项的全部做成选项；唯一的文字框遵守：

**留资表单（T2，邮箱模式，4 必填 + 1 选填）**
1. **邮箱（必填）**——完整报告发到这里（MBTI 式交付：先摘要、填邮箱、拿报告）
2. 你主要做什么类目？（单选：美妆/家居/3C数码/服饰/食品/其他）
3. 粉丝量大概多少？（单选：还没开始/1千以下/1千~1万/1万~10万/10万+）
4. 主平台（单选：抖音/TikTok/快手/小红书/B站）
5. 微信号（**选填**，文案："想聊真实合作，可以再留个微信"）
+ 必勾：「同意接收出海合作与选品信息」

> 无效字段不要收：姓名、性别、年龄、公司名——填了也不会改变跟进动作，只会拉低提交率。**有效字段的判断标准只有一个：它能不能决定"先联系谁、给他什么"。** 类目决定推什么货，粉丝量段决定给什么权益，评估分决定谁优先——这些才收。

## 4. 数据库表设计（PostgreSQL，可直接建表）

设计要点：**先匿名、后留资合并**（anon_id 贯穿全程，留资后同表挂接，不丢历史行为）；**战报每轮一行**（筛选达人靠它）；**发奖有记录**（防刷）。

```sql
-- ① 用户主表：打开游戏即建（匿名）
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id       TEXT UNIQUE NOT NULL,          -- 前端生成、存 localStorage，与存档绑定
  run_seed      BIGINT,                        -- 游戏存档种子，用于对局复现/核对
  source        TEXT,                          -- 来源渠道/UTM，如 douyin 群、朋友圈卡片
  game_version  TEXT,                          -- 如 v2
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ② 留资表：一人可多条（改号/补填），以最新一条为有效
CREATE TABLE leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  contact_type  TEXT NOT NULL CHECK (contact_type IN ('email','wechat','phone')),  -- 报告领取主通道=email
  contact_value TEXT NOT NULL,                 -- 加密存储；后台展示脱敏
  category      TEXT,                          -- 主营类目（决定推什么货）
  follower_tier TEXT,                          -- 粉丝量段（决定给什么权益）
  platform      TEXT,                          -- 主平台
  touchpoint    TEXT NOT NULL,                 -- 来自哪个触点：report / season_report / list
  consent_at    TIMESTAMPTZ NOT NULL,          -- 勾选同意的时间（合规留痕）
  status        TEXT NOT NULL DEFAULT 'new',   -- new/contacted/cooperating/invalid
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_user ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status, created_at DESC);

-- ③ 反馈表
CREATE TABLE feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  rounds_played INT  NOT NULL,                 -- 提交时已完成轮次（反馈可信度权重）
  player_segment TEXT,                         -- 身份分流（veteran/domestic/newbie/casual）
  intent_shift   TEXT,                         -- 意愿转化（stronger/awakened/unchanged/deterred）
  insight_moment TEXT,                         -- 顿悟时刻（tax/returns/ads/cashflow）
  free_text     TEXT CHECK (free_text IS NULL OR char_length(free_text) >= 15),  -- 选填，但填则≥15字（质量门槛）
  app_version   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_user ON feedback(user_id);

-- ④ 每轮战报：行为数据核心，达人筛选靠这张表
CREATE TABLE round_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  round_no       INT  NOT NULL,
  market_id      TEXT, product_id TEXT, category TEXT,
  price          NUMERIC, quantity INT,
  channel        TEXT,                          -- content/ads/creator
  promotion      TEXT,                          -- 二级决策：如 vertical/scene/review
  listing_score  INT,
  fulfillment    TEXT,
  orders INT, refunds INT, kept_orders INT,
  profit NUMERIC, goal_met BOOLEAN,
  rating_after NUMERIC, bad_reviews INT,
  completed BOOLEAN NOT NULL DEFAULT true,  -- 未打完退出的进度快照=false
  exit_stage TEXT,                           -- 退出时所在环节（L0 漏斗）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, round_no)
);
CREATE INDEX idx_reports_user ON round_reports(user_id);

-- ④b 答题记录：总部来电每答一题一行（正确率/错误率与教学缺口分析靠它）
CREATE TABLE quiz_answers (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id),
  task_id    TEXT NOT NULL,        -- 题目 id（来电任务/差评任务/共建题）
  task_type  TEXT NOT NULL,        -- hq / review / cobuilder
  round_no   INT,
  choice_id  TEXT NOT NULL,        -- 选了哪个选项
  is_correct BOOLEAN,              -- 共建题无对错时为 NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_user ON quiz_answers(user_id);
CREATE INDEX idx_quiz_task ON quiz_answers(task_id);  -- 按题统计全站正确率：哪道题大家都错 = 教学缺口
-- assessments.knowledge_score 的原料即本表聚合（每用户 正确数/总数）；每轮赚亏看 round_reports.profit 正负

-- ⑤ 评估快照：生成评估报告时存一份（留资跟进按分排序靠它）
CREATE TABLE assessments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  total_score NUMERIC, profit_score NUMERIC,
  stability_score NUMERIC, breadth_score NUMERIC, knowledge_score NUMERIC,
  level_title TEXT,                             -- 如「区域卖家之星」
  rounds_played INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assess_user ON assessments(user_id, created_at DESC);

-- ⑥ 行为埋点：只记关键漏斗节点，不记流水账
CREATE TABLE events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id),
  event_name TEXT NOT NULL,  -- game_start/stage_reach/round_exit/round_complete/report_view/lead_click/lead_submit/feedback_submit
  payload    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_user ON events(user_id, created_at);

-- ⑦ 发奖记录：防刷（一人一类奖只发一次）
CREATE TABLE reward_claims (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  reward_type TEXT NOT NULL,   -- feedback_points / cobuilder_badge
  ref_id      TEXT,            -- 关联的 feedback id 等
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_type)
);
```

## 5. 技术落地要点

- **接口最小集**：`POST /api/users/sync`（建匿名用户/更新 last_seen）、`POST /api/reports`（每轮结算上报）、`POST /api/quiz`（每次答题上报）、`POST /api/feedback`、`POST /api/leads`、`POST /api/assessments`。静态站 + 一个轻后端（或 Supabase 一类 BaaS）即可，不动游戏架构。
- **失败兜底**：所有上报先写本地队列，失败重试，**绝不因上报失败卡住结算流程**。
- **防刷**：反馈奖励靠 `reward_claims` 唯一约束 + 提交时 `rounds_played ≥ 1` 校验；留资不发奖，天然无刷奖动机。
- **隐私合规**：联系方式加密存储、后台脱敏显示；留资表单明示用途并留 `consent_at`；提供删除通道（用户要求删数据时按 anon_id/联系方式删除全链路记录）。
- **后台最小视图**：三张清单够用——留资名单（按 assessments 分数倒序）、反馈汇总（按 player_segment × intent_shift 交叉 + insight_moment 分布）、战绩概览（见第 9 节）。

## 6. 有效字段清单（收 / 不收）

| 收（每个都能驱动动作） | 不收（填了也不改变动作） |
|---|---|
| 邮箱（报告交付通道）+ 微信（选填，深聊用） | 姓名 |
| 主营类目 → 决定推什么货 | 性别 / 年龄 |
| 粉丝量段 → 决定给什么权益 | 公司名 |
| 主平台 → 决定在哪找他 | 详细地址 |
| 评估四维分（系统算）→ 决定先联系谁 | 自我介绍长文本 |
| 每轮战报（系统记）→ 决定他擅长什么 | — |

## 7. 战绩的两种用法（2026-10-21 用户明确目的后补）

收战绩不是存着好看的，它有两个出口：

**出口一：我们看（运营迭代）** —— 后台聚合视图，回答"大家玩得怎么样、游戏哪里有问题"：
- 每轮平均利润 / 达标率（按轮次看难度曲线是否合理）
- 渠道与二级决策的选择分布（哪个选项没人选 = 假选择预警）
- 商品/市场热度分布（哪些国家没人去 = 内容缺口）
- 与 round_reports 对照：哪个环节大家的钱亏得最多 vs 玩家自认的顿悟点，互相印证教学有没有对准真坑

**出口二：玩家看 —— 本版不做（2026-10-21 定版）。** 原设想"真实大家榜/真实百分位"取消：v1 不做登录账号、点开即玩，没有身份就没有真榜；战绩只进后台。玩家侧现有的模拟同行对比保持原样（它只是氛围文案，不冒充真实数据即可）。真实榜留待未来有账号体系或同步局赛季时再议——后台数据先攒着，到时不缺原料。

**共建者反馈的闭环**：反馈不能收完就完事——每次版本更新时，在成就馆公示"本期采纳了 X 条共建者建议"并标注提出者徽章编号。共建者徽章因此有持续荣誉感，下一轮反馈率才不会衰减。

## 8. 落地顺序建议

1. 先建 `users` + `round_reports` + `quiz_answers` + `assessments`（战绩与答题先行，喂后台聚合）
2. 再接 T2 留资（北极星链路）+ `leads`
3. 最后 T1 反馈全套（`feedback` + `reward_claims` + 共建者徽章进成就馆）
4. `events` 随各触点顺带埋，不单独排期