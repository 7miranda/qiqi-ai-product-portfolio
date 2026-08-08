"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const states = {
  bad: {
    docs: [
      ["旧版开户材料清单", "已失效 · V2.1", "过期", "0.91", "开户材料包括法人登记证书、负责人身份证明、授权委托书等。", "制度库 / 历史版本"],
      ["基金会开户操作规程", "现行有效 · V3.0", "正确", "0.87", "现行制度新增受益所有人信息采集表；清单应完整引用。", "制度库 / 当前版本"],
      ["材料清单 · Chunk 03", "父文档 V3.0 · 3/5", "残缺", "0.81", "授权材料及其他证明文件。当前片段缺少前后条目。", "制度库 / 子 Chunk"],
    ],
    title: "Brief 漏答授权材料",
    copy: "模型依据 Top-1 旧制度生成，遗漏新版新增材料；答案看起来合理，但业务结果错误。",
    decision: "失败 · 禁止进入 UAT",
    metrics: [["Recall@3", "67%"], ["MRR", "0.50"], ["材料完整率", "75%"], ["任务判定", "失败"]],
  },
  fixed: {
    docs: [
      ["基金会开户操作规程", "现行有效 · V3.0", "正确", "0.97", "完整材料清单包含法人登记证书、负责人身份证明、授权委托书与受益所有人信息采集表。", "制度库 / 父子 Chunk"],
      ["南京大学最近拜访纪要", "customer_id 绑定", "正确", "0.94", "上次待办：补充授权委托书，确认账户用途，完成内部预审。", "客户纪要库 / 当前客户"],
      ["基金会优秀开户案例", "案例 · 仅参考", "参考", "0.72", "历史案例只提示沟通方式，不得作为当前客户事实。", "案例库 / 类型已标记"],
    ],
    title: "开户材料完整召回",
    copy: "现行制度进入 Top-1，完整清单由父 Chunk 补齐；纪要绑定当前客户，历史案例只作参考。",
    decision: "通过 · 进入业务 UAT",
    metrics: [["Recall@3", "100%"], ["MRR", "1.00"], ["材料完整率", "100%"], ["任务判定", "通过"]],
  },
};

const dimensions = [["任务完成", "是否正确生成拜访 Brief"], ["工具选择", "接口、RAG、纪要检索是否选对"], ["参数准确", "customer_id、时间范围与业务域"], ["执行链路", "拆解和执行顺序是否合理"], ["数据溯源", "数字是否标注源系统与时间"], ["权限合规", "权限与敏感数据是否越界"], ["异常处理", "缺参、无权、失败时是否处理"], ["输出格式", "是否符合 Brief / 月报模板"]];
const pitfalls = [["旧制度误召回", "生效 / 失效时间 + valid_status 强过滤"], ["相似客户串数据", "customer_id 绑定 + ACL 前置"], ["Chunk 过碎", "清单整体保留 + 父子 Chunk"], ["Query 改写跑偏", "实体歧义先追问，限制改写"], ["案例当当前事实", "context_type 标记 + 引用类型"], ["只看最终答案", "保留 Trace，先流程再检索"]];

export default function EnterpriseTraceLab() {
  const [fixed, setFixed] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(0);
  const state = fixed ? states.fixed : states.bad;
  const doc = state.docs[selectedDoc];

  function switchMode(next: boolean) {
    setFixed(next);
    setSelectedDoc(0);
  }

  return (
    <main className="secondary-page cmb-trace-lab">
      <section className="cmb-trace-hero"><div className="page-shell">
        <div className="cmb-trace-breadcrumb"><Link href="/projects/enterprise-agent/evaluation-regression/"><ArrowLeft /> 返回评测回归模块</Link><span>TRACE LAB / 招商银行项目内部页</span></div>
        <span className="cmb-trace-eyebrow">招商银行 · 高校 / 校友基金会经营场景</span>
        <h1>RAG 评测<br /><em>与 Bad Case 归因</em></h1>
        <p>从客户经理的一句话出发，拆解结构化接口、知识库召回、权限校验和材料生成，通过完整 Trace 定位问题，而不是一出错就改 Prompt。</p>
        <div className="cmb-trace-stats"><div><strong>14</strong><span>个行内工具链</span></div><div><strong>200</strong><span>条固定评测样本</span></div><div><strong>71% → 89%</strong><span>任务级工具准确率</span></div><div><strong>≈ 70%</strong><span>AI 内容采纳率</span></div></div>
      </div></section>

      <section className="cmb-trace-pipeline page-shell">{["身份与权限", "意图与实体", "任务拆解", "Tool / RAG", "结果汇总", "Brief 生成", "评测回归"].map((item, index) => <div key={item}><span>0{index + 1}</span><strong>{item}</strong></div>)}</section>

      <section className="cmb-trace-section page-shell"><header><span>01 / REAL SCENARIO</span><div><h2>一句话，触发三条数据链</h2><p>实时事实走业务接口，制度和纪要走知识库；二者不能混为一谈。</p></div></header><div className="cmb-trace-query"><small>客户经理 Query</small><strong>“帮我准备明天拜访南京大学基金会项目的 Brief，重点看开户材料、当前进度和上次沟通的待办。”</strong></div><div className="cmb-trace-lanes">{[["结构化事实", "查询项目当前进度", "机构档案、项目状态、资金变化、协议状态、待办事项。", "业务 API · 实时查询"], ["制度知识", "检索最新开户材料", "按业务域、有效版本与权限过滤，再做混合召回和 Rerank。", "RAG · 制度知识库"], ["客户上下文", "查询最近拜访纪要", "绑定标准 customer_id 与时间范围，禁止串入其他高校资料。", "RAG · 客户纪要库"]].map((item, index) => <article key={item[0]}><span>0{index + 1} · {item[0]}</span><h3>{item[1]}</h3><p>{item[2]}</p><b>{item[3]}</b></article>)}</div></section>

      <section className="cmb-trace-section cmb-trace-explorer" id="trace"><div className="page-shell"><header><span>02 / TRACE EXPLORER</span><div><h2>Bad Case：开户材料漏了一项</h2><p>新版已入库，但旧版关键词更强；清单又切得过碎，最终 Top K 不完整。</p></div></header><div className="cmb-trace-switch"><Button className={!fixed ? "active" : ""} onClick={() => switchMode(false)}>修复前 · Bad Case</Button><Button className={fixed ? "active" : ""} onClick={() => switchMode(true)}>修复后 · Regression Pass</Button></div><div className="cmb-trace-grid">
        <article><div className="cmb-trace-panel-head"><b>STEP 1</b><span>任务拆解</span></div><h3>材料生成任务</h3>{["查询项目进度", "检索开户制度", "查询客户纪要"].map(item => <p className="cmb-trace-check" key={item}><CheckCircle2 />{item}</p>)}<div className="cmb-trace-pass"><small>意图 / 工具链</small><b>正确，不是根因</b></div></article>
        <article><div className="cmb-trace-panel-head"><b>STEP 2</b><span>RAG TOP 3</span></div><div className="cmb-trace-docs">{state.docs.map((item, index) => <Button key={item[0]} className={selectedDoc === index ? "active" : ""} onClick={() => setSelectedDoc(index)}><span>#{index + 1}</span><span><b>{item[0]}</b><small>{item[1]}</small></span><i>{item[2]}</i><em>{item[3]}</em></Button>)}</div><div className="cmb-trace-evidence"><small>{doc[5]}</small><p>{doc[4]}</p></div></article>
        <article><div className="cmb-trace-panel-head"><b>STEP 3</b><span>生成结果</span></div><h3>{state.title}</h3><p className="cmb-trace-result-copy">{state.copy}</p><div className={`cmb-trace-decision ${fixed ? "fixed" : ""}`}>{state.decision}</div></article>
      </div><div className="cmb-trace-metrics">{state.metrics.map(item => <div key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong></div>)}</div><div className="cmb-trace-cause">{[["定位", "意图、工具调用正确", "排除流程和工具层"], ["根因 1", "旧制度未失效过滤", "版本元数据缺失"], ["根因 2", "材料清单 Chunk 过碎", "部分条目未进入 Top K"], ["修复", "版本过滤 + 父子 Chunk", "原样本回归并永久入集"]].map((item, index) => <div key={item[0]}><span>{item[0]}</span><b>{item[1]}</b><small>{item[2]}</small>{index < 3 ? <ArrowRight /> : null}</div>)}</div></div></section>

      <section className="cmb-trace-section page-shell"><header><span>03 / EVALUATION</span><div><h2>八维 Agent 评测</h2><p>标准由产品与业务定义，算法批量执行；固定样本回归取代“感觉变好了”。</p></div></header><div className="cmb-trace-dimensions">{dimensions.map((item, index) => <article key={item[0]}><span>0{index + 1}</span><h3>{item[0]}</h3><p>{item[1]}</p></article>)}</div></section>
      <section className="cmb-trace-section cmb-trace-pitfalls"><div className="page-shell"><header><span>04 / PROJECT PITFALLS</span><div><h2>这个项目真正会踩的坑</h2><p>全部来自招商银行高校 / 基金会经营助手链路。</p></div></header><div className="cmb-trace-pit-grid">{pitfalls.map((item, index) => <article key={item[0]}><span>0{index + 1}</span><h3>{item[0]}</h3><p>这类风险不会让系统直接报错，却会让业务结果悄悄偏离。</p><b>{item[1]}</b></article>)}</div></div></section>
    </main>
  );
}
