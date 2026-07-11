import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Layers3, Mail, MessageCircle, Phone, UserRound } from "lucide-react";
import HalftoneWave from "@/components/react-bits/halftone-wave";
import StaggeredText from "@/components/react-bits/staggered-text";
import About5 from "@/components/blocks/about-5";
import PortfolioAgent from "@/components/site/portfolio-agent";
import { projects } from "@/lib/project-data";

const toolsOne = [{name:"即梦",icon:"tool-logos/jimeng.ico"},{name:"可灵",icon:"tool-logos/kling.ico"},{name:"Cursor",icon:"tool-logos/cursor.svg"},{name:"Notion",icon:"tool-logos/notion.svg"},{name:"Cloudflare",icon:"tool-logos/cloudflare.svg"},{name:"Cloud Design",icon:"tool-logos/cloud-design.svg"},{name:"AI Studio",icon:"tool-logos/googlegemini.svg"},{name:"Runway",icon:"tool-logos/runway.svg"},{name:"See the Dance",icon:"tool-logos/seedance.svg"}];
const toolsTwo = [{name:"See the Dream",icon:"tool-logos/seedream.svg"},{name:"GPT-4o · Image 2.0",icon:"tool-logos/openai.svg"},{name:"Gemini",icon:"tool-logos/googlegemini.svg"},{name:"Lovart",icon:"tool-logos/lovart.ico"},{name:"GitHub",icon:"tool-logos/github.svg"},{name:"VS Code",icon:"tool-logos/vscode.svg"},{name:"Claude Code",icon:"tool-logos/anthropic.svg"},{name:"Codex",icon:"tool-logos/openai.svg"},{name:"Hermes",icon:"tool-logos/hermes.png"}];

export default function Home() {
  return (
    <main className="home-page">
      <section className="portfolio-mast" aria-labelledby="hero-title">
        <div className="mast-atmosphere" aria-hidden="true">
          <HalftoneWave
            width="100%"
            height="100%"
            speed={0.14}
            noiseScale={2.2}
            octaves={3}
            gridDensity={58}
            dotSize={0.42}
            softness={0.3}
            contrastMin={0.32}
            contrastMax={0.72}
            scrollX={0.025}
            scrollY={0.018}
            rotation={-8}
            colorA="#7d1713"
            colorB="#b9ec5c"
            backgroundColor="#080a08"
            opacity={0.68}
            cursorInteraction
          />
        </div>

        <div className="mast-grid-overlay" aria-hidden="true" />
        <div className="mast-inner">
          <div className="mast-copy-panel">
            <p className="mast-zone-label">IDEA 无限大厦 / 总控层</p>
            <p className="mast-name">祁宁 / MIRANDA · AI 商业化产品与体验系统</p>
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
            <p id="hero-title" className="mast-deck">把想象变成看得见的世界。3 年企业级 AIGC / Agent 商业化落地，把复杂能力组织成可运行的产品系统。</p>
            <div className="mast-actions" aria-label="主要入口">
              <Link className="mast-action mast-action-primary" href="/projects">
                <BriefcaseBusiness />
                <span><strong>项目展厅</strong><small>5 个完整案例</small></span>
                <ArrowUpRight />
              </Link>
              <Link className="mast-action" href="/method">
                <Layers3 />
                <span><strong>方法归纳</strong><small>从问题到可信交付</small></span>
                <ArrowUpRight />
              </Link>
              <Link className="mast-action" href="/about">
                <UserRound />
                <span><strong>主理人档案</strong><small>经历、判断与优势</small></span>
                <ArrowUpRight />
              </Link>
            </div>
          </div>

          <div className="mast-signature" aria-label="五个项目的核心成果">
            <div className="elevator-heading"><span>PROJECT ARCHIVE</span><strong>选择项目，了解过往实践</strong></div>
            <div className="project-elevator">
              {projects.map((project) => (
                <Link key={project.slug} href={`/projects/${project.slug}`} className="project-floor">
                  <span className="floor-no">{project.floor}</span>
                  <span className="floor-project"><strong>{project.slug === "enterprise-agent" ? project.title : project.title.split("·")[0].trim()}</strong></span>
                  <span className="floor-metric"><strong>{project.metric}{project.metricUnit ? <em>{project.metricUnit}</em> : null}</strong><small>{project.shortProof}</small></span>
                  <ArrowUpRight />
                </Link>
              ))}
            </div>
            <p className="signature-caption">不堆砌 AI 功能，建可运行的产品系统</p>
          </div>
        </div>

        <div className="mast-contact-rail">
          <span><UserRound />祁宁 <i>Miranda</i></span>
          <a href="tel:18586312570"><Phone />185 8631 2570</a>
          <a href="mailto:yourandrea77@gmail.com"><Mail />yourandrea77@gmail.com</a>
          <span><MessageCircle />DJ_MIRANDA</span>
        </div>
        <aside className="home-toolbelt">
          <div className="toolbelt-handle"><span>TOOLBELT · 真实工作流工具</span><strong>持续运行</strong></div>
          <About5 rowOne={toolsOne} rowTwo={toolsTwo} />
        </aside>
      </section>
      <PortfolioAgent />
    </main>
  );
}
