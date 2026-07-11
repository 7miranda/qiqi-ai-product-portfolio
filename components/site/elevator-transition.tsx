"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";

const floorFor = (href: string) => {
  if (href.includes("persona-agent")) return "04F · 狠人思维模型";
  if (href.includes("bingo-coze")) return "05F · Bingo Coze";
  if (href.includes("enterprise-agent")) return "03F · 企业级 Agent";
  if (href.includes("iot-platform")) return "02F · 鸿泉物联网";
  if (href.includes("government-knowledge")) return "01F · 益电工";
  if (href.includes("projects")) return "05F · 项目展厅";
  if (href.includes("method")) return "04F · 产品方法";
  if (href.includes("about")) return "02F · Miranda";
  return "77F · 总控大厅";
};

export default function ElevatorTransition() {
  const [target, setTarget] = useState<string | null>(null);
  const pathname = usePathname();
  const currentFloor = floorFor(pathname);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a");
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      event.preventDefault();
      setTarget(floorFor(url.pathname));
      window.setTimeout(() => { window.location.href = url.href; }, 720);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <>
      <aside className="current-floor" aria-label={`当前楼层 ${currentFloor}`}><span>NOW</span><strong>{currentFloor}</strong><small>IDEA 无限大厦 · 共 77 层</small></aside>
      <AnimatePresence>
      {target ? (
        <motion.div className="elevator-transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="elevator-door elevator-door-left" initial={{ x: "-100%" }} animate={{ x: 0 }} transition={{ duration: .56, ease: [.22, 1, .36, 1] }} />
          <motion.div className="elevator-door elevator-door-right" initial={{ x: "100%" }} animate={{ x: 0 }} transition={{ duration: .56, ease: [.22, 1, .36, 1] }} />
          <motion.div className="elevator-display" initial={{ opacity: 0, scale: .88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .3 }}>
            <span>IDEA 无限大厦</span><strong>{target}</strong><small>电梯运行中 · 楼层已锁定</small>
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </>
  );
}
