import type { Metadata } from "next";
import Navigation3 from "@/components/blocks/navigation-3";
import ContactDrawer from "@/components/site/contact-drawer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "祁宁 Miranda · AI 产品经理作品集",
    template: "%s | 祁宁 Miranda",
  },
  description: "9 年数字化产品与高级 UI/UX 设计经验，近 3 年聚焦 AIGC 商业化与企业级 AI 应用落地。",
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
            brand="七七 · Miranda"
            brandSub="AI PRODUCT MANAGER"
            brandHref="/"
            brandMark="七七"
            links={links}
            loginLabel="185 8631 2570"
            loginHref="tel:18586312570"
            signupLabel="发送邮件"
            signupHref="mailto:yourandrea77@gmail.com"
            accent="#3567f6"
          />
        </header>
        {children}
        <ContactDrawer />
      </body>
    </html>
  );
}
