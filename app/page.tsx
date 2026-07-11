import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Languages, Layers3, Mail, MessageCircle, Phone, UserRound } from "lucide-react";
import { RadialLiquid } from "@/components/react-bits/radial-liquid";
import StaggeredText from "@/components/react-bits/staggered-text";
import About5 from "@/components/blocks/about-5";
import PortfolioAgent from "@/components/site/portfolio-agent";
import { projects } from "@/lib/project-data";

const toolsOne = [{name:"Claude",icon:"tool-logos/anthropic.svg"},{name:"Gemini",icon:"tool-logos/googlegemini.svg"},{name:"Cursor",icon:"tool-logos/cursor.svg"},{name:"Figma",icon:"tool-logos/figma.svg"},{name:"Notion",icon:"tool-logos/notion.svg"},{name:"Cloudflare",icon:"tool-logos/cloudflare.svg"}];
const toolsTwo = [{name:"GitHub",icon:"tool-logos/github.svg"},{name:"Vercel",icon:"tool-logos/vercel.svg"},{name:"n8n",icon:"tool-logos/n8n.svg"},{name:"Claude Code",icon:"tool-logos/anthropic.svg"},{name:"AI Studio",icon:"tool-logos/googlegemini.svg"},{name:"Cursor",icon:"tool-logos/cursor.svg"}];

export default function Home() {
  return (
    <main className="home-page">
      <section className="portfolio-mast" aria-labelledby="hero-title">
        <div className="mast-fluid" aria-hidden="true">
          <RadialLiquid
            width="100%"
            height="100%"
            speed={0.22}
            color1="#d8ff62"
            color2="#78f5ad"
            color3="#244538"
            backgroundColor="#08090a"
            iterations={3}
            position="right"
            overallOpacity={0.72}
            waveSize={2.2}
            edgeSoftness={0.48}
            scale={1.32}
            distortionType="plasma"
            distortionScale={0.5}
            chromaShift={0.04}
            enableCursorInteraction
            refractionStrength={1.4}
            fresnelIntensity={0.32}
            edgeHighlight={0.38}
          />
        </div>

        <div className="mast-grid-overlay" aria-hidden="true" />
        <div className="mast-inner">
          <div className="mast-copy-panel">
            <div className="mast-kicker">
              <span>IDEA 大厦 / 总控层</span>
              <span>OPEN FOR AI COMMERCIALIZATION</span>
            </div>
            <p className="mast-name">祁宁 / MIRANDA · AI 商业化与体验系统主理人</p>
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
            <p id="hero-title" className="mast-deck">把想象变成看得见的世界。3 年企业级 AIGC / Agent 商业化操盘落地，覆盖大模型应用产品化、AIGC 工具增长与行业 AI 解决方案。</p>
            <div className="taste-tags" aria-label="个人主张">
              <span>判断先于生成</span><span>系统放大想象</span><span>体验承接商业价值</span>
            </div>
            <div className="mast-actions" aria-label="主要入口">
              <Link className="mast-action mast-action-primary" href="/projects">
                <BriefcaseBusiness />
                <span><strong>项目</strong><small>05F · 5 个完整案例</small></span>
                <ArrowUpRight />
              </Link>
              <Link className="mast-action" href="/method">
                <Layers3 />
                <span><strong>方法</strong><small>04F · 从问题到交付</small></span>
                <ArrowUpRight />
              </Link>
              <Link className="mast-action" href="/about">
                <UserRound />
                <span><strong>关于祁宁</strong><small>02F · 经历与优势</small></span>
                <ArrowUpRight />
              </Link>
            </div>
          </div>

          <div className="mast-signature" aria-label="五个项目的核心成果">
            <div className="elevator-heading"><span>PROJECT ELEVATOR</span><strong>选择楼层，查看证据</strong></div>
            <div className="project-elevator">
              {projects.map((project) => (
                <Link key={project.slug} href={`/projects/${project.slug}`} className="project-floor">
                  <span className="floor-no">{String(6 - Number(project.index)).padStart(2, "0")}F</span>
                  <span className="floor-project"><strong>{project.title.split("·")[0].trim()}</strong><small>{project.thesis}</small></span>
                  <span className="floor-metric"><strong>{project.metric}</strong><small>{project.metricLabel}</small></span>
                  <ArrowUpRight />
                </Link>
              ))}
            </div>
            <p className="signature-caption">不堆砌 AI 功能，建可运行的产品系统</p>
          </div>
        </div>

        <div className="mast-contact-rail">
          <span><UserRound />祁宁</span>
          <span><Languages />Miranda</span>
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
