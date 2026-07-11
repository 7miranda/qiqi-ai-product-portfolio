import type { Metadata } from "next";
import ClickStack from "@/components/react-bits/click-stack";
import ParallaxPills from "@/components/react-bits/parallax-pills";
import Footer8 from "@/components/blocks/footer-8";

export const metadata: Metadata = { title: "关于我" };

const cards = [
  <article className="about-stack-panel tone-accent" key="judgment"><span>01 / JUDGMENT</span><div><h3>产品判断</h3><p>从业务链路和用户任务出发，识别 AI 真正值得介入的位置。</p></div></article>,
  <article className="about-stack-panel tone-blue" key="design"><span>02 / DESIGN</span><div><h3>体验表达</h3><p>用信息架构、原型与交互，把复杂能力翻译成用户能理解的产品。</p></div></article>,
  <article className="about-stack-panel tone-light" key="evaluation"><span>03 / EVALUATION</span><div><h3>评测闭环</h3><p>通过失败样本、离线回归和发布门槛，让质量不再依赖主观感觉。</p></div></article>,
  <article className="about-stack-panel tone-dark" key="delivery"><span>04 / DELIVERY</span><div><h3>跨团队交付</h3><p>在研发、算法、业务和合规之间建立可以共同执行的产品规则。</p></div></article>,
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
          <span className="page-index">02F / ABOUT MIRANDA</span>
          <h1>产品经理的判断力，<br />高级设计师的表达力。</h1>
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
          <header className="dual-capability-head"><span className="page-index">TWO SIDES / ONE SYSTEM</span><h2>设计侧建立标准，<br />体验侧让标准真正发生。</h2><p>从 D20 方法中吸收的不是视觉表皮，而是一套把专业判断沉淀为 AI 可执行规则的工作方式。</p></header>
          <div className="dual-side-grid">
            <article className="capability-side design-side"><span>01 / DESIGN SIDE</span><h3>设计侧 · 把专业拆成可调用资产</h3><ul><li>解构专业维度，建设业务知识库</li><li>定义 Design Token、组件规范与页面模板</li><li>把灵感、概念与反例沉淀成评测资产</li><li>从方案交付升级为完整能力交付</li></ul><img src="images/d20/spec-system.jpg" alt="设计规范与生成式界面资产系统" /></article>
            <article className="capability-side experience-side"><span>02 / EXPERIENCE SIDE</span><h3>体验侧 · 把复杂能力变成清晰任务</h3><ul><li>围绕用户任务组织 Agent、Prompt 与 Skill</li><li>定义反馈、异常与质量门槛</li><li>让动态生成与静态业务场景保持一致</li><li>从过程执行升级为路径与规则制定</li></ul><img src="images/d20/knowledge-system.jpg" alt="AI 产品知识库与体验规则" /></article>
          </div>
        </div>
      </section>
      <Footer8 statement="有 Agent 场景、产品系统或复杂体验问题，欢迎直接联系我。" actionLabel="联系 ID 主理人" actionHref="#contact" />
    </main>
  );
}
