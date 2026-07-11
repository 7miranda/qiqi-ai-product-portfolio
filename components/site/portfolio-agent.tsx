"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Bot, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const prompts = ["先看最强案例", "她适合什么岗位", "体验与设计能力", "商业化做过什么"];

type Answer = { title: string; body: string; href?: string; link?: string };

const answerFor = (question: string): Answer => {
  const q = question.toLowerCase();
  if (/狠人|思维|智能体|工作流/.test(q)) return { title: "04F · 狠人思维模型", body: "这是最适合看 Agent 产品化与内容工作流的案例：从五阶段认知体系、智能体矩阵到对话交付，Miranda 参与了产品结构、体验路径、内容资产与自研后台的系统化设计。", href: "/projects/persona-agent", link: "进入 04F 查看完整系统" };
  if (/商业|增长|变现|岗位|适合/.test(q)) return { title: "Miranda 的岗位匹配", body: "更适合 AI 商业化产品经理、大模型应用产品经理、AIGC 工具增长或行业 AI 解决方案岗位。她的优势不是单点出原型，而是把业务规则、Agent 能力、体验标准与增长路径组织成可交付系统。", href: "/about", link: "查看能力双侧" };
  if (/设计|体验|审美|ui|ux/.test(q)) return { title: "设计侧 × 体验侧", body: "设计侧负责把专业维度拆成知识库、规范、组件与资产；体验侧负责把复杂 AI 能力翻译成清晰任务流、反馈与评测标准。两侧最终汇合为可复用的产品生产系统。", href: "/about", link: "查看双侧能力系统" };
  if (/bingo|coze|内容|课程/.test(q)) return { title: "05F · Bingo Coze", body: "该项目把选题、脚本、视觉、封面、发布、复盘与转化串成 66 条工作流，让零基础学员可以稳定日产 10–20 条内容。重点不是会用工具，而是把工具组织成生产线。", href: "/projects/bingo-coze", link: "进入 05F 查看数据" };
  if (/联系|电话|邮箱|微信|合作/.test(q)) return { title: "直接联系 Miranda", body: "电话 185 8631 2570；邮箱 yourandrea77@gmail.com；微信 DJ_MIRANDA。适合交流 AI 产品、Agent 商业化、AIGC 工作流与复杂体验系统。" };
  return { title: "建议先从项目证据开始", body: "如果只有几分钟，先看 05F 的内容生产系统与 04F 的狠人智能体。这两个案例最集中地展示了 Miranda 如何把模糊想法变成可运行、可度量、可复用的 AI 产品。", href: "/projects", link: "打开项目楼层目录" };
};

export default function PortfolioAgent() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("先看最强案例");
  const answer = useMemo(() => answerFor(asked), [asked]);
  const submit = (event: FormEvent) => { event.preventDefault(); if (query.trim()) { setAsked(query.trim()); setQuery(""); } };

  return <>
    <Button className="agent-launcher" type="button" onClick={() => setOpen(true)}>
      <Bot /><span><strong>问 IDEA 导览 Agent</strong><small>快速定位项目与证据</small></span><Sparkles />
    </Button>
    <AnimatePresence>{open ? <>
      <motion.button className="agent-backdrop" aria-label="关闭导览 Agent" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside className="agent-panel" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: .48, ease: [.22,1,.36,1] }} aria-label="IDEA 导览 Agent">
        <header><div><span>77F / LIVE GUIDE</span><h2>问 IDEA 导览 Agent</h2><p>项目、能力、合作方式，都可以直接问。</p></div><Button variant="outline" size="icon-lg" onClick={() => setOpen(false)} aria-label="关闭"><X /></Button></header>
        <div className="agent-prompts">{prompts.map((prompt) => <Button key={prompt} variant={asked === prompt ? "default" : "outline"} onClick={() => setAsked(prompt)}>{prompt}</Button>)}</div>
        <div className="agent-conversation">
          <motion.div className="agent-question" key={asked} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>{asked}</motion.div>
          <motion.article className="agent-answer" key={`${asked}-answer`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}><span>IDEA GUIDE / ANSWER</span><h3>{answer.title}</h3><p>{answer.body}</p>{answer.href ? <Link href={answer.href} onClick={() => setOpen(false)}>{answer.link}<ArrowUpRight /></Link> : null}</motion.article>
        </div>
        <form onSubmit={submit}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：她做过哪些 Agent 项目？" aria-label="输入问题" /><Button size="icon-lg" aria-label="发送问题"><Send /></Button></form>
      </motion.aside>
    </> : null}</AnimatePresence>
  </>;
}
