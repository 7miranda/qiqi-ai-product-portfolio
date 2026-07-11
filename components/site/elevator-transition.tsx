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
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a");
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (url.pathname === "/" || url.pathname === "/qiqi-ai-product-portfolio/") return;
      event.preventDefault();
      setTarget(destinationFor(url.pathname));
      window.setTimeout(() => { window.location.href = url.href; }, 390);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <>
      <AnimatePresence>
      {target ? (
        <motion.div className="elevator-transition transition-glide" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: .38, times: [0, .24, .7, 1], ease: [.22, 1, .36, 1] }}>
          <motion.div className="transition-glide-light" initial={{ x: "-125%" }} animate={{ x: "125%" }} transition={{ duration: .38, ease: [.22, 1, .36, 1] }} />
          <motion.div className="transition-glide-label" initial={{ opacity: 0, y: 5 }} animate={{ opacity: [0, .88, 0], y: [5, 0, -3] }} transition={{ duration: .36, times: [0, .35, 1] }}>
            <span>{target.title}</span><small>{target.subtitle}</small>
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </>
  );
}
