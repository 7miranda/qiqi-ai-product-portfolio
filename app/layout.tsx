import type { Metadata } from "next";
import Navigation3 from "@/components/blocks/navigation-3";
import ContactDrawer from "@/components/site/contact-drawer";
import ElevatorTransition from "@/components/site/elevator-transition";
import LobbyIntro from "@/components/site/lobby-intro";
import AmbientAudio from "@/components/site/ambient-audio";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Miranda · IDEA 无限大厦",
    template: "%s | 祁宁 Miranda",
  },
  description: "Miranda 的 IDEA 无限大厦：AI 商业化、大模型应用产品化、AIGC 工具增长与行业 AI 解决方案作品集。",
};

const links = [
  { label: "首页", href: "/" },
  { label: "项目", href: "/projects" },
  { label: "方法", href: "/method" },
  { label: "关于", href: "/about" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="global-nav">
          <Navigation3
            brand="Miranda · IDEA 无限大厦"
            brandSub="AI 商业化与体验系统"
            brandHref="/"
            brandMark="7"
            links={links}
            loginLabel="185 8631 2570"
            loginHref="tel:18586312570"
            signupLabel="发送邮件"
            signupHref="mailto:yourandrea77@gmail.com"
            accent="#c7ff3d"
            dark
          />
        </header>
        {children}
        <LobbyIntro />
        <ElevatorTransition />
        <ContactDrawer />
        <AmbientAudio />
      </body>
    </html>
  );
}
