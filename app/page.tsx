import Link from "next/link";
import { ArrowUpRight, Building2, BriefcaseBusiness, Layers3, UserRound } from "lucide-react";
import MetallicSwirl from "@/components/react-bits/metallic-swirl";
import ParallaxPills from "@/components/react-bits/parallax-pills";
import StaggeredText from "@/components/react-bits/staggered-text";
import { projects } from "@/lib/project-data";

const pills = [
  { label: "05 / AI 产品项目", background: "#3567f6", color: "#ffffff", x: 52, y: 25, width: 58, rotate: -1 },
  { label: "04 / 产品判断力", background: "#d7ff72", color: "#172033", x: 46, y: 39, width: 54, rotate: 1 },
  { label: "03 / 品味工程", background: "#ffffff", color: "#172033", x: 55, y: 53, width: 50, rotate: -1 },
  { label: "02 / 关于七七", background: "#dce7ff", color: "#172033", x: 48, y: 67, width: 52, rotate: 1 },
  { label: "01 / 联系方式", background: "#172033", color: "#ffffff", x: 54, y: 81, width: 48, rotate: -1 },
];

export default function Home() {
  return (
    <main className="home-page">
      <section className="portfolio-mast" aria-labelledby="hero-title">
        <div className="mast-metal" aria-hidden="true">
          <MetallicSwirl
            width="100%"
            height="100%"
            speed={0.42}
            zoom={5.4}
            backgroundColor="#edf3ff"
            brightness={0.86}
            colorRange={0.54}
            colorBias={0.56}
            opacity={0.48}
            cursorInteraction
            cursorIntensity={0.42}
          />
        </div>

        <div className="mast-grid-overlay" aria-hidden="true" />
        <div className="mast-inner">
          <div className="mast-copy-panel">
            <div className="mast-kicker">
              <span>77F / AI PRODUCT MANAGER</span>
              <span>LOBBY · OPEN TO WORK</span>
            </div>
            <p className="mast-name">七七 / MIRANDA · BUILDING DIRECTORY</p>
            <StaggeredText
              as="h1"
              text={"思 AI 所不能，\n见 AI 之所能。"}
              segmentBy="words"
              className="portfolio-title"
              direction="bottom"
              delay={48}
              duration={0.84}
              blur
            />
            <p className="mast-english">Think what AI can&apos;t, build what AI can.</p>
            <p id="hero-title" className="mast-deck">把想象变成看得见的世界。9 年产品与高级 UI/UX 经验，用判断力定义问题，用设计与 AI 把答案交付。</p>
            <div className="taste-tags" aria-label="个人主张">
              <span>Taste / 产品判断力</span><span>Design engineer / 品味工程</span><span>判断力大于执行力</span>
            </div>
            <div className="mast-actions" aria-label="主要入口">
              <Link className="mast-action mast-action-primary" href="/projects">
                <BriefcaseBusiness />
                <span><strong>前往 05F · 项目</strong><small>5 个完整案例</small></span>
                <ArrowUpRight />
              </Link>
              <Link className="mast-action" href="/method">
                <Layers3 />
                <span><strong>前往 04F · 方法</strong><small>从问题到交付</small></span>
                <ArrowUpRight />
              </Link>
              <Link className="mast-action" href="/about">
                <UserRound />
                <span><strong>前往 02F · 关于</strong><small>经历与优势</small></span>
                <ArrowUpRight />
              </Link>
            </div>
          </div>

          <div className="mast-signature" aria-label="祁宁的 AI 产品能力地图">
            <div className="signature-index"><Building2 /><span>77F</span></div>
            <p className="signature-caption">AI 时代，TASTE 才是真正的生产力 · SELECT A FLOOR</p>
            <ParallaxPills
              pills={pills}
              width="100%"
              height="100%"
              pillHeight={58}
              pillRadius={6}
              fontSize={16}
              fontWeight={700}
              parallaxStrength={8}
              parallaxStiffness={160}
              parallaxDamping={26}
              disableEmptyPills
              entryDistance={130}
              entryDamping={17}
            />
          </div>
        </div>

        <div className="mast-contact-rail">
          <span>七七 · MIRANDA</span>
          <a href="tel:18586312570">185 8631 2570</a>
          <a href="mailto:yourandrea77@gmail.com">yourandrea77@gmail.com</a>
          <span>微信 · DJ_MIRANDA</span>
        </div>

        <div className="mast-project-rail" aria-label="项目快速入口">
          {projects.map((project) => (
            <Link key={project.slug} href={`/projects/${project.slug}`}>
              <span>{project.index}</span>
              <strong>{project.title.split("·")[0].trim()}</strong>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
