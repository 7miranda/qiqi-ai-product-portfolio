"use client";

import { useEffect } from "react";

export default function ScrollReset() {
  useEffect(() => {
    const reset = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        document
          .getElementById(decodeURIComponent(hash))
          ?.scrollIntoView({ block: "start", behavior: "auto" });
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };
    reset();
    const frame = window.requestAnimationFrame(reset);
    const timer = window.setTimeout(reset, 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
