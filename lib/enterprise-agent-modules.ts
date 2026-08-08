export type EnterpriseModule = {
  slug: string;
  index: string;
  eyebrow: string;
  title: string;
  thesis: string;
  problem: string;
  pmRole: string;
  decisions: { title: string; body: string }[];
  deliverables: string[];
  evidence: string[];
  flow: string[];
  related: string[];
  externalLab?: boolean;
};

export const enterpriseModules: EnterpriseModule[] = [
  {
    slug: "business-model",
    index: "01",
    eyebrow: "BUSINESS DIAGNOSIS / 业务诊断",
    title: "先把经营问题建模，再决定 AI 做什么。",
    thesis: "从高校、基金会、机构客户、项目、协议和资金六类对象出发，把“做助手”收敛为可验收任务。",
    problem: "客户经理的信息分散在客户、项目、协议、资金与沟通记录中。真正的瓶颈不是没有数据，而是缺少围绕经营任务组织数据、知识和动作的统一模型。",
    pmRole: "访谈总分行客户经理与业务专家，定义用户、场景、任务、对象、字段和成功标准；把查、看、写、审四类能力排出优先级，并明确必须人工确认的高风险动作。",
    decisions: [
      { title: "以任务而不是页面为单位", body: "把月报、拜访 Brief、经营机会和审核作为端到端任务，避免把旧系统菜单机械搬进对话框。" },
      { title: "先定义对象关系", body: "统一高校、基金会、机构客户、项目、协议、账户和资金之间的主键与归属关系。" },
      { title: "验收口径前置", body: "需求阶段同步定义正确性、可溯源、权限合规、人工修改率和业务采纳率。" },
    ],
    deliverables: ["业务场景地图", "用户任务优先级", "业务对象关系图", "字段与权限矩阵", "成功指标基线", "人机协作边界"],
    evidence: ["高频经营任务被收敛为查、看、写、审四类能力", "月报、拜访 Brief、机会推送形成首批可验证场景", "客户承诺、资金决策、协议动作保留人工确认"],
    flow: ["业务访谈", "任务拆解", "对象建模", "字段口径", "风险分级", "验收定义"],
    related: ["data-knowledge", "agent-orchestration"],
  },
  {
    slug: "data-knowledge",
    index: "02",
    eyebrow: "DATA & KNOWLEDGE / 数据与知识",
    title: "实时事实走工具，制度经验走 RAG。",
    thesis: "结构化数据回答“现在是什么状态”，非结构化知识回答“规则是什么、该怎么做”。",
    problem: "把实时业务数据复制进知识库会产生时效与口径风险；只依靠业务接口又无法理解制度、产品手册、案例和拜访纪要。两类信息必须分路获取、统一校验。",
    pmRole: "盘点数据源与知识源，定义 Source of Truth、更新时间、客户归属、文档版本、权限标签和引用格式；推动知识加工从“上传文件”升级为可治理的内容工程。",
    decisions: [
      { title: "结构化事实不进向量库", body: "客户、账户、资金、项目、协议和任务状态按 customer_id、日期与状态走 API 或业务 Tool。" },
      { title: "知识检索先过滤再召回", body: "按业务域、客户、有效期与权限过滤，再做关键词、向量召回和 Rerank。" },
      { title: "父子 Chunk 保留完整语义", body: "子 Chunk 用于精准命中，返回时携带完整父级制度条款或纪要上下文。" },
    ],
    deliverables: ["数据对象模型", "数据源与时效口径", "知识分类体系", "文档元数据规范", "Chunk 策略", "引用与版本规则"],
    evidence: ["实时经营状态以业务系统为唯一事实源", "旧版制度可在检索前被有效期规则过滤", "答案可回溯到具体接口结果或知识片段"],
    flow: ["身份上下文", "实体标准化", "权限前置", "Tool / RAG", "结果校验", "引用拼装"],
    related: ["business-model", "evaluation-regression"],
  },
  {
    slug: "agent-orchestration",
    index: "03",
    eyebrow: "AGENT ORCHESTRATION / 智能体编排",
    title: "Agent 负责判断，Workflow 负责稳定。",
    thesis: "开放理解交给 Agent，强依赖和高风险步骤固化为 Workflow，业务能力沉淀为 Skill，系统动作封装成 Tool。",
    problem: "经营任务通常同时包含意图识别、实体补全、多系统查询、知识检索、权限校验、模板生成和人工确认。单轮 Prompt 无法稳定承担整条链路。",
    pmRole: "把业务语言翻译成意图、实体、工具描述和输入输出 Schema；设计 Router、缺参追问、复合任务拆解、异常降级与人工确认节点，并联合研发梳理约 14 个行内工具。",
    decisions: [
      { title: "工具描述使用业务语言", body: "围绕客户、项目、资金、协议和沟通记录组织能力，不把底层接口名直接暴露给模型。" },
      { title: "高风险动作必须有闸门", body: "查询和草稿可自动完成，客户承诺、资金与协议动作必须二次确认并留下审计记录。" },
      { title: "复合任务显式拆解", body: "拜访 Brief 拆为项目进度、开户制度、历史纪要与待办四条子链路，再统一生成。" },
    ],
    deliverables: ["Agent Router", "Workflow 编排图", "Skill 能力清单", "约 14 个 Tool Schema", "Prompt 体系", "异常与降级策略"],
    evidence: ["工具选择与参数准确率由 71% 提升至 89%", "关键调用具备权限校验、幂等与审计信息", "复杂任务可以定位到具体步骤而非只看最终答案"],
    flow: ["识别意图", "补全实体", "选择 Skill", "调用 Tool", "校验结果", "人工确认"],
    related: ["data-knowledge", "evaluation-regression"],
  },
  {
    slug: "evaluation-regression",
    index: "04",
    eyebrow: "EVALUATION & REGRESSION / 评测回归",
    title: "评测不是算法附属，而是上线标准。",
    thesis: "固定题库负责出题，执行结果记录模型表现，Bad Case 表负责归因、修复、负责人和回归结果。",
    problem: "只看几个演示问题无法判断版本是否真的变好。Prompt、工具描述、知识切分或模型升级，都可能让旧场景悄悄退化。",
    pmRole: "建设 200 条脱敏真实样本，定义任务完成、工具选择、参数准确、执行链路、数据溯源、权限合规、异常处理和输出格式八维评分，并组织产品、业务、算法和研发联合归因。",
    decisions: [
      { title: "题库固定，版本可比较", body: "70 条正常高频、60 条复杂多意图、40 条异常越权、30 条历史 Bad Case 构成 Golden Set。" },
      { title: "金融红线单独判定", body: "权限越界、错误客户、关键金额错误和无依据生成不允许被平均分掩盖。" },
      { title: "失败样本永久回流", body: "线上与 UAT 出现的失败样本完成修复后仍保留在固定集，防止同类问题复发。" },
    ],
    deliverables: ["200 条 Golden Set", "八维评分标准", "Trace 执行结果表", "Bad Case 归因表", "回归看板", "UAT 准入门槛"],
    evidence: ["单次迭代验证周期从约 2 周缩短至 3 天", "每次 Prompt、Tool 或知识策略变更均可全量回归", "问题可以落到责任层与修复动作"],
    flow: ["固定样本", "批量执行", "八维评分", "Trace 归因", "修复复测", "UAT 放行"],
    related: ["agent-orchestration", "bad-case"],
    externalLab: true,
  },
  {
    slug: "bad-case",
    index: "05",
    eyebrow: "END-TO-END BAD CASE / 端到端归因",
    title: "答案看起来合理，也可能业务结果错误。",
    thesis: "南京大学基金会拜访 Brief 的漏答，根因不在表达，而在旧制度误召回与 Chunk 过碎。",
    problem: "客户经理要求同时获取项目进度、开户材料和上次沟通待办。旧版制度因关键词更强排在新版前，材料清单被切碎后又有一项没有进入 Top K。",
    pmRole: "把一次“回答不好”拆成意图、实体、知识、检索、排序、权限、工具、参数、生成和输出十层 Trace；协调知识与检索策略修复，并把原样本永久加入回归集。",
    decisions: [
      { title: "先证据后生成", body: "生成模型只能依据通过版本与权限校验的证据作答，证据不完整时必须明确提示。" },
      { title: "版本过滤前置", body: "失效制度在召回前剔除，避免旧版因关键词密度获得更高排序。" },
      { title: "父子 Chunk 返回完整清单", body: "子片段命中后返回父级完整条款，保证开户材料和前后条件不被截断。" },
    ],
    deliverables: ["南京大学案例 Trace", "十层归因结论", "版本过滤规则", "父子 Chunk 方案", "回归样本", "业务 UAT 记录"],
    evidence: ["旧制度不再进入候选集", "开户材料完整覆盖且附带依据", "项目进度、制度与纪要三路结果统一进入 Brief"],
    flow: ["复合 Query", "实体与权限", "双路获取", "版本过滤", "父子 Chunk", "回归通过"],
    related: ["data-knowledge", "evaluation-regression"],
    externalLab: true,
  },
  {
    slug: "ai-pm-ownership",
    index: "06",
    eyebrow: "PRODUCT OWNERSHIP / AI 产品经理职责",
    title: "定义标准，也让标准真正落地。",
    thesis: "AI 产品经理不是替所有人做决定，而是把跨团队协作变成有边界、有负责人、有证据的交付链路。",
    problem: "企业级 AI 同时涉及业务、数据、知识、算法、研发、测试、合规与分行运营。如果职责不清，失败会被笼统归因给“模型不行”。",
    pmRole: "直接负责问题定义、需求范围、业务建模、数据边界、产品方案、工具映射、评测标准、UAT 和上线门槛；推动算法、接口、知识、权限、前端、测试和运营协同。",
    decisions: [
      { title: "产品负责可验收定义", body: "每个需求都要明确输入、输出、边界、失败状态、负责人和证据。" },
      { title: "不替代专业责任", body: "不替算法拍参数、不替业务确认事实、不绕过合规审批、不代替高风险动作授权。" },
      { title: "上线后继续经营", body: "持续跟踪采纳率、人工修改率、响应时延、拒答合理性和风险事件。" },
    ],
    deliverables: ["项目 Roadmap", "需求与优先级", "跨团队 RACI", "验收与上线门槛", "分行 UAT 报告", "迭代复盘"],
    evidence: ["AI 内容分行采纳率由不足 50% 提升至约 70%", "验证周期由约 2 周缩短至 3 天", "南京高校项目资金引流 6.5 亿元、北京高校定存中标 7000 万元"],
    flow: ["定义问题", "建立边界", "组织协同", "验证质量", "推动上线", "经营迭代"],
    related: ["business-model", "evaluation-regression"],
  },
];

export function getEnterpriseModule(slug: string) {
  return enterpriseModules.find((item) => item.slug === slug);
}
