"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Mail, MessageCircle, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const contacts = [
  { label: "电话", value: "18586312570", href: "tel:18586312570", icon: Phone },
  { label: "邮箱", value: "yourandrea77@gmail.com", href: "mailto:yourandrea77@gmail.com", icon: Mail },
  { label: "社交 ID", value: "DJ_MIRANDA", href: null, icon: MessageCircle },
];

export default function ContactDrawer() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setOpen(window.location.hash === "#contact");
    const intercept = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('a[href="#contact"]')) return;
      event.preventDefault();
      setOpen(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    document.addEventListener("click", intercept);
    return () => {
      window.removeEventListener("hashchange", sync);
      document.removeEventListener("click", intercept);
    };
  }, []);

  const close = () => {
    setOpen(false);
    if (window.location.hash === "#contact") window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(value);
    window.setTimeout(() => setCopied(null), 1400);
  };

  return (
    <>
      <Button className="contact-fab" type="button" onClick={() => setOpen(true)} aria-label="打开联系方式">
        <Mail size={18} />
        联系 ID 主理人
      </Button>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              aria-label="关闭联系方式"
              className="contact-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            <motion.aside
              className="contact-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              aria-label="联系方式"
            >
              <div className="contact-drawer-head">
                <div>
                  <span className="eyebrow">DIRECT CONTACT</span>
                  <h2>和 Miranda 聊聊</h2>
                </div>
                <Button variant="outline" size="icon-lg" onClick={close} aria-label="关闭">
                  <X />
                </Button>
              </div>
              <p className="contact-intro">适合联系我的话题：AI 产品经理、Agent 产品、企业 AI 落地、AIGC 商业化与高级 UI/UX 设计。</p>
              <div className="contact-rows">
                {contacts.map((item) => {
                  const Icon = item.icon;
                  const body = (
                    <>
                      <span className="contact-icon"><Icon /></span>
                      <span><small>{item.label}</small><strong>{item.value}</strong></span>
                    </>
                  );
                  return (
                    <div className="contact-row" key={item.label}>
                      {item.href ? <a href={item.href}>{body}</a> : <div>{body}</div>}
                      <Button variant="ghost" size="icon-lg" onClick={() => copy(item.value)} aria-label={`复制${item.label}`}>
                        <Copy />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="contact-status">{copied ? `已复制：${copied}` : "通常在 1–2 个工作日内回复"}</div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
