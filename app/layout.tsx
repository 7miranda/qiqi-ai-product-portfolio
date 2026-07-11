import type { Metadata } from "next";
import Navigation3 from "@/components/blocks/navigation-3";
import ContactDrawer from "@/components/site/contact-drawer";
import ElevatorTransition from "@/components/site/elevator-transition";
import LobbyIntro from "@/components/site/lobby-intro";
import SiteCursor from "@/components/site/site-cursor";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "祁宁 Miranda · AI 商业化产品作品集",
    template: "%s | 祁宁 Miranda",
  },
  description: "祁宁 Miranda 的 AI 商业化产品作品集：大模型应用产品化、AIGC 工具增长与行业 AI 解决方案。",
};

const links = [
  { label: "总控层", href: "/" },
  { label: "项目展厅", href: "/projects" },
  { label: "方法归纳", href: "/method" },
  { label: "主理人档案", href: "/about" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="global-nav">
          <Navigation3
            brand="IDEA 无限大厦 · 祁宁"
            brandSub=""
            brandHref="/"
            brandMark="PM"
            links={links}
            loginLabel=""
            signupLabel="联系主理人"
            signupHref="#contact"
            accent="#caff52"
            dark
          />
        </header>
        {children}
        <LobbyIntro />
        <ElevatorTransition />
        <ContactDrawer />
        <SiteCursor />
      </body>
    </html>
  );
}
