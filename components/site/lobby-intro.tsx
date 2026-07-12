"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { assetPath } from "@/lib/asset-path";

export default function LobbyIntro() {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/+$/, "");
  const isHomePath = normalizedPath === "" || normalizedPath.endsWith("qiqi-ai-product-portfolio");
  const [visible, setVisible] = useState(isHomePath);

  useEffect(() => {
    if (!isHomePath || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const close = window.setTimeout(() => setVisible(false), 3000);
    return () => window.clearTimeout(close);
  }, [isHomePath]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div className="lobby-intro" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .45 }}>
          <motion.img className="lobby-intro-image" src={assetPath("images/product-tower-lobby-v4.png")} alt="一位兼具 DJ 与产品经理气质的 Q 版女生从背面走向 IDEA 大厦电梯" initial={{ scale: 1.12, x: "-4%", y: "4%" }} animate={{ scale: 1, x: 0, y: 0 }} transition={{ duration: 3.35, ease: [.22, 1, .36, 1] }} />
          <div className="lobby-intro-shade" />
          <motion.div className="lobby-intro-copy" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35, duration: .8 }}>
            <span>IDEA 无限大厦 · 总控层</span>
            <strong>欢迎来到<br />IDEA 无限大厦</strong>
            <p>AI 商业化与体验系统主理人</p>
          </motion.div>
          <div className="lobby-floor-display"><small>共 5 层 · 正在进入</small><strong>1</strong><span>层</span></div>
          <motion.div className="lobby-rise-light" initial={{ y: "72vh", opacity: 0 }} animate={{ y: ["72vh", "-18vh", "-18vh", "58vh"], opacity: [0, .8, .5, 0] }} transition={{ duration: 3.5, times: [0, .42, .72, 1], ease: "easeInOut" }} />
          <motion.div className="lobby-scan" initial={{ y: "-100vh" }} animate={{ y: "100vh" }} transition={{ duration: 2.2, ease: "linear" }} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
