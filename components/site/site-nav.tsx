"use client";

import { useState, ViewTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";

export interface SiteNavProps {
  theme?: "dark" | "light";
  current?: "home" | "case";
  actionLabel?: string;
  actionHref?: string;
  actionDirection?: "forward" | "back";
}

const navItems = [
  { label: "首页", href: "/", id: "home", direction: "nav-back" },
  {
    label: "案例",
    href: "/case-study",
    id: "case",
    direction: "nav-forward",
  },
  { label: "方法", href: "/#method", id: "method", direction: "nav-back" },
];

export default function SiteNav({
  theme = "dark",
  current = "home",
  actionLabel = "OPEN CASE",
  actionHref = "/case-study",
  actionDirection = "forward",
}: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const dark = theme === "dark";

  return (
    <ViewTransition name="site-nav" share="morph" default="none">
      <header
        className={`site-nav ${dark ? "site-nav-dark" : "site-nav-light"}`}
      >
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          className="cursor-target brand-lockup"
          aria-label="返回首页"
        >
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <span>WENWO.STUDIO</span>
        </Link>

        <nav className="site-nav-links" aria-label="主要导航">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              transitionTypes={[item.direction]}
              className={`cursor-target nav-link ${
                item.id === current ? "is-active" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href={actionHref}
          transitionTypes={[
            actionDirection === "back" ? "nav-back" : "nav-forward",
          ]}
          className="cursor-target nav-case-link"
        >
          {actionLabel}
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>

        {actionDirection === "back" ? (
          <Link
            href={actionHref}
            transitionTypes={["nav-back"]}
            className="cursor-target mobile-back-link"
            aria-label="返回首页"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            首页
          </Link>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen((value) => !value)}
          className="cursor-target mobile-menu-trigger h-10 w-10 rounded-none border"
          aria-label={open ? "关闭菜单" : "打开菜单"}
          aria-expanded={open}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </Button>

        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0 0)" }}
              exit={{ clipPath: "inset(0 0 100% 0)" }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
              className="mobile-menu"
            >
              <div className="mobile-menu-index mono-label">INDEX / 2026</div>
              <nav aria-label="移动端导航">
                {navItems.map((item, index) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    transitionTypes={[item.direction]}
                    onClick={() => setOpen(false)}
                    className="cursor-target mobile-menu-link"
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {item.label}
                    <ArrowUpRight size={24} aria-hidden="true" />
                  </Link>
                ))}
              </nav>
              <p className="mobile-menu-footnote">
                MIRANDA · AI COMMERCIALIZATION & EXPERIENCE SYSTEMS
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
    </ViewTransition>
  );
}
