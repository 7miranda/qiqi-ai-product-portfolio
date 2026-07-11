import type { Metadata } from "next";
import ClickStack from "@/components/react-bits/click-stack";
import ParallaxPills from "@/components/react-bits/parallax-pills";
import Footer8 from "@/components/blocks/footer-8";

export const metadata: Metadata = { title: "关于我" };

const cards = [
  <article className="about-stack-panel tone-accent" key="judgment"><span>01 / COMMERCIAL SYSTEM</span><div><h3>AI 商业化架构</h3><p>从业务目标、价值规则与用户任务出发，确定 AI 能力的产品边界和增长路径。</p></div></article>,
  <article className="about-stack-panel tone-blue" key="design"><span>02 / EXPERIENCE SYSTEM</span><div><h3>复杂体验系统</h3><p>用任务模型、信息架构与交互原型，把模型能力翻译成可理解、可控制的产品体验。</p></div></article>,
  <article className="about-stack-panel tone-light" key="evaluation"><span>03 / QUALITY ENGINEERING</span><div><h3>评测与质量工程</h3><p>以失败样本、离线回归与发布门槛建立可复现、可审计的产品质量体系。</p></div></article>,
  <article className="about-stack-panel tone-dark" key="delivery"><span>04 / DELIVERY GOVERNANCE</span><div><h3>跨职能交付治理</h3><p>在业务、研发、算法与合规之间建立责任边界、协作规则和规模化交付机制。</p></div></article>,
];

const skills = [
  { label: "Agent 产品", background: "#111310", color: "#f5f5f2", x: 31, y: 28, width: 30, rotate: -3 },
  { label: "AIGC 工作流", background: "#caff52", color: "#111310", x: 68, y: 30, width: 34, rotate: 3 },
  { label: "RAG / 知识库", background: "#f5f5f2", color: "#111310", x: 50, y: 50, width: 35, rotate: 2 },
  { label: "高级 UI/UX", background: "#dfe2df", color: "#111310", x: 31, y: 72, width: 31, rotate: 3 },
  { label: "商业化", background: "#111310", color: "#f5f5f2", x: 69, y: 71, width: 28, rotate: -3 },
];

export default function AboutPage() {
  return (
    <main className="secondary-page about-page">
      <section className="about-hero page-shell">
        <div>
          <span className="page-index">PROFILE / ABOUT MIRANDA</span>
          <h1>把复杂能力组织成<br />清晰、可信的系统。</h1>
          <p>我是祁宁，Miranda。AI 应用产品经理 · 6 年全平台全链路 · 体验策略与产品增长，3 年企业级 AIGC / Agent 商业化操盘落地。</p>
          <dl className="about-contacts">
            <div><dt>PHONE</dt><dd><a href="tel:18586312570">185 8631 2570</a></dd></div>
            <div><dt>EMAIL</dt><dd><a href="mailto:yourandrea77@gmail.com">yourandrea77@gmail.com</a></dd></div>
            <div><dt>SOCIAL ID</dt><dd>DJ_MIRANDA</dd></div>
          </dl>
        </div>
        <div className="about-stack-wrap">
          <ClickStack items={cards} cardWidth={340} cardHeight={430} spreadX={28} spreadY={-24} duration={0.46} borderRadius={8} visibleCount={4} cardColor="#f5f5f2" className="about-stack" />
        </div>
      </section>
      <section className="about-skills">
        <div className="page-shell about-skills-grid"><div><span className="page-index">CAPABILITY MAP</span><h2>擅长把复杂能力，<br />组织成清晰系统。</h2></div><ParallaxPills pills={skills} height={520} pillHeight={60} pillRadius={6} fontSize={16} parallaxStrength={8} disableEmptyPills /></div>
      </section>
      <section className="dual-capability">
        <div className="page-shell">
          <header className="dual-capability-head"><span className="page-index">TWO SIDES / ONE SYSTEM</span><h2>设计侧建立标准，体验侧让标准真正发生。</h2><p>从 D20 方法中吸收的不是视觉表皮，而是一套把专业判断沉淀为 AI 可执行规则的工作方式。</p></header>
          <div className="dual-side-grid capability-triptych">
            <article className="capability-side product-side"><span>01 / PRODUCT SIDE</span><h3>产品侧 · 把业务目标转成产品系统</h3><ul><li>定义商业目标、价值规则与产品边界</li><li>拆解 Agent、Prompt、Skill 与知识资产</li><li>设计指标、评测门禁和增长回路</li></ul><img src="../images/d20/inspiration-system.jpg" alt="产品能力与业务知识系统" /></article>
            <article className="capability-side design-side"><span>02 / DESIGN SIDE</span><h3>设计侧 · 把专业判断沉淀为标准</h3><ul><li>建设 Design Token、组件规范与页面模板</li><li>将灵感、概念和反例沉淀为生成资产</li><li>让动态生成兼容真实业务场景</li></ul><img src="../images/d20/spec-system.jpg" alt="设计规范与生成式界面资产系统" /></article>
            <article className="capability-side experience-side"><span>03 / EXPERIENCE SIDE</span><h3>体验侧 · 让标准进入真实任务</h3><ul><li>围绕用户任务定义反馈、异常和确认点</li><li>建立人工接管与责任边界</li><li>从过程执行升级为路径与规则制定</li></ul><img src="../images/d20/knowledge-system.jpg" alt="AI 产品知识库与体验规则" /></article>
          </div>
        </div>
      </section>
      <Footer8 statement="有 Agent 场景、产品系统或复杂体验问题，欢迎直接联系我。" actionLabel="联系主理人" actionHref="#contact" />
    </main>
  );
}
