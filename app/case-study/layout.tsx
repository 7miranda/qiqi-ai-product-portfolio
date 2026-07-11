import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "企业知识库 Copilot · 脱敏案例",
  description:
    "一个关于问题定义、产品取舍、答案结构与 AI 评测闭环的脱敏产品案例。",
};

export default function CaseStudyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
