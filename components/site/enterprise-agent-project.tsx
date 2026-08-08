"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import BlurHighlight from "@/components/react-bits/blur-highlight";
import { Button } from "@/components/ui/button";

const phases = [
  { no: "01", title: "业务诊断", role: "把模糊的“做一个 AI 助手”收敛成可验收的经营任务。", actions: ["访谈总分行客户经理与业务专家", "拆解用户、场景、任务、对象与字段", "定义 Agent、Workflow 与人工边界"], outputs: ["业务场景地图", "字段与权限矩阵", "需求优先级", "成功指标基线"] },
  { no: "02", title: "数据底座", role: "区分实时结构化事实与非结构化知识，建立可信数据边界。", actions: ["盘点客户、账户、资金、项目与协议数据", "定义制度、手册、案例与纪要的知识结构", "制定版本、权限与客户归属规则"], outputs: ["数据对象模型", "来源与时效口径", "知识分类体系", "元数据规范"] },
  { no: "03", title: "Agent 建设", role: "把业务语言翻译成意图、实体、工具、Skill 与可控流程。", actions: ["设计 Router、缺参追问与复合任务拆解", "梳理约 14 个工具及输入输出 Schema", "固化高风险 Workflow 和人工确认节点"], outputs: ["Agent Workflow", "工具 Schema", "Prompt 体系", "异常与降级策略"] },
  { no: "04", title: "评测验收", role: "用固定样本回答“版本是否真的变好”，并形成上线闸门。", actions: ["建设 200 条真实脱敏固定样本", "定义八维评分与金融红线项", "组织产品、业务、算法与研发联合归因"], outputs: ["Golden Set", "Trace 归因表", "回归看板", "UAT 准入标准"] },
  { no: "05", title: "分行推广", role: "把可运行 Demo 变成业务人员敢用、愿用、持续使用的工具。", actions: ["推动试点分行 UAT、培训与反馈收集", "跟踪采纳率、修改率、时延与风险事件", "把线上失败样本永久回流评测集"], outputs: ["操作与审核 SOP", "分行 UAT 报告", "经营效果复盘", "迭代 Roadmap"] },
];

const failureLayers = ["意图", "实体", "知识", "检索", "排序", "权限", "工具", "参数", "生成", "输出"];

export default function EnterpriseAgentProject() {
  const [activePhase, setActivePhase] = useState(0);
  const [fixed, setFixed] = useState(false);
  const phase = phases[activePhase];

  return (
    <div className="enterprise-project" id="project-overview">
      <section className="enterprise-intro">
        <div className="page-shell enterprise-heading">
          <span className="case-index">PROJECT BLUEPRINT / 招商银行项目全景</span>
          <h2>不是一个聊天窗口，<br />是一套可信经营系统。</h2>
          <BlurHighlight className="enterprise-heading-copy" highlightedBits={["同一条交付链路"]} highlightColor="#caff52" blurAmount={6}>把原始项目图中的业务建模、数据与知识、Agent 编排、工具权限、评测回归和分行推广组织在同一条交付链路里。</BlurHighlight>
        </div>
        <div className="page-shell enterprise-proof-row">
          <div><strong>14</strong><span>个行内工具链</span></div>
          <div><strong>200</strong><span>条固定真实场景样本</span></div>
          <div><strong>71% → 89%</strong><span>任务级工具调用准确率</span></div>
          <div><strong>≈ 70%</strong><span>AI 内容分行采纳率</span></div>
          <div><strong>2 周 → 3 天</strong><span>单次迭代验证周期</span></div>
        </div>
      </section>

      <section className="enterprise-phase-section">
        <div className="page-shell enterprise-section-head"><span>01 / DELIVERY MAP</span><h2>五个阶段，AI 产品经理分别做什么</h2><div><p>点击阶段查看我的关键动作、交付物与验收证据。</p><Link className="enterprise-module-link" href="/projects/enterprise-agent/business-model/">进入业务诊断二级页 <ArrowUpRight /></Link></div></div>
        <div className="page-shell enterprise-phase-tabs" role="tablist" aria-label="项目阶段">
          {phases.map((item, index) => <Button key={item.no} role="tab" aria-selected={activePhase === index} className={activePhase === index ? "is-active" : ""} onClick={() => setActivePhase(index)}><span>{item.no}</span><strong>{item.title}</strong></Button>)}
        </div>
        <div className="page-shell enterprise-phase-detail">
          <div className="enterprise-phase-purpose"><span>阶段责任</span><h3>{phase.role}</h3><p>AI PM 的工作不是跟进进度，而是把每个阶段变成有边界、有标准、有证据的产品决策。</p></div>
          <div><span>关键动作</span>{phase.actions.map(item => <p key={item}><ArrowRight />{item}</p>)}</div>
          <div><span>交付与验收证据</span>{phase.outputs.map(item => <p key={item}><CheckCircle2 />{item}</p>)}</div>
        </div>
      </section>

      <section className="enterprise-data-section">
        <div className="page-shell enterprise-section-head enterprise-on-dark"><span>02 / DATA & KNOWLEDGE</span><h2>结构化事实与非结构化知识，双路融合。</h2><div><p>实时业务状态不能复制进知识库当作事实源；制度与纪要也不能交给普通接口按字段查询。</p><Link className="enterprise-module-link" href="/projects/enterprise-agent/data-knowledge/">进入数据与知识二级页 <ArrowUpRight /></Link></div></div>
        <div className="page-shell enterprise-data-grid">
          <article><span>STRUCTURED DATA</span><h3>回答“现在是什么状态”</h3><dl><dt>内容</dt><dd>客户、账户、资金、项目、协议、任务状态</dd><dt>查询</dt><dd>按 customer_id、日期和状态精确查询</dd><dt>来源</dt><dd>业务系统是 Source of Truth</dd><dt>调用</dt><dd>API / SQL / Business Tool</dd></dl></article>
          <article><span>KNOWLEDGE / RAG</span><h3>回答“规则是什么、该怎么做”</h3><dl><dt>内容</dt><dd>制度、产品手册、案例、拜访纪要、FAQ</dd><dt>查询</dt><dd>关键词 + 向量召回 + Rerank</dd><dt>来源</dt><dd>最新有效、当前客户、授权范围内的文档</dd><dt>调用</dt><dd>RAG Retrieval Tool</dd></dl></article>
        </div>
        <div className="page-shell enterprise-pipeline">{["身份 / 页面上下文", "意图与实体", "权限前置", "Tool / RAG", "结果校验", "模板生成", "人工确认"].map((item,index)=><div key={item}><span>0{index+1}</span><strong>{item}</strong></div>)}</div>
      </section>

      <section className="enterprise-capability-section">
        <div className="page-shell enterprise-section-head"><span>03 / AGENT ORCHESTRATION</span><h2>Agent 决定调用谁，Workflow 保证怎么做。</h2><div><p>开放判断交给 Agent，强依赖和高风险步骤固化为 Workflow；Tool 是动作，Skill 是可复用业务能力。</p><Link className="enterprise-module-link" href="/projects/enterprise-agent/agent-orchestration/">进入 Agent 编排二级页 <ArrowUpRight /></Link></div></div>
        <div className="page-shell enterprise-layer-grid">
          {[['AGENT','理解目标与选择能力','意图识别、任务拆解、开放性规划'],['WORKFLOW','固化可控业务路径','前置校验、串并行、人工确认'],['SKILL','复用业务能力','资金趋势、经营机会、拜访材料'],['TOOL','执行单一系统动作','查客户、资金、项目、制度、纪要']].map(([label,title,body])=><article key={label}><span>{label}</span><h3>{title}</h3><p>{body}</p></article>)}
        </div>
        <div className="page-shell enterprise-gateway"><span>模型 Function Call</span><ArrowRight/><span>工具网关</span><ArrowRight/><span>Schema / 参数 / 权限 / 幂等</span><ArrowRight/><span>行内系统</span><ArrowRight/><span>结果与审计</span></div>
      </section>

      <section className="enterprise-evaluation-section" id="evaluation-system">
        <div className="page-shell enterprise-section-head enterprise-on-dark"><span>04 / EVALUATION SYSTEM</span><h2>评测不是算法附属，是产品上线标准。</h2><div><p>固定题库负责出题，执行结果表记录模型表现，Bad Case 表负责归因、负责人、修复方案和回归结果。</p><Link className="enterprise-module-link" href="/projects/enterprise-agent/evaluation-regression/">进入评测回归二级页 <ArrowUpRight /></Link></div></div>
        <div className="page-shell enterprise-samples"><div><strong>70</strong><span>正常高频场景</span></div><div><strong>60</strong><span>复杂 / 多意图</span></div><div><strong>40</strong><span>异常与越权</span></div><div><strong>30</strong><span>历史 Bad Case</span></div></div>
        <div className="page-shell enterprise-dimensions">{["任务完成","工具选择","参数准确","执行链路","数据溯源","权限合规","异常处理","输出格式"].map((item,index)=><div key={item}><span>0{index+1}</span><strong>{item}</strong></div>)}</div>
        <Link className="page-shell enterprise-demo-link" href="/projects/enterprise-agent/evaluation-regression/"><div><span>SUBPROJECT 01 / INTERACTIVE EVALUATION LAB</span><h3>打开“RAG 评测与归因”模块详情</h3><p>先阅读评测体系、样本设计与 AI PM 职责，再进入完整 Trace 实验页。</p></div><ArrowUpRight /></Link>
      </section>

      <section className="enterprise-case-section">
        <div className="page-shell enterprise-section-head"><span>05 / END-TO-END BAD CASE</span><h2>南京大学基金会拜访 Brief</h2><div><p>看似是模型漏答，真正根因却在版本过滤和 Chunk 策略。</p><Link className="enterprise-module-link" href="/projects/enterprise-agent/bad-case/">进入 Bad Case 二级页 <ArrowUpRight /></Link></div></div>
        <div className="page-shell enterprise-query"><span>客户经理 Query</span><strong>“帮我准备明天拜访南京大学基金会项目的 Brief，重点说明开户材料和上次沟通的待办。”</strong></div>
        <div className="page-shell enterprise-case-toggle"><Button className={!fixed ? "is-active" : ""} onClick={() => setFixed(false)}>修复前 · Bad Case</Button><Button className={fixed ? "is-active" : ""} onClick={() => setFixed(true)}>修复后 · Regression Pass</Button></div>
        <div className={`page-shell enterprise-trace ${fixed ? "is-fixed" : "is-bad"}`}>
          <article><span>01</span><h3>意图与权限</h3><p>复合任务拆为项目进度、开户制度和最近纪要；南京大学映射标准 customer_id，权限前置校验。</p><strong>正确</strong></article>
          <article><span>02</span><h3>双路数据获取</h3><p>实时状态走业务接口；制度和纪要按业务域、客户、时间与权限走 RAG。</p><strong>正确</strong></article>
          <article><span>03</span><h3>{fixed ? "版本过滤 + 父子 Chunk" : "旧制度排在新版前"}</h3><p>{fixed ? "检索前过滤失效版本；材料清单整体保留；子 Chunk 命中后返回完整父级上下文。" : "新旧版本都被召回，但旧版关键词更强；材料清单切得过碎，部分授权材料未进入 Top K。"}</p><strong>{fixed ? "已修复" : "根因"}</strong></article>
          <article><span>04</span><h3>{fixed ? "全量回归后进入 UAT" : "答案合理，但业务结果错误"}</h3><p>{fixed ? "原样本永久加入固定评测集；业务再验收内容长度、重点顺序与行动项是否可用。" : "模型依据不完整证据生成，漏掉一项授权材料。问题不是不会表达，而是输入证据错误。"}</p><strong>{fixed ? "PASS" : "BLOCKED"}</strong></article>
        </div>
        <div className="page-shell enterprise-failure-map"><span>十层 Trace 归因</span>{failureLayers.map((item,index)=><strong key={item}>{index+1}. {item}</strong>)}</div>
      </section>

      <section className="enterprise-ownership-section">
        <div className="page-shell enterprise-section-head"><span>06 / PRODUCT OWNERSHIP</span><h2>我负责定义标准，也负责让标准落地。</h2><div><p>不替算法拍参数、不替业务确认事实、不绕过合规；把跨团队协作变成可验收的交付链路。</p><Link className="enterprise-module-link" href="/projects/enterprise-agent/ai-pm-ownership/">进入 AI PM 职责二级页 <ArrowUpRight /></Link></div></div>
        <div className="page-shell enterprise-ownership-grid">
          <article><span>我直接负责</span><p>问题定义 · 需求范围 · 业务建模 · 数据边界 · 产品方案 · 工具映射 · 评测标准 · UAT · 上线门槛</p></article>
          <article><span>我推动协同</span><p>算法策略 · 接口实现 · 知识加工 · 权限接入 · 前端交互 · 测试回归 · 分行运营</p></article>
          <article><span>我不替代</span><p>算法参数决策 · 业务事实确认 · 合规审批 · 客户承诺 · 资金决策 · 高风险动作最终授权</p></article>
        </div>
      </section>
    </div>
  );
}
