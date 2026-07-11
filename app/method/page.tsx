import type { Metadata } from "next";
import BlurHighlight from "@/components/react-bits/blur-highlight";
import HowItWorks5 from "@/components/blocks/how-it-works-5";
import Footer8 from "@/components/blocks/footer-8";

export const metadata: Metadata = { title: "产品方法" };

const steps = [
  { label: "FRAME", title: "先定义任务，不先定义功能", description: "从用户真正要完成的判断与动作出发，明确业务约束、失败成本和可验证的成功标准。" },
  { label: "PROTOTYPE", title: "用原型暴露不确定性", description: "在投入完整工程之前，先验证答案结构、操作路径、确认点和人工接管是否被用户理解。" },
  { label: "EVALUATE", title: "评测先于规模化", description: "把事实、工具、引用、拒答、合规与人格稳定性拆成可以复现、可以阻止风险上线的指标。" },
  { label: "DELIVER", title: "把模型放进真实协作", description: "通过自动、确认和接管三档边界，让业务、研发、算法和合规在同一套产品规则中协作。" },
];

export default function MethodPage() {
  return (
    <main className="secondary-page method-page">
      <section className="method-manifesto">
        <div className="page-shell">
          <span className="page-index">02 / PRODUCT METHOD</span>
          <h1>我的工作不是给产品加上 AI，<br />而是判断哪一棒该不该交给 AI，<br />以及在哪里必须停下。</h1>
          <BlurHighlight highlightedBits={["清晰、可验证、可交付"]} highlightColor="#caff52" blurAmount={7}>
            <p className="method-highlight">产品方法的价值，是让复杂能力变得清晰、可验证、可交付。</p>
          </BlurHighlight>
        </div>
      </section>
      <HowItWorks5
        eyebrow="OPERATING SYSTEM"
        heading={<>从问题定义<br />到可信交付</>}
        intro="九年产品与体验设计经验让我习惯同时处理用户、业务、技术与交付。AI 只是能力，只有进入清晰的产品结构，才能形成价值。"
        steps={steps}
        accent="#caff52"
        ctaLabel="查看项目证据"
        ctaHref="/projects"
        footnote="方法并非抽象框架，五个项目分别展示了它在 AIGC、商业 Agent、企业 Agent、IoT 与政企服务中的落地。"
      />
      <Footer8 statement="方法的价值，在于让团队面对不确定性时仍然可以清晰推进。" actionLabel="查看项目" actionHref="/projects" />
    </main>
  );
}
