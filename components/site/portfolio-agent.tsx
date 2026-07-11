"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const prompts = ["先看代表项目", "了解产品判断", "设计侧与体验侧", "商业化实践"];

type Answer = { title: string; body: string; href?: string; link?: string };
type Exchange = { question: string; answer: Answer };

const answerFor = (question: string): Answer => {
  const q = question.toLowerCase();
  if (/狠人|思维|人格|智能体/.test(q)) return { title: "狠人思维模型", body: "这是最集中体现 Agent 产品化与商业承接的案例。Miranda 参与了五阶段成长体系、智能体矩阵、人格一致性、行动任务、评测反馈与自研后台的系统化设计。", href: "/projects/persona-agent", link: "查看完整产品系统" };
  if (/内容|课程|生产|工作流/.test(q)) return { title: "AIGC 内容生产中枢", body: "项目把选题、脚本、视觉、封面、发布、复盘和转化组织成 66 条工作流，让零基础学员的稳定日产从 2–3 条提升到 10–20 条。", href: "/projects/bingo-coze", link: "查看内容生产证据" };
  if (/招商|基金|企业|可信|评测/.test(q)) return { title: "招商银行 · 校友基金会经营小助手", body: "通过三档协作边界、业务心智工具层和 200 条真实样本回归，工具调用准确率由 71% 提升到 89%，重点解决企业用户是否敢把任务交给 Agent。", href: "/projects/enterprise-agent", link: "查看企业 Agent 案例" };
  if (/益电工|电工|网校|订单|履约/.test(q)) return { title: "益电工 · C 端履约与网校协同平台", body: "该项目串联 C 端下单、客服订单处理、电工技术支持和同方向网校学习，形成服务、知识与培训一体化的业务闭环。", href: "/projects/government-knowledge", link: "查看服务协同案例" };
  if (/商业|增长|变现|岗位|适合/.test(q)) return { title: "商业化产品能力", body: "Miranda 擅长把业务规则、Agent 能力、体验标准和增长路径组织成可交付系统，覆盖 AIGC 工具增长、大模型应用产品化与行业 AI 解决方案。", href: "/about", link: "查看主理人档案" };
  if (/设计|体验|审美|ui|ux/.test(q)) return { title: "设计侧 × 体验侧", body: "设计侧把专业维度拆成知识库、规范、组件和资产；体验侧把复杂 AI 能力翻译为任务流、反馈和评测标准，两侧最终汇合为可复用的产品生产系统。", href: "/about", link: "查看双侧能力系统" };
  if (/方法|怎么做|流程|判断/.test(q)) return { title: "从问题到可信交付", body: "方法由任务定义、快速原型、评测门禁与真实协作四步构成。它不是抽象框架，而是五个项目共同使用的产品操作系统。", href: "/method", link: "查看方法归纳" };
  if (/联系|电话|邮箱|合作/.test(q)) return { title: "联系 Miranda", body: "电话 185 8631 2570；邮箱 yourandrea77@gmail.com；社交 ID：DJ_MIRANDA。适合交流 AI 产品、Agent 商业化、AIGC 工作流与复杂体验系统。" };
  return { title: "先从项目证据开始", body: "你的问题更适合从项目结果里寻找答案。建议先看内容生产中枢与狠人思维模型：前者展示系统化生产，后者展示人格 Agent 如何建立信任并完成商业承接。", href: "/projects", link: "打开项目展厅" };
};

export default function PortfolioAgent() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<Exchange[]>([{ question: "先看代表项目", answer: answerFor("先看代表项目") }]);

  const ask = (question: string) => {
    const value = question.trim();
    if (!value) return;
    setHistory((items) => [...items, { question: value, answer: answerFor(value) }]);
    setInput("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    ask(inputRef.current?.value ?? input);
  };

  return <>
    <motion.button className="agent-launcher" type="button" whileTap={{ scale: .94 }} whileHover={{ y: -5, scale: 1.06 }} onClick={() => setOpen(true)} aria-label="快速了解主理人">
      <span className="agent-avatar"><Bot aria-hidden="true" /></span>
    </motion.button>
    <AnimatePresence>{open ? <>
      <motion.button className="agent-backdrop" aria-label="关闭导览" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside className="agent-panel" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: .48, ease: [.22,1,.36,1] }} aria-label="IDEA 导览">
        <header><div><span>IDEA GUIDE / LIVE</span><h2>快速了解主理人</h2><p>选择问题，或直接输入你想了解的内容。</p></div><Button variant="outline" size="icon-lg" onClick={() => setOpen(false)} aria-label="关闭"><X /></Button></header>
        <div className="agent-prompts">{prompts.map((prompt) => <Button key={prompt} variant="outline" onClick={() => ask(prompt)}>{prompt}</Button>)}</div>
        <div className="agent-conversation">
          {history.map((item, index) => <div className="agent-exchange" key={`${item.question}-${index}`}>
            <motion.div className="agent-question" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{item.question}</motion.div>
            <motion.article className="agent-answer" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }}><span>IDEA GUIDE / ANSWER</span><h3>{item.answer.title}</h3><p>{item.answer.body}</p>{item.answer.href ? <Link href={item.answer.href} onClick={() => setOpen(false)}>{item.answer.link}<ArrowUpRight /></Link> : null}</motion.article>
          </div>)}
        </div>
        <form className="agent-input" onSubmit={submit}><input ref={inputRef} name="question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="输入项目、方法或合作问题" aria-label="输入问题" /><button type="submit" aria-label="发送问题"><Send /></button></form>
      </motion.aside>
    </> : null}</AnimatePresence>
  </>;
}
