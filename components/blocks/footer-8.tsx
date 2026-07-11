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
  compact?: boolean;
  dense?: boolean;
}

const DEFAULT_COLUMNS: Footer8Column[] = [
  {
    title: "Explore",
    links: [
      { label: "首页", href: "/", direction: "back" },
      { label: "项目展厅", href: "/projects", direction: "forward" },
    ],
  },
  {
    title: "Focus",
    links: [
      { label: "产品判断", href: "/method" },
      { label: "AI 评测", href: "/projects/enterprise-agent" },
    ],
  },
  { title: "Connect", links: [{ label: "主理人档案", href: "/about" }, { label: "方法归纳", href: "/method" }] },
];

export default function Footer8({
  statement = "把复杂问题做成清晰、可评测、能上线的 AI 产品。",
  wordmark = "IDEA TOWER",
  columns = DEFAULT_COLUMNS,
  copyright = "© 2026 MIRANDA / IDEA TOWER PORTFOLIO",
  actionLabel = "OPEN CASE",
  actionHref = "/case-study",
  actionDirection = "forward",
  compact = false,
  dense = false,
}: Footer8Props = {}) {
  if (compact) {
    return <footer className="site-footer-compact"><div><p>{statement}</p><Link href={actionHref} className="action-link">{actionLabel}<ArrowUpRight size={16} /></Link></div></footer>;
  }
  if (dense) {
    return <footer className="site-footer-dense"><div className="site-footer-dense-inner"><p>{statement}</p><div className="site-footer-dense-links">{columns.map((column) => <div key={column.title}><span>{column.title}</span>{column.links.slice(0,1).map((link) => <Link key={link.label} href={link.href}>{link.label}</Link>)}</div>)}</div><Link href={actionHref} className="action-link">{actionLabel}<ArrowUpRight size={16} /></Link></div></footer>;
  }
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

        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 font-mono text-base text-[var(--ink-faint)] sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0">{copyright}</p>
          <p className="m-0">AI COMMERCIALIZATION & AGENT SYSTEMS</p>
        </div>
      </div>
    </footer>
  );
}
