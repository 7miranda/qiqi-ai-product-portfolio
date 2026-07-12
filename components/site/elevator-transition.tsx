"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Destination = { title: string; subtitle: string };

const destinationFor = (href: string): Destination => {
  if (href.includes("persona-agent")) return { title: "狠人思维模型", subtitle: "一款爆品 · 一套素材 · 一组工作流" };
  if (href.includes("bingo-coze")) return { title: "AIGC 内容生产中枢", subtitle: "66 条工作流 · 稳定日产 3 → 20 条" };
  if (href.includes("enterprise-agent")) return { title: "企业级 Agent", subtitle: "从工具调用准确率进入可信协作" };
  if (href.includes("iot-platform")) return { title: "鸿泉物联网", subtitle: "从业务对象建模进入实时风险判断" };
  if (href.includes("government-knowledge")) return { title: "益电工", subtitle: "订单、履约、技术支持与网校协同" };
  if (href.includes("projects")) return { title: "项目展厅", subtitle: "五个完整案例 · 从结果进入方法" };
  if (href.includes("method")) return { title: "方法归纳", subtitle: "TEST → ITERATE → SEE → AUTOMATE" };
  if (href.includes("about")) return { title: "主理人档案", subtitle: "9 年产品经验 · 6 年高级 UI/UX · 近 3 年 AI 商业化" };
  return { title: "总控层", subtitle: "思 AI 所不能，见 AI 之所能" };
};

export default function ElevatorTransition() {
  const [target, setTarget] = useState<Destination | null>(null);

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const url = new URL((event as CustomEvent<{ url: string }>).detail.url, window.location.href);
      setTarget(destinationFor(url.pathname));
      window.setTimeout(() => { window.location.assign(url.href); }, 2420);
    };
    window.addEventListener("idea:navigate", handleNavigate);
    return () => window.removeEventListener("idea:navigate", handleNavigate);
  }, []);

  return (
    <>
      <AnimatePresence>
      {target ? (
        <motion.div className="elevator-transition transition-glide" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 2.35, times: [0, .12, .86, 1], ease: [.22, 1, .36, 1] }}>
          <motion.div className="transition-glide-light" initial={{ opacity: 0 }} animate={{ opacity: [0, .62, .62, 0] }} transition={{ duration: 2.3, times: [0, .2, .8, 1] }} />
          <motion.div className="elevator-display elevator-display-static" initial={{ opacity: 0, scale: .985 }} animate={{ opacity: [0, 1, 1, 0], scale: [.985, 1, 1, 1] }} transition={{ duration: 2.3, times: [0, .14, .84, 1] }}>
            <span>IDEA 无限大厦 / DESTINATION</span><strong>{target.title}</strong><small>{target.subtitle}</small>
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </>
  );
}
