"use client";

// RETROFIT (stardime-home): 加 Navigation3Props 接收真内容（brand/links/login/signup）+ 去全部 href='#' 改真链。保留进场 motion + 居中 pill + 移动端抽屉。
// RETROFIT 加深 (stardime-next): 加 dark 场景 prop（近黑场反色 + accent 实色 CTA）；锚点链接不再强制新标签（仅外链 _blank）。
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Navigation3Link {
  label: string;
  href: string;
}
export interface Navigation3Props {
  brand?: string;
  brandHref?: string;
  brandMark?: string;
  /** 品牌副题（如 Student OS），跟在 brand 后弱化显示 */
  brandSub?: string;
  links?: Navigation3Link[];
  loginLabel?: string;
  loginHref?: string;
  signupLabel?: string;
  signupHref?: string;
  accent?: string;
  /** 深色场（近黑页顶用 true）*/
  dark?: boolean;
}

const DEFAULT_LINKS: Navigation3Link[] = [
  { label: "PRICING", href: "https://stardime.ai/" },
  { label: "DOCS", href: "https://stardime.ai/" },
  { label: "BLOG", href: "https://stardime.ai/" },
];

const isExternal = (href: string) => /^https?:\/\//.test(href);
const linkTarget = (href: string) =>
  isExternal(href) ? { target: "_blank" as const, rel: "noreferrer" } : {};

export function Navigation3({
  brand = "祁宁 · Miranda",
  brandHref = "/",
  brandMark = "77",
  brandSub,
  links = DEFAULT_LINKS,
  loginLabel = "LOGIN",
  loginHref = "https://stardime.ai/login",
  signupLabel = "SIGN UP",
  signupHref = "https://stardime.ai/signup",
  accent = "#c6f134",
  dark = false,
}: Navigation3Props = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ink = dark ? "#f4f2ee" : "#0d0d0c";
  const mutedInk = dark ? "rgba(244,242,238,0.66)" : "#48483f";
  const pillBg = dark ? "rgba(255,255,255,0.06)" : "rgba(13,13,12,0.05)";
  const pillHover = dark ? "hover:bg-white/10" : "hover:bg-white";
  const markBg = dark ? "rgba(255,255,255,0.1)" : "#0d0d0c";
  const ctaBg = dark ? accent : "#0d0d0c";
  const ctaFg = "#ffffff";

  return (
    <nav className="relative z-50 w-full px-4 py-4 sm:px-7" style={{ color: ink }}>
      <div className="mx-auto w-full max-w-[1400px]">
        {/* Desktop Navigation */}
        <motion.div
          className="hidden lg:flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Logo */}
          <a
            href={brandHref}
            className="flex items-center gap-3 text-xl font-semibold no-underline"
            style={{ color: ink }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: markBg }}
            >
              <span style={{ color: accent }}>{brandMark}</span>
            </span>
            <span>{brand}</span>
            {brandSub ? (
              <span className="text-xs font-normal tracking-[0.08em]" style={{ color: mutedInk }}>
                {brandSub}
              </span>
            ) : null}
          </a>

          {/* Nav Links Group - Centered */}
          <div
            className="flex items-center gap-1 rounded-full px-2 py-2"
            style={{ background: pillBg }}
          >
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                {...linkTarget(link.href)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors no-underline ${pillHover}`}
                style={{ color: mutedInk }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Auth Buttons - Right */}
          <div className="flex items-center gap-3">
            <a
              href={loginHref}
              {...linkTarget(loginHref)}
              className="px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-70 no-underline"
              style={{ color: mutedInk }}
            >
              {loginLabel}
            </a>
            <a
              href={signupHref}
              {...linkTarget(signupHref)}
              className="rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] no-underline"
              style={{ background: ctaBg, color: ctaFg }}
            >
              {signupLabel}
            </a>
          </div>
        </motion.div>

        {/* Mobile Navigation */}
        <motion.div
          className="lg:hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="flex items-center justify-between">
            <a
              href={brandHref}
              className="flex items-center gap-2 text-lg font-medium no-underline"
              style={{ color: ink }}
            >
              <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ background: markBg }}
            >
                <span style={{ color: accent }}>{brandMark}</span>
              </span>
              <span>{brand}</span>
            </a>

            <Button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: dark ? "rgba(255,255,255,0.1)" : "#0d0d0c", color: "#ffffff" }}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-4 pb-2 space-y-1">
                  <div
                    className="rounded-2xl p-2 mb-3"
                    style={{ background: pillBg }}
                  >
                    {links.map((link, index) => (
                      <motion.a
                        key={link.label}
                        href={link.href}
                        {...linkTarget(link.href)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block px-4 py-2.5 text-sm font-medium rounded-xl transition-colors no-underline ${pillHover}`}
                        style={{ color: mutedInk }}
                      >
                        {link.label}
                      </motion.a>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <a
                      href={loginHref}
                      {...linkTarget(loginHref)}
                      className="block text-center px-4 py-2.5 text-sm font-medium no-underline"
                      style={{ color: mutedInk }}
                    >
                      {loginLabel}
                    </a>
                    <a
                      href={signupHref}
                      {...linkTarget(signupHref)}
                      className="block text-center px-5 py-2.5 rounded-full text-sm font-medium no-underline"
                      style={{ background: ctaBg, color: ctaFg }}
                    >
                      {signupLabel}
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </nav>
  );
}

export default Navigation3;
