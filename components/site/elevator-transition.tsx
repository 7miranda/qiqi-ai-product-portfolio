"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  if (href.includes("insights")) return { title: "最新资讯", subtitle: "记录模型变化 · 判断产品方向" };
  if (href.includes("about")) return { title: "主理人档案", subtitle: "9 年数字化产品经验 · 近 3 年 AI 商业化落地" };
  return { title: "总控层", subtitle: "思 AI 所不能，见 AI 之所能" };
};

export default function ElevatorTransition() {
  const [target, setTarget] = useState<Destination | null>(null);
  const router = useRouter();

  useEffect(() => {
    const timers: number[] = [];
    const handleNavigate = (event: MouseEvent) => {
      const origin = event.target;
      if (!(origin instanceof Element)) return;
      const link = origin.closest(".nav-floor-tab, .nav-mobile-link") as HTMLAnchorElement | null;
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href, window.location.href);
      const logicalPath = url.pathname.replace(/^\/qiqi-ai-product-portfolio/, "") || "/";
      if (logicalPath === "/" || url.pathname === window.location.pathname) return;
      event.preventDefault();
      setTarget(destinationFor(url.pathname));
      timers.push(window.setTimeout(() => router.push(logicalPath), 1480));
      timers.push(window.setTimeout(() => setTarget(null), 2440));
    };
    document.addEventListener("click", handleNavigate, true);
    return () => {
      document.removeEventListener("click", handleNavigate, true);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [router]);

  return (
    <>
      <AnimatePresence>
      {target ? (
        <motion.div className="elevator-transition transition-glide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .18 }}>
          <motion.div className="transition-floor-half transition-floor-half-top" initial={{ y: "0%" }} animate={{ y: ["0%", "0%", "-102%"] }} transition={{ duration: 2.38, times: [0, .76, 1], ease: [.76, 0, .24, 1] }} />
          <motion.div className="transition-floor-half transition-floor-half-bottom" initial={{ y: "0%" }} animate={{ y: ["0%", "0%", "102%"] }} transition={{ duration: 2.38, times: [0, .76, 1], ease: [.76, 0, .24, 1] }} />
          <motion.div className="transition-glide-light" initial={{ opacity: 0 }} animate={{ opacity: [0, .62, .62, 0] }} transition={{ duration: 2.24, times: [0, .2, .72, 1] }} />
          <motion.div className="elevator-display elevator-display-static" initial={{ opacity: 0, scale: .975 }} animate={{ opacity: [0, 1, 1, 0], scale: [.975, 1, 1, .99] }} transition={{ duration: 2.12, times: [0, .15, .72, 1] }}>
            <span>IDEA 无限大厦 / DESTINATION</span><strong>{target.title}</strong><small>{target.subtitle}</small>
          </motion.div>
          <motion.div className="transition-floor-opening" initial={{ opacity: 0, scaleX: .02 }} animate={{ opacity: [0, 0, 1, 0], scaleX: [.02, .02, 1, 1] }} transition={{ duration: 2.38, times: [0, .75, .9, 1], ease: [.22, 1, .36, 1] }} />
        </motion.div>
      ) : null}
      </AnimatePresence>
    </>
  );
}
