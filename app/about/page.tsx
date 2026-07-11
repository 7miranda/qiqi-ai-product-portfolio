import type { Metadata } from "next";
import ClickStack from "@/components/react-bits/click-stack";
import ParallaxPills from "@/components/react-bits/parallax-pills";
import Footer8 from "@/components/blocks/footer-8";

export const metadata: Metadata = { title: "关于我" };

const cards = [
  <article className="about-stack-panel tone-red" key="judgment"><span>01 / JUDGMENT</span><div><h3>产品判断</h3><p>从业务链路和用户任务出发，识别 AI 真正值得介入的位置。</p></div></article>,
  <article className="about-stack-panel tone-blue" key="design"><span>02 / DESIGN</span><div><h3>体验表达</h3><p>用信息架构、原型与交互，把复杂能力翻译成用户能理解的产品。</p></div></article>,
  <article className="about-stack-panel tone-light" key="evaluation"><span>03 / EVALUATION</span><div><h3>评测闭环</h3><p>通过失败样本、离线回归和发布门槛，让质量不再依赖主观感觉。</p></div></article>,
  <article className="about-stack-panel tone-dark" key="delivery"><span>04 / DELIVERY</span><div><h3>跨团队交付</h3><p>在研发、算法、业务和合规之间建立可以共同执行的产品规则。</p></div></article>,
];

const skills = [
  { label: "Agent 产品", background: "#111310", color: "#f5f5f2", x: 31, y: 28, width: 30, rotate: -3 },
  { label: "AIGC 工作流", background: "#c7ff3d", color: "#111310", x: 68, y: 30, width: 34, rotate: 3 },
  { label: "RAG / 知识库", background: "#f5f5f2", color: "#111310", x: 50, y: 50, width: 35, rotate: 2 },
  { label: "高级 UI/UX", background: "#dfe2df", color: "#111310", x: 31, y: 72, width: 31, rotate: 3 },
  { label: "商业化", background: "#111310", color: "#f5f5f2", x: 69, y: 71, width: 28, rotate: -3 },
];

export default function AboutPage() {
  return (
    <main className="secondary-page about-page">
      <section className="about-hero page-shell">
        <div>
          <span className="page-index">03 / ABOUT QINING</span>
          <h1>产品经理的判断力，<br />高级设计师的表达力。</h1>
          <p>我是祁宁，Miranda。拥有 9 年数字化产品与体验设计经验，近 3 年专注 AIGC 商业化、人格化 Agent 与企业级 AI 应用落地。</p>
          <dl className="about-contacts">
            <div><dt>PHONE</dt><dd><a href="tel:18586312570">185 8631 2570</a></dd></div>
            <div><dt>EMAIL</dt><dd><a href="mailto:yourandrea77@gmail.com">yourandrea77@gmail.com</a></dd></div>
            <div><dt>WECHAT</dt><dd>DJ_MIRANDA</dd></div>
          </dl>
        </div>
        <div className="about-stack-wrap">
          <ClickStack items={cards} cardWidth={340} cardHeight={430} spreadX={28} spreadY={-24} duration={0.46} borderRadius={8} visibleCount={4} cardColor="#f5f5f2" className="about-stack" />
        </div>
      </section>
      <section className="about-skills">
        <div className="page-shell about-skills-grid"><div><span className="page-index">CAPABILITY MAP</span><h2>擅长把复杂能力，<br />组织成清晰系统。</h2></div><ParallaxPills pills={skills} height={520} pillHeight={60} pillRadius={6} fontSize={16} parallaxStrength={8} disableEmptyPills /></div>
      </section>
      <Footer8 statement="有产品岗位、Agent 场景或复杂体验问题，欢迎直接联系我。" actionLabel="发送邮件" actionHref="mailto:yourandrea77@gmail.com" />
    </main>
  );
}
