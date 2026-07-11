"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";

export interface Footer8Link {
  label: string;
  href: string;
  direction?: "forward" | "back";
}

export interface Footer8Column {
  title: string;
  links: Footer8Link[];
}

export interface Footer8Props {
  statement?: string;
  wordmark?: string;
  columns?: Footer8Column[];
  copyright?: string;
  actionLabel?: string;
  actionHref?: string;
  actionDirection?: "forward" | "back";
}

const DEFAULT_COLUMNS: Footer8Column[] = [
  {
    title: "Explore",
    links: [
      { label: "首页", href: "/", direction: "back" },
      { label: "案例", href: "/case-study", direction: "forward" },
    ],
  },
  {
    title: "Focus",
    links: [
      { label: "产品判断", href: "/case-study#decisions" },
      { label: "AI 评测", href: "/case-study#evaluation" },
    ],
  },
  {
    title: "Interview",
    links: [
      { label: "我的方法", href: "/#method", direction: "back" },
      { label: "面试速读", href: "/#evidence", direction: "back" },
    ],
  },
];

export default function Footer8({
  statement = "把复杂问题做成清晰、可评测、能上线的 AI 产品。",
  wordmark = "AI PRODUCT",
  columns = DEFAULT_COLUMNS,
  copyright = "© 2026 WENWO.STUDIO / AI PRODUCT MANAGER PORTFOLIO",
  actionLabel = "OPEN CASE",
  actionHref = "/case-study",
  actionDirection = "forward",
}: Footer8Props = {}) {
  return (
    <footer className="relative w-full overflow-hidden bg-[var(--paper-hi)] px-5 py-14 text-[var(--ink)] sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="grid grid-cols-1 gap-12 border-t border-[var(--line)] pt-8 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start gap-8"
          >
            <p className="zh-copy m-0 max-w-[390px] text-[18px] sm:text-[21px]">
              {statement}
            </p>
            <Link
              href={actionHref}
              transitionTypes={[
                actionDirection === "back" ? "nav-back" : "nav-forward",
              ]}
              className="cursor-target action-link inline-flex min-h-12 items-center gap-8 border border-[var(--ink)] px-4 text-[12px] font-semibold tracking-[0.16em] text-[var(--ink)] no-underline"
            >
              {actionLabel}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </motion.div>

          {columns.map((column, columnIndex) => (
            <motion.div
              key={column.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.45,
                delay: 0.04 + columnIndex * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="border-t border-[var(--line-soft)] pt-5 lg:border-[var(--line)]"
            >
              <h3 className="mono-label m-0 text-[var(--ink-faint)]">
                {column.title}
              </h3>
              <ul className="mt-5 flex list-none flex-col gap-3 p-0">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      transitionTypes={[
                        link.direction === "back" ? "nav-back" : "nav-forward",
                      ]}
                      className="cursor-target footer-link text-[16px] text-[var(--ink)] no-underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="footer-wordmark mt-20" aria-hidden="true">
          {wordmark}
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 font-mono text-[10px] tracking-[0.12em] text-[var(--ink-faint)] sm:flex-row sm:items-center sm:justify-between sm:text-[11px]">
          <p className="m-0">{copyright}</p>
          <p className="m-0">SHANGHAI · AVAILABLE FOR AI PRODUCT ROLES</p>
        </div>
      </div>
    </footer>
  );
}
