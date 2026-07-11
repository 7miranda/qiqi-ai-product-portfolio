"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";

export default function LobbyIntro() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, "");
    const isHome = path === "" || path.endsWith("qiqi-ai-product-portfolio");
    if (!isHome || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setVisible(true);
    const started = window.performance.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (window.performance.now() - started) / 1800);
      setProgress(Math.round(100 * (1 - Math.pow(1 - progress, 3))));
    }, 38);
    const close = window.setTimeout(() => setVisible(false), 3000);
    return () => { window.clearInterval(timer); window.clearTimeout(close); };
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div className="lobby-intro" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .6 }}>
          <motion.img className="lobby-intro-image" src="images/product-tower-lobby-v3.png" alt="一位兼具 DJ 与产品经理气质的 Q 版女生从背面走向 IDEA 大厦电梯" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 3.1, ease: [.22, 1, .36, 1] }} />
          <div className="lobby-intro-shade" />
          <div className="lobby-building-sign">IDEA 无限大厦</div>
          <motion.div className="lobby-intro-copy" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35, duration: .8 }}>
            <span>IDEA 无限大厦 · 总控层</span>
            <strong>欢迎来到<br />IDEA 无限大厦</strong>
            <p>Miranda · AI 商业化与体验系统主理人</p>
          </motion.div>
          <div className="lobby-floor-display"><small>正在进入总控层</small><strong>{String(progress).padStart(2, "0")}</strong><span>%</span></div>
          <motion.div className="lobby-scan" initial={{ y: "-100vh" }} animate={{ y: "100vh" }} transition={{ duration: 2.2, ease: "linear" }} />
          <Button className="lobby-skip" variant="outline" onClick={() => setVisible(false)}>直接进入总控层</Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
