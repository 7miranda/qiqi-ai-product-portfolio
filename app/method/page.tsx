import type { Metadata } from "next";
import BlurHighlight from "@/components/react-bits/blur-highlight";
import HowItWorks5 from "@/components/blocks/how-it-works-5";
import Footer8 from "@/components/blocks/footer-8";

export const metadata: Metadata = { title: "产品方法" };

const steps = [
  { label: "TEST", title: "先用最小闭环验证任务", description: "从用户真正要完成的判断与动作出发，用最小可运行方案验证业务约束、失败成本和成功标准。" },
  { label: "ITERATE", title: "用真实反馈收敛不确定性", description: "围绕答案结构、操作路径、人工确认和异常接管快速迭代，不让团队在假设上堆功能。" },
  { label: "SEE", title: "先看见小结果，再扩大权限", description: "用事实、工具、引用、拒答、合规与人格稳定性评测确认小结果真实成立。" },
  { label: "AUTOMATE", title: "把被验证的路径系统化", description: "将稳定路径封装为 Prompt、Skill、知识资产和协作规则，再进入可持续自动化。" },
];

export default function MethodPage() {
  return (
    <main className="secondary-page method-page">
      <section className="method-manifesto">
        <div className="page-shell">
          <span className="page-index">METHOD ARCHIVE / PRODUCT METHOD</span>
          <h1>我的工作不是给产品加上 AI，<br />而是判断哪一棒该<em>交给 AI</em>，<br />哪里必须<em>由人接住</em></h1>
          <BlurHighlight highlightedBits={["清晰、可验证、可交付"]} highlightColor="#ff3b30" blurAmount={7}>
            <p className="method-highlight">产品方法的价值，是让复杂能力变得清晰、可验证、可交付。</p>
          </BlurHighlight>
          <div className="method-operating-route" aria-label="产品行动路线"><span>TEST</span><i>→</i><span>ITERATE</span><i>→</i><span>SEE</span><i>→</i><span>AUTOMATE</span></div>
          <p className="method-principle">提示即产品 · 其余自动 · 造系统，不定空目标</p>
        </div>
      </section>
      <section className="w-full bg-[#caff52] px-5 py-5 text-[#090b08] sm:px-8 sm:py-8 lg:px-12">
        <div className="mx-auto grid w-full max-w-[1400px] overflow-hidden bg-[#090b08] text-[#f4f2ee] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-7 sm:p-10 lg:p-14">
            <div className="flex items-center gap-3">
              <span className="bg-[#ff3b30] px-3 py-1.5 font-mono text-[11px] font-bold text-white">NEW · INTERACTIVE</span>
              <span className="font-mono text-[11px] tracking-[0.14em] text-[#caff52]">METHOD DEMO / 01</span>
            </div>
            <h2 className="zh-heading mt-8 max-w-[760px] text-[clamp(42px,5.8vw,82px)] font-semibold leading-[1.02] tracking-[-0.05em]">
              招行 AI 经营小助<br /><span className="text-[#ff3b30]">RAG 评测与归因</span>
            </h2>
            <p className="zh-copy mt-7 max-w-[720px] text-[16px] leading-[1.8] text-white/65 sm:text-[18px]">
              评测回归已经并入“招商银行 AI 经营助手”完整项目，成为验证系统子项目。从业务建模、数据与知识、Agent 编排、工具权限一路下钻到 Bad Case 回归。
            </p>
          </div>
          <div className="flex flex-col justify-between border-t border-white/20 bg-white/[0.04] p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-14">
            <div>
              <p className="m-0 font-mono text-[11px] tracking-[0.14em] text-white/45">PROJECT EVIDENCE</p>
              <div className="mt-7 grid grid-cols-3 border-y border-white/20 py-6">
                <div><strong className="block font-mono text-[20px] text-white sm:text-[25px]">14</strong><span className="mt-2 block text-[11px] text-white/50">个工具</span></div>
                <div><strong className="block font-mono text-[20px] text-white sm:text-[25px]">200</strong><span className="mt-2 block text-[11px] text-white/50">条样本</span></div>
                <div><strong className="block font-mono text-[20px] text-white sm:text-[25px]">71→89%</strong><span className="mt-2 block text-[11px] text-white/50">准确率</span></div>
              </div>
            </div>
            <a
              className="cursor-target mt-9 inline-flex min-h-16 w-full items-center justify-between bg-[#caff52] px-6 text-[15px] font-bold no-underline transition-transform hover:-translate-y-1"
              href="/projects/enterprise-agent/"
              style={{ color: "#090b08" }}
            >
              进入招商银行完整项目 <span className="text-[20px]" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
      <HowItWorks5
        eyebrow="OPERATING SYSTEM"
        heading={<>从问题定义<br />到可信交付</>}
        intro="九年产品与体验设计经验让我习惯同时处理用户、业务、技术与交付。AI 只是能力，只有进入清晰的产品结构，才能形成价值。"
        steps={steps}
        accent="#ff3b30"
        ctaLabel="查看项目证据"
        ctaHref="/projects"
        footnote="方法并非抽象框架，五个项目分别展示了它在 AIGC、商业 Agent、企业 Agent、IoT 与政企服务中的落地。"
      />
      <Footer8 dense statement="Prompt to Product：先证明结果，再把可靠路径自动化。" actionLabel="查看项目" actionHref="/projects" />
    </main>
  );
}
