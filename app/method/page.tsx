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
      <section className="w-full bg-[#090b08] px-5 py-20 text-[#f4f2ee] sm:px-8 sm:py-28 lg:px-12 lg:py-32">
        <div className="mx-auto grid w-full max-w-[1400px] gap-10 border-t border-white/20 pt-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="mono-label m-0 text-[#caff52]">INTERACTIVE METHOD DEMO / 01</p>
            <h2 className="zh-heading mt-8 text-[clamp(42px,5vw,78px)] font-semibold leading-[1.05] tracking-[-0.04em]">
              招行 AI 经营小助<br /><span className="text-[#ff3b30]">RAG 评测与归因</span>
            </h2>
          </div>
          <div className="flex flex-col justify-between border-l border-white/20 pl-6 sm:pl-10">
            <p className="zh-copy max-w-[680px] text-[17px] leading-[1.8] text-white/65 sm:text-[19px]">
              从“南京大学基金会拜访 Brief”还原结构化接口、知识库召回、权限校验与 Bad Case 回归。可切换修复前后，观察旧制度误召回和 Chunk 过碎如何影响最终答案。
            </p>
            <div className="mt-10 flex flex-wrap gap-3 font-mono text-[12px] text-white/60">
              <span className="border border-white/20 px-4 py-2">14 个工具</span>
              <span className="border border-white/20 px-4 py-2">200 条样本</span>
              <span className="border border-white/20 px-4 py-2">71% → 89%</span>
            </div>
            <a className="cursor-target mt-10 inline-flex min-h-14 w-fit items-center gap-10 bg-[#caff52] px-6 text-[14px] font-semibold text-[#090b08] no-underline transition-transform hover:translate-x-1" href="/method/rag-evaluation/">
              打开交互 Demo <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
      <Footer8 dense statement="Prompt to Product：先证明结果，再把可靠路径自动化。" actionLabel="查看项目" actionHref="/projects" />
    </main>
  );
}
