"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export default function LobbyIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, "");
    const isHome = path === "" || path.endsWith("qiqi-ai-product-portfolio");
    if (!isHome || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setVisible(true);
    const close = window.setTimeout(() => setVisible(false), 3000);
    return () => window.clearTimeout(close);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div className="lobby-intro" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .6 }}>
          <motion.img className="lobby-intro-image" src="images/product-tower-lobby-v3.png" alt="一位兼具 DJ 与产品经理气质的 Q 版女生从背面走向 IDEA 大厦电梯" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 3.1, ease: [.22, 1, .36, 1] }} />
          <div className="lobby-intro-shade" />
          <div className="lobby-building-sign">IDEA 无限大厦 · 77F</div>
          <motion.div className="lobby-intro-copy" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35, duration: .8 }}>
            <span>IDEA 无限大厦 · 总控层</span>
            <strong>欢迎来到<br />IDEA 无限大厦</strong>
            <p>Miranda · AI 商业化与体验系统主理人</p>
          </motion.div>
          <div className="lobby-floor-display"><small>起始楼层 · 总控层</small><strong>77</strong><span>F</span></div>
          <motion.div className="lobby-scan" initial={{ y: "-100vh" }} animate={{ y: "100vh" }} transition={{ duration: 2.2, ease: "linear" }} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
