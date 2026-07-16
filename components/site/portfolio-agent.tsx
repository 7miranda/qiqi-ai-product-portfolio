"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const prompts = ["先看代表项目", "了解产品判断", "设计侧与体验侧", "商业化实践"];

type Answer = { title: string; body: string; href?: string; link?: string };
type Exchange = { question: string; answer: Answer };

const answerFor = (question: string): Answer => {
  const q = question.toLowerCase();
  if (/狠人|思维|人格|智能体/.test(q)) return { title: "狠人思维模型", body: "这是星辰维度把学习陪伴能力复用到个人成长场景的商业化 Agent。重点不是会聊天，而是用五阶段体系、50 个问题场景、人设知识、标准问答和 Bad Case 回流，让人格、判断和行动建议保持稳定。", href: "/projects/persona-agent", link: "查看完整产品系统" };
  if (/内容|课程|生产|工作流|星辰/.test(q)) return { title: "星辰维度 · AI 学习与内容生产系统", body: "项目从用户“不知道学什么”和“学完交付不了结果”两个问题切入，建立学习规划、阶段陪伴、视觉/内容/直播三类生成能力和质量评测闭环，最终沉淀 66 条细分工作流。", href: "/projects/bingo-coze", link: "查看内容生产证据" };
  if (/招商|基金|企业|可信|评测|金融/.test(q)) return { title: "招商银行 · 经营辅助 Agent", body: "这个项目把高校、基金会、项目、协议与资金经营数据，从记录系统升级为能查数据、看机会、写材料、做审核的 AI 经营助手。重点是数据溯源、工具调用、人机边界和八维评测。", href: "/projects/enterprise-agent", link: "查看企业 Agent 案例" };
  if (/益电工|电工|网校|订单|履约|政企/.test(q)) return { title: "益电工 · 服务履约与网校协同", body: "这个案例体现复杂政企服务平台的产品基本功：把 C 端下单、客服订单处理、后台技术支持和同方向网校学习串成服务交付闭环。", href: "/projects/government-knowledge", link: "查看服务协同案例" };
  if (/鸿泉|车联网|物联网|机车|多端/.test(q)) return { title: "鸿泉物联网 · 车联网多端产品系统", body: "这是早期产品基本功项目：从甲方模糊需求出发，拆解业务目标、用户路径、功能模块、字段规则和版本计划，推进 APP、小程序和后台的多端交付。", href: "/projects/iot-platform", link: "查看多端交付案例" };
  if (/商业|增长|变现|岗位|适合/.test(q)) return { title: "商业化产品能力", body: "Miranda 擅长把业务规则、Agent 能力、体验标准和增长路径组织成可交付系统，覆盖 AIGC 工具增长、大模型应用产品化与行业 AI 解决方案。", href: "/about", link: "查看主理人档案" };
  if (/设计|体验|审美|ui|ux/.test(q)) return { title: "设计侧 × 体验侧", body: "设计侧把专业维度拆成知识库、规范、组件和资产；体验侧把复杂 AI 能力翻译为任务流、反馈和评测标准，两侧最终汇合为可复用的产品生产系统。", href: "/about", link: "查看双侧能力系统" };
  if (/方法|怎么做|流程|判断/.test(q)) return { title: "从问题到可信交付", body: "行动路线是 Test、Iterate、See、Automate：先验证任务，迭代真实反馈，看见小结果，再把可靠路径系统化。", href: "/method", link: "查看方法归纳" };
  if (/联系|电话|邮箱|合作/.test(q)) return { title: "联系 Miranda", body: "电话 185 8631 2570；邮箱 hi@77miranda.com；社交 ID：DJ_MIRANDA。适合交流 AI 产品、Agent 商业化、AIGC 工作流与复杂体验系统。" };
  return { title: "先从项目证据开始", body: "你的问题更适合从项目结果里寻找答案。建议先看星辰维度的学习与内容生产系统，再看狠人思维模型：前者展示 Agent + Workflow 如何稳定交付作品，后者展示人格 Agent 如何完成商业化复用。", href: "/projects", link: "打开项目展厅" };
};

export default function PortfolioAgent() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Exchange[]>([{ question: "先看代表项目", answer: answerFor("先看代表项目") }]);

  const ask = (question: string) => {
    const value = question.trim();
    if (!value) return;
    setHistory((items) => [...items, { question: value, answer: answerFor(value) }]);
  };

  return <>
    <motion.button className="agent-launcher" type="button" whileTap={{ scale: .94 }} whileHover={{ y: -5, scale: 1.06 }} onClick={() => setOpen(true)} aria-label="快速了解主理人">
      <span className="agent-avatar"><Bot aria-hidden="true" /></span>
    </motion.button>
    <AnimatePresence>{open ? <>
      <motion.button className="agent-backdrop" aria-label="关闭导览" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside className="agent-panel" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: .48, ease: [.22,1,.36,1] }} aria-label="IDEA 导览">
        <header><div><span>IDEA GUIDE / LIVE</span><h2>快速了解主理人</h2><p>选择一个方向，快速定位项目证据。</p></div><Button variant="outline" size="icon-lg" onClick={() => setOpen(false)} aria-label="关闭"><X /></Button></header>
        <div className="agent-prompts">{prompts.map((prompt) => <Button key={prompt} variant="outline" onClick={() => ask(prompt)}>{prompt}</Button>)}</div>
        <div className="agent-conversation">
          {history.map((item, index) => <div className="agent-exchange" key={`${item.question}-${index}`}>
            <motion.div className="agent-question" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{item.question}</motion.div>
            <motion.article className="agent-answer" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }}><span>IDEA GUIDE / ANSWER</span><h3>{item.answer.title}</h3><p>{item.answer.body}</p>{item.answer.href ? <Link href={item.answer.href} onClick={() => setOpen(false)}>{item.answer.link}<ArrowUpRight /></Link> : null}</motion.article>
          </div>)}
        </div>
      </motion.aside>
    </> : null}</AnimatePresence>
  </>;
}
