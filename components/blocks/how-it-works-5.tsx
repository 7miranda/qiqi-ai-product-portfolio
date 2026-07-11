"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface HowItWorks5Step {
  label: string;
  title: string;
  description?: string;
}

export interface HowItWorks5Props {
  eyebrow?: string;
  heading?: ReactNode;
  intro?: string;
  steps?: HowItWorks5Step[];
  accent?: string;
  ctaLabel?: string;
  ctaHref?: string;
  footnote?: string;
  className?: string;
}

const DEFAULT_STEPS: HowItWorks5Step[] = [
  {
    label: "FRAME",
    title: "把问题说清楚",
    description: "先识别真正的用户任务、业务约束和不可妥协的成功标准。",
  },
  {
    label: "PROTOTYPE",
    title: "让关键路径跑起来",
    description: "用可交互原型验证任务流、信息结构和 AI 能力边界。",
  },
  {
    label: "EVALUATE",
    title: "建立评测闭环",
    description: "把正确性、引用、拒答和失败样本写进可重复的评测集。",
  },
  {
    label: "SHIP",
    title: "带着证据上线",
    description: "对齐研发与业务，把范围、风险和下一轮迭代一起交付。",
  },
];

export default function HowItWorks5({
  eyebrow = "03 / OPERATING METHOD",
  heading = (
    <>
      从模糊需求
      <br />
      到可用产品
    </>
  ),
  intro = "我不把 AI 当作一个功能标签。每一步都要能说明：用户为什么需要、模型为什么可控、产品为什么值得上线。",
  steps = DEFAULT_STEPS,
  accent = "#E23A35",
  ctaLabel = "进入完整案例",
  ctaHref = "/case-study",
  footnote = "案例内容经过脱敏，重点呈现产品判断与工作方法。",
  className,
}: HowItWorks5Props = {}) {
  return (
    <section
      className={cn(
        "method-block w-full bg-[var(--paper)] px-5 py-20 text-[var(--ink)] sm:px-8 sm:py-28 lg:px-12 lg:py-36",
        className,
      )}
    >
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start"
        >
          <p className="mono-label m-0" style={{ color: accent }}>
            {eyebrow}
          </p>
          <h2 className="zh-heading mt-12 max-w-[720px] text-[clamp(46px,6.6vw,104px)] font-semibold leading-[1.12] tracking-0">
            {heading}
          </h2>
          <p className="zh-copy mt-8 max-w-[580px] text-[17px] text-[var(--ink-muted)] sm:text-[19px]">
            {intro}
          </p>
          <Link
            href={ctaHref}
            transitionTypes={["nav-forward"]}
            className="cursor-target action-link mt-10 inline-flex min-h-14 items-center justify-between gap-10 border border-[var(--ink)] bg-[var(--ink)] px-6 text-[14px] font-semibold text-[var(--paper)] no-underline"
          >
            {ctaLabel}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <p className="mt-5 max-w-[460px] text-[13px] leading-[1.7] tracking-[0.06em] text-[var(--ink-faint)]">
            {footnote}
          </p>
        </motion.div>

        <div className="border-t border-[var(--line)]">
          {steps.map((step, index) => (
            <motion.article
              key={step.label}
              initial={{ opacity: 0, x: 28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{
                duration: 0.58,
                delay: index * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group grid grid-cols-[58px_minmax(0,1fr)] gap-5 border-b border-[var(--line)] py-7 sm:grid-cols-[78px_minmax(0,1fr)] sm:gap-7 sm:py-9"
            >
              <span
                className="grid size-12 place-items-center self-start border border-[var(--ink)] font-mono text-[13px] font-medium transition-colors duration-300 group-hover:text-[var(--paper)] sm:size-14"
                style={{ backgroundColor: accent }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="pt-1">
                <span className="mono-label" style={{ color: accent }}>
                  {step.label}
                </span>
                <h3 className="mt-3 text-[25px] font-semibold leading-[1.2] tracking-0 sm:text-[32px]">
                  {step.title}
                </h3>
                {step.description ? (
                  <p className="zh-copy mt-3 max-w-[640px] text-[16px] text-[var(--ink-muted)]">
                    {step.description}
                  </p>
                ) : null}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
