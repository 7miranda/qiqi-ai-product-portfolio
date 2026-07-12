export type Project = {
  slug: string;
  index: string;
  floor: string;
  title: string;
  category: string;
  timeframe: string;
  role: string;
  summary: string;
  thesis: string;
  metric: string;
  metricLabel: string;
  metricUnit: string;
  metricExplanation: string;
  shortProof: string;
  accent: string;
  facts: string[];
  problem: string;
  approach: Array<{ title: string; body: string }>;
  decisions: Array<{ title: string; body: string }>;
  outcomes: string[];
  reflection: string[];
  next: string;
};

export const projects: Project[] = [
  {
    slug: "bingo-coze",
    index: "01",
    floor: "5",
    title: "AIGC 内容生产中枢",
    category: "AIGC 工作流 / 商业化",
    timeframe: "2024.06 — 2025.06",
    role: "AI 应用产品负责人 · 联合创始人",
    summary: "将内容生产从依赖个体的手艺，重构为可标准化、可度量、可复制的工业级工作流系统。",
    thesis: "交付物不再是知识，而是用户能稳定拿到的结果。",
    metric: "3 → 20",
    metricLabel: "学员稳定日产",
    metricUnit: "条 / 日",
    metricExplanation: "从接到选题到输出成片，零基础学员稳定日产由 3 条提升到 20 条",
    shortProof: "日产提升至 20 条",
    accent: "#caff52",
    facts: ["66 条工作流", "4 个内容赛道", "2000+ 设计资产", "内容团队缩减 4 人"],
    problem: "课程教会了用户使用 ChatGPT、Midjourney 和剪映，却没有覆盖选题、脚本、视觉、发布、复盘与成交组成的完整任务链。真正的问题不是工具不会用，而是多个工具无法被组织成一条可运转的生产线。",
    approach: [
      { title: "工作流引擎", body: "为四个内容赛道定义输入、节点、数据传递、异常处理与人工检查点，形成 66 条可复用工作流。" },
      { title: "双层知识库", body: "结构化标签库先完成场景定位，RAG 内容库再完成语义召回，解决单层向量检索的召回漂移。" },
      { title: "结构化输入", body: "将平台、人群、卖点、转化目标、账号阶段和禁用表达设为明确变量，降低生成质量方差。" },
      { title: "五维评分门禁", body: "以钩子力、信息密度、口语流畅度、转化引导与合规安全决定内容是否进入发布环节。" },
    ],
    decisions: [
      { title: "结构化输入替代自由文本", body: "稳定性提升幅度超过同期所有 Prompt 优化，让模型在明确业务坐标中生成。" },
      { title: "双层知识库替代单层 RAG", body: "先定位、后召回的串行链路显著减少跨赛道知识污染。" },
      { title: "量化评分替代主观判断", body: "团队对可发布内容的判断一致性由约 60% 提升至 90% 以上。" },
    ],
    outcomes: ["优质案例入库率 +40%", "重复咨询量 −70%", "运营团队规模 −4 人", "新赛道上线周期从 3 周缩短至 1 周"],
    reflection: ["结构化输入应该从 V1 开始", "合规过滤应与知识库同步建设", "工作流模板需要明确的生命周期管理"],
    next: "基于用户阶段、历史内容特征与转化数据，让工作流主动匹配用户，而不是继续让用户选择模板。",
  },
  {
    slug: "persona-agent",
    index: "02",
    floor: "4",
    title: "狠人思维模型 · 人格化商业智能体",
    category: "Persona Agent / Post-Training",
    timeframe: "2025.01 — 至今",
    role: "AI 应用产品负责人 · 独立负责",
    summary: "以人格一致性建立用户信任，再把持续对话转化为可验证的商业闭环。",
    thesis: "Agent 的壁垒不在于会回答，而在于长期保持一致的人格与判断。",
    metric: "600万+",
    metricLabel: "单品销售额",
    metricUnit: "元",
    metricExplanation: "单品累计销售额；单日峰值 20 万元，单月峰值 100 万元+",
    shortProof: "单品累计销售 600 万+",
    accent: "#111310",
    facts: ["50 个智能体模块", "5 个成长阶段", "3 种媒介形态", "单日峰值 20 万"],
    problem: "内容供给与流量增长已经成立，但用户从“他说得对”到“我愿意付费”的信任链路仍然断裂。标准课程页和促销 SOP 无法承担人格化的持续信任建设。",
    approach: [
      { title: "领域知识注入", body: "把课程、案例、FAQ、转化话术和合规规则整理为可追溯的知识资产。" },
      { title: "监督式行为对齐", body: "针对拖延、内耗、职场、收入焦虑等真实场景构建标准问答与语气梯度。" },
      { title: "多维质量评判", body: "围绕人格一致性、情绪冲击、建议可执行性、转化自然度与合规安全持续评分。" },
      { title: "人类反馈闭环", body: "用追问、点击、购买、投诉与满意度反馈驱动 Prompt、知识库和意图规则迭代。" },
    ],
    decisions: [
      { title: "人格优先于功能", body: "放弃广泛但浅层的受众覆盖，换取高认同度带来的深度信任。" },
      { title: "五阶段体系替代单次问答", body: "把用户问题连接到递进成长路径，让内容承接由任务自然触发。" },
      { title: "三媒介形态降低消费阻力", body: "同一知识以文字、音频和视频并行交付，覆盖不同消费情境。" },
    ],
    outcomes: ["单月峰值 100 万+", "单日成交峰值 20 万", "人格漂移投诉率降至接近零", "知识场景扩展至 80+"],
    reflection: ["人格稳定性应由 Reward Model 而非 Prompt 单独承担", "内容生产与商业转化应作为一条统一旅程", "单一人设的受众天花板应更早验证"],
    next: "建立共享方法论底座、差异化人格皮肤的 Agent 矩阵，并验证跨 Agent 用户旅程的连贯性。",
  },
  {
    slug: "enterprise-agent",
    index: "03",
    floor: "3",
    title: "招商银行 · 校友基金会经营小助手",
    category: "Enterprise Agent / 人机协作",
    timeframe: "2025 — 至今",
    role: "AI 产品经理",
    summary: "把高校经营平台从记录系统升级为能理解数据、发现机会并推动动作的可信 Agent。",
    thesis: "B 端 Agent 的核心指标不是自动化率，而是用户是否敢把任务交给它。",
    metric: "71% → 89%",
    metricLabel: "业务工具调用成功率",
    metricUnit: "",
    metricExplanation: "接到指令后 Agent 选对工具的比例，从 71% 提升至 89%——提升来自工具描述从后端语言重构为业务语言",
    shortProof: "业务工具调用成功率达 89%",
    accent: "#b8d8ff",
    facts: ["14 个后端工具接口", "200 条真实评测样本", "3 档协作模式", "10+ 分行试点"],
    problem: "平台已经记录高校、基金会、项目、协议和资金，但客户经理仍需在多个模块间查找和拼接数据。一份经营月报两天起步，70% 的时间消耗在数据搬运和排版。",
    approach: [
      { title: "三档协作模式", body: "按容错率划分自动、确认与接管三档，把技术能力翻译成用户能理解的责任边界。" },
      { title: "业务心智工具层", body: "将 API 描述从后端语言改写为客户经理的任务语言，提升业务工具调用成功率。" },
      { title: "八维离线评测", body: "覆盖任务完成、工具选择、参数、决策链、溯源、合规、拒答与格式。" },
      { title: "200 条回归样本", body: "每次规则或 Prompt 变更前全量回归，20 分钟输出结果，把迭代周期从 2 周压缩到 3 天。" },
    ],
    decisions: [
      { title: "不追求全自动", body: "关键决策只准备证据，不替代员工承诺与判断。" },
      { title: "先建立信任再扩大权限", body: "用可见的证据、确认点与人工接管逐步增加 Agent 的任务范围。" },
      { title: "评测成为发布基础设施", body: "从线上等反馈，转向上线前可复现、可审计的质量门禁。" },
    ],
    outcomes: ["一线采纳率不足 50% → 约 70%", "南京高校项目资金引流 6.5 亿", "北京高校定存中标 7000 万", "员工信任度 NPS +12pct"],
    reflection: ["首版自动化范围过大，忽略了责任归属", "工具描述应从业务语言开始设计", "信任指标应与任务完成指标同步进入评测"],
    next: "从任务完成率继续升级到信任度评测：是否查看凭据、是否跳过确认、何时主动触发人工接管。",
  },
  {
    slug: "iot-platform",
    index: "04",
    floor: "2",
    title: "鸿泉物联网 · IoT 车联网多端系统",
    category: "IoT / 数据建模 / 风控",
    timeframe: "早期项目",
    role: "产品体验负责人",
    summary: "主导奔达机车三端系统、渣土监管平台与车队管理系统，从体验设计转向产品架构。",
    thesis: "没有结构化的数据，就没有后续的 AI 产品化。",
    metric: "−65%",
    metricLabel: "风险事件漏报率",
    metricUnit: "",
    metricExplanation: "通过动态风控规则与实时预警，风险事件漏报率下降 65%",
    shortProof: "漏报率下降 65%",
    accent: "#5c6159",
    facts: ["设备 / 告警 / 工单建模", "多端一致性体验", "动态风控规则引擎", "实时预警体系"],
    problem: "设备、车辆、工地、告警和维保信息分散在不同系统，运营人员无法获得一致的数据对象和风险判断。",
    approach: [
      { title: "业务对象建模", body: "统一设备、告警、工单、车辆与维保等实体定义和关联关系。" },
      { title: "多端体验架构", body: "让管理端、车载端与移动端围绕同一任务模型保持一致。" },
      { title: "动态风控规则", body: "围绕轨迹、违规事件与工地风险建立可配置实时预警。" },
      { title: "产品架构转型", body: "从设计执行进入需求定义、流程建模与跨团队交付。" },
    ],
    decisions: [
      { title: "先统一对象，再统一界面", body: "避免不同端对同一业务实体产生不同理解。" },
      { title: "规则引擎作为智能化基础", body: "先沉淀专家规则，再为后续 ML 升级提供训练与评估基础。" },
      { title: "风险信息进入任务流", body: "预警必须连接处置动作，而不是只停留在数据看板。" },
    ],
    outcomes: ["完成多条产品线 0–1 交付", "沉淀统一业务数据模型", "建立实时风险预警骨架", "方法复用于后续 Agent 工具设计"],
    reflection: ["数据定义应更早成为跨团队契约", "风控规则需要更完整的版本管理", "产品体验与数据架构不应分开推进"],
    next: "将规则系统积累的结构化对象、风险事件与处置结果用于更智能的预测和决策支持。",
  },
  {
    slug: "government-knowledge",
    index: "05",
    floor: "1",
    title: "益电工 · 电工服务与网校协同平台",
    category: "电工服务平台 / 订单协同 / 网校系统",
    timeframe: "早期项目",
    role: "高级产品体验主管",
    summary: "国家电网旗下电工服务平台，串联用户下单、电工接单、客服调度与同方向网课学习，建立服务交付与培训一体化的业务承接系统。",
    thesis: "服务平台的效率，不来自更多入口，而来自订单、服务交付与知识支持的闭环。",
    metric: "+28%",
    metricLabel: "商家月成单率",
    metricUnit: "",
    metricExplanation: "打通用户下单、客服调度、电工接单与网校协同后，商家月成单率提升 28%",
    shortProof: "月成单率提升 28%",
    accent: "#111310",
    facts: ["用户服务下单", "客服订单中台", "电工技术支持", "同方向网校系统"],
    problem: "用户在线下单后，客服需要分派和追踪订单，后台电工团队同时承担技术支持；培训内容又分散在独立课程中。订单、服务交付、技术知识和网课学习之间缺少统一承接，导致服务响应和人员成长都依赖人工协调。",
    approach: [
      { title: "用户服务下单", body: "从选服务、提交需求、预约到进度反馈，建立用户可理解的完整下单路径。" },
      { title: "客服订单中台", body: "统一订单分派、状态推进、异常升级与用户沟通，减少跨角色信息断点。" },
      { title: "电工技术支持", body: "将后台专家经验、高频故障和交付规则沉淀为可查询、可复用的技术知识。" },
      { title: "网校学习系统", body: "把同方向网课、学习进度与服务场景关联，让培训内容能够反哺实际服务交付。" },
    ],
    decisions: [
      { title: "流程先于页面", body: "先定义完整业务任务，再设计界面和信息结构。" },
      { title: "权限成为产品能力", body: "将复杂权限从后台配置转化为用户可理解的产品规则。" },
      { title: "经验转化为知识资产", body: "让交付质量不再依赖个别成员的隐性经验。" },
    ],
    outcomes: ["商家成单率提升 28%", "建立复杂政企项目交付规范", "沉淀知识服务数据地基", "形成带团队与管交付能力"],
    reflection: ["知识资产需要更早进入产品数据结构", "权限设计应与用户任务共同验证", "团队协作标准必须可视化、可检查"],
    next: "把结构化知识资产、权限模型与业务流程进一步转化为企业知识库和 RAG 产品能力。",
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
