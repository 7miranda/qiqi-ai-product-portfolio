"use client";

import { useEffect, useState } from "react";
import CustomCursor from "@/components/react-bits/custom-cursor";

export default function SiteCursor() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <CustomCursor circleSize={50} dotSize={7} circleColor="rgba(202,255,82,.76)" dotColor="#ff4438" circleBorderWidth={1} circleStiffness={165} circleDamping={18} dotStiffness={500} dotDamping={27} circleClassName="site-cursor-ring" dotClassName="site-cursor-dot" elastic targets={[".nav-contact", ".mast-action", ".agent-launcher", ".tool-chip"]} targetPadding={7} />;
}
