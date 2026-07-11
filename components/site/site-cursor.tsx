"use client";

import { useEffect, useState } from "react";
import CustomCursor from "@/components/react-bits/custom-cursor";

export default function SiteCursor() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <CustomCursor circleSize={46} dotSize={9} circleColor="#ff4a3d" dotColor="#caff52" circleBorderWidth={1.5} circleStiffness={190} circleDamping={18} dotStiffness={420} dotDamping={24} circleClassName="site-cursor-ring" dotClassName="site-cursor-dot" elastic mixBlendMode="difference" targets={[".nav-contact", ".mast-action-primary", ".agent-launcher"]} targetPadding={8} />;
}
