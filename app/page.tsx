import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Layers3, Mail, MessageCircle, Phone, UserRound } from "lucide-react";
import HalftoneWave from "@/components/react-bits/halftone-wave";
import StaggeredText from "@/components/react-bits/staggered-text";
import About5 from "@/components/blocks/about-5";
import PortfolioAgent from "@/components/site/portfolio-agent";
import ProjectElevator from "@/components/site/project-elevator";

const toolsOne = [
  { name: "ChatGPT", icon: "tool-logos/openai.svg" },
  { name: "Claude", icon: "tool-logos/claude.svg" },
  { name: "Claude Code", icon: "tool-logos/claude-code.svg" },
  { name: "Gemini", icon: "tool-logos/gemini-color.svg" },
  { name: "DeepSeek", icon: "tool-logos/deepseek-color.svg" },
  { name: "Qwen", icon: "tool-logos/qwen-color.svg" },
  { name: "Kimi", icon: "tool-logos/kimi.svg" },
  { name: "豆包", icon: "tool-logos/doubao-official.png" },
  { name: "Cursor", icon: "tool-logos/cursor-official.svg" },
  { name: "Notion", icon: "tool-logos/notion-official.svg" },
];
const toolsTwo = [
  { name: "Seedream 5.0 Pro", icon: "tool-logos/bytedance-seed.ico" },
  { name: "Seedance 2.0", icon: "tool-logos/bytedance-seed.ico" },
  { name: "即梦 Dreamina", icon: "tool-logos/jimeng-color.svg" },
  { name: "可灵 Kling AI", icon: "tool-logos/kling-color.svg" },
  { name: "Sora", icon: "tool-logos/sora-color.svg" },
  { name: "Nano Banana", icon: "tool-logos/nano-banana-color.svg" },
  { name: "Midjourney", icon: "tool-logos/midjourney.svg" },
  { name: "Runway", icon: "tool-logos/runway.svg" },
  { name: "ComfyUI", icon: "tool-logos/comfyui.svg" },
  { name: "CapCut", icon: "tool-logos/capcut.svg" },
  { name: "Lovart", icon: "tool-logos/lovart.svg" },
  { name: "Cloudflare", icon: "tool-logos/cloudflare-color.svg" },
  { name: "Coze", icon: "tool-logos/coze.svg" },
];

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
            <p className="mast-name">祁宁 / MIRANDA · 6 年高级 UI/UX × AI 商业化产品</p>
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
            <p id="hero-title" className="mast-deck">把想象变成看得见的产品。9 年多端复杂业务产品经验，近 3 年聚焦 AIGC 商业化与企业级 AI 应用落地。</p>
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
            <div className="elevator-heading"><span>PROJECT ARCHIVE</span><strong>选择项目了解过往实践</strong></div>
            <ProjectElevator />
            <p className="signature-caption">Prompt to Product, Automate the Rest</p>
          </div>
        </div>

        <div className="mast-contact-rail">
          <span><UserRound />祁宁 <i>Miranda</i></span>
          <a href="tel:18586312570"><Phone />185 8631 2570</a>
          <a href="mailto:yourandrea77@gmail.com"><Mail />yourandrea77@gmail.com</a>
          <span><MessageCircle />DJ_MIRANDA</span>
        </div>
        <aside className="home-toolbelt">
          <div className="toolbelt-handle"><span>AI OPERATOR TOOLBELT</span><strong>AI 操盘手的时代：测试、迭代，让一切自动化</strong><em>TEST → ITERATE → SEE → AUTOMATE</em></div>
          <About5 rowOne={toolsOne} rowTwo={toolsTwo} />
        </aside>
      </section>
      <PortfolioAgent />
    </main>
  );
}
