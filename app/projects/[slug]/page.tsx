import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import AnimatedList, { type AnimatedListItem } from "@/components/react-bits/animated-list";
import StaggeredText from "@/components/react-bits/staggered-text";
import Footer8 from "@/components/blocks/footer-8";
import ClickStack from "@/components/react-bits/click-stack";
import { getProject, projects } from "@/lib/project-data";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = getProject((await params).slug);
  return { title: project?.title ?? "项目案例" };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  const currentIndex = projects.findIndex((item) => item.slug === project.slug);
  const next = projects[(currentIndex + 1) % projects.length];
  const approachItems: AnimatedListItem[] = project.approach.map((item, index) => ({
    id: `${project.slug}-${index}`,
    content: (
      <article className="approach-item">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div><h3>{item.title}</h3><p>{item.body}</p></div>
      </article>
    ),
  }));
  const personaWorkflows = [
    { index: "01", title: "人格诊断工作流", body: "从问题识别进入人格化判断、行动建议与阶段任务。", image: "evolution-blueprint.jpg" },
    { index: "02", title: "内容转化工作流", body: "把人格表达、信任建立与商业承接组织在一条链路里。", image: "agent-entry-matrix.jpg" },
    { index: "03", title: "五阶段成长引擎", body: "按用户阶段调度知识、任务和媒介，不停留在一次性回答。", image: "agent-conversation.png" },
    { index: "04", title: "扣子工作流后台", body: "承载工作流配置、知识资产、质量评测与数据回流。", image: "product-cases/ruthless.jpg" },
  ];
  const productCases = [
    { title: "天道造命论", image: "tiandao.jpg", href: "https://stardime.ai/products/tiandao-life-design" },
    { title: "狠人进化论", image: "ruthless.jpg", href: "https://stardime.ai/products/ruthless-evolution" },
    { title: "野心家博弈心法", image: "ambition.jpg", href: "https://stardime.ai/products/ambition-game" },
    { title: "EvoMind 进化蓝图", image: "evomind.jpg", href: "https://stardime.ai/products/evomind-hua-tu" },
    { title: "聪明脑子 101", image: "smart-brain.jpg", href: "https://stardime.ai/products/smart-brain-101" },
  ];
  const systemAssets = [
    ["BUSINESS MODEL", "业务目标与价值规则"],
    ["KNOWLEDGE BASE", "领域知识与案例资产"],
    ["INTERACTION FLOW", "任务路径与异常状态"],
    ["DESIGN TOKEN", "信息、组件与多端规范"],
    ["QA GATE", "评测样本与发布门槛"],
    ["AGENT SKILL", "可调用的原子能力"],
  ];

  return (
    <main className="secondary-page project-detail">
      <section className="project-cover" style={{ "--project-accent": project.accent } as CSSProperties}>
        <div className="project-cover-grid" aria-hidden="true" />
        <div className="page-shell project-cover-inner">
          <div className="project-breadcrumb">
            <Link href="/projects"><ArrowLeft /> 返回全部项目</Link>
            <span>{project.index} / 05</span>
          </div>
          <div className="project-cover-focus">
            <div className="project-cover-title">
              <span>{project.category}</span>
              <StaggeredText as="h1" text={project.title} segmentBy="words" direction="bottom" delay={45} duration={0.78} blur />
              <p>{project.summary}</p>
              {project.slug === "bingo-coze" ? <a className="project-live-link" href="https://stardime.ai/" target="_blank" rel="noreferrer">进入 Bingo AI 内容系统 <ArrowUpRight /></a> : null}
            </div>
            <div className="project-cover-proof">
              <span>CORE EVIDENCE</span><strong>{project.metric}{project.metricUnit ? <em>{project.metricUnit}</em> : null}</strong><small>{project.metricExplanation}</small>
              <p>{project.thesis}</p>
            </div>
          </div>
          <div className="project-cover-meta">
            <div><span>ROLE</span><strong>{project.role}</strong></div>
            <div><span>TIME</span><strong>{project.timeframe}</strong></div>
            <div className="cover-evidence"><span>PROJECT SCALE</span><strong>{project.facts[0]}</strong><small>{project.facts.slice(1, 3).join(" · ")}</small></div>
          </div>
        </div>
      </section>

      <section className="project-thesis page-shell">
        <span>PRODUCT THESIS</span>
        <h2>{project.thesis}</h2>
        <div className="fact-row">{project.facts.map((fact) => <span key={fact}>{fact}</span>)}</div>
      </section>

      <section className="project-system-layer">
        <div className="page-shell system-layer-head"><span className="case-index">SYSTEM ASSETS / 产品化资产层</span><h2>不止交付功能，<br />同时建立可复用的规则。</h2><p>把一次项目中的判断沉淀为知识、规范、组件、评测与 Agent 能力，让后续迭代不再从零开始。</p></div>
        <div className="page-shell system-asset-grid">{systemAssets.map(([name, description], index) => <article key={name} className={index === 0 || index === 3 ? "is-key" : ""}><span>0{index + 1}</span><h3>{name}</h3><p>{description}</p></article>)}</div>
      </section>

      {project.slug === "persona-agent" ? (
        <><section className="workflow-showroom">
          <div className="page-shell workflow-showroom-grid">
            <div className="workflow-showroom-copy">
              <span className="case-index">WORKFLOW SHOWROOM / LIVE SYSTEM</span>
              <h2>这不是一个聊天机器人，<br />而是一组持续运行的商业工作流。</h2>
              <p>选择一张工作流卡片，查看它如何把人格一致性、内容生产、成长阶段和转化动作连接起来。前三项可进入现有体验网站；最后一项为扣子自研后台保留正式图片展位。</p>
              <a className="workflow-live-link" href="https://sandbox-n0qp33ght-m2pzbvsv29-bots-projects.vercel.app/" target="_blank" rel="noreferrer">进入狠人工作流网站 <ArrowUpRight /></a>
            </div>
            <div className="workflow-stack-wrap">
              <ClickStack
                items={personaWorkflows.map(({ index, title, body, image }) => (
                  <article className="workflow-exhibit" key={title}>
                    <div className="workflow-exhibit-visual"><img src={`../../images/persona-agent/${image}`} alt={`${title}界面`} /><span>{index}</span><strong>LIVE WORKFLOW</strong></div>
                    <div className="workflow-exhibit-copy"><small>狠人思维模型 / {index}</small><h3>{title}</h3><p>{body}</p><a href="https://sandbox-n0qp33ght-m2pzbvsv29-bots-projects.vercel.app/" target="_blank" rel="noreferrer">打开工作流 <ArrowUpRight /></a></div>
                  </article>
                ))}
                cardWidth={520}
                cardHeight={500}
                spreadX={34}
                spreadY={-26}
                duration={0.48}
                borderRadius={4}
                visibleCount={4}
                cardColor="#11130f"
                className="workflow-stack"
              />
            </div>
          </div>
        </section>
        <section className="persona-system page-shell">
          <header className="persona-system-head"><span className="case-index">PRODUCT SYSTEM / 我参与的完整链路</span><h2>从人格内容到产品承接，<br />把五个阶段做成一套可运行系统。</h2><p>星辰维度的公开产品结构包含行动路线、工作流、提示词、课程资料与产品入口。狠人智能体承担其中的人格化承接层，把用户从内容触达带入持续行动与商业转化。</p></header>
          <div className="persona-stage-row">
            {["01 认知觉醒","02 掌握底层规律","03 构建高维武器","04 主宰价值博弈","05 建立个人帝国"].map((stage) => <span key={stage}>{stage}</span>)}
          </div>
          <div className="persona-proof-grid">
            <article><img src="../../images/persona-agent/evolution-blueprint.jpg" alt="狠人进化蓝图的五阶段内容架构" /><div><span>01 / 体系设计</span><h3>五阶段成长蓝图</h3><p>将零散内容整理成从认知到行动、再到价值与商业结果的递进路径。</p><strong>我负责：阶段体系、信息架构、内容与产品承接关系。</strong></div></article>
            <article><img src="../../images/persona-agent/agent-entry-matrix.jpg" alt="多个狠人智能体与阶段入口" /><div><span>02 / 入口矩阵</span><h3>智能体与阶段入口</h3><p>不同二维码入口对应不同阶段任务，让用户不是“随便聊”，而是进入明确的问题场景。</p><strong>我负责：Agent 矩阵规划、入口策略、场景与知识模块映射。</strong></div></article>
            <article><img src="../../images/persona-agent/agent-conversation.png" alt="狠人智能体输出行动任务的对话界面" /><div><span>03 / 交付体验</span><h3>人格化回答与行动任务</h3><p>回答同时包含判断、问题拆解和限时行动，把内容消费转化成下一步执行。</p><strong>我负责：人格一致性、回答结构、行动钩子、评测与反馈闭环。</strong></div></article>
          </div>
          <div className="stardime-flow"><span>用户目标</span><i>→</i><span>行动路线</span><i>→</i><span>工作流 / Prompt</span><i>→</i><span>狠人 Agent</span><i>→</i><span>产品承接与复盘</span></div>
        </section></>
      ) : null}

      {project.slug === "persona-agent" ? (
        <section className="product-case-library">
          <div className="page-shell product-case-head"><span className="case-index">PRODUCT CASE LIBRARY / 产品案例库</span><h2>一款爆品，一套素材，<br />一组工作流</h2><p>案例库不是作品陈列，而是经过市场验证的选题、素材与生产路径。每个产品案例都能回到对应的工作流继续复用。</p></div>
          <div className="page-shell product-case-grid">{productCases.map((item, index) => <a key={item.title} href={item.href} target="_blank" rel="noreferrer"><img src={`../../images/persona-agent/product-cases/${item.image}`} alt={`${item.title}产品封面`} /><span>0{index + 1}</span><strong>{item.title}</strong><ArrowUpRight /></a>)}</div>
        </section>
      ) : null}

      <section className="case-section case-problem">
        <div className="page-shell case-grid">
          <div><h2>先找到结构性矛盾，<br />再决定产品形态。</h2><p>{project.problem}</p></div>
          <span className="case-index">01 / 问题</span>
        </div>
      </section>

      <section className="case-section page-shell">
        <div className="case-grid">
          <div>
            <h2>把复杂能力拆成<br />可交付的产品模块。</h2>
            <AnimatedList
              items={approachItems}
              autoAddDelay={0}
              maxItems={approachItems.length}
              startFrom="top"
              animationType="fade"
              enterFrom="top"
              pauseOnHover={false}
              hoverEffect="none"
              clickEffect="none"
              fadeEdges={false}
              height={`${Math.max(340, approachItems.length * 116)}px`}
              itemGap={10}
              className="approach-list"
              itemClassName="approach-list-item"
              contentClassName="approach-list-content"
              animateInitial={false}
            />
          </div>
          <span className="case-index">02 / 方案</span>
        </div>
      </section>

      <section className="case-section decision-band">
        <div className="page-shell case-grid">
          <span className="case-index">03 / 决策</span>
          <div className="decision-items">
            <h2>三个真正改变结果的决定。</h2>
            {project.decisions.map((decision, index) => (
              <article key={decision.title}><span>0{index + 1}</span><div><h3>{decision.title}</h3><p>{decision.body}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      <section className="case-section page-shell outcome-section">
        <div className="case-grid">
          <span className="case-index">04 / 结果</span>
          <div><h2>结果与可复用资产。</h2><div className="outcome-grid">{project.outcomes.map((outcome) => <div key={outcome}><CheckCircle2 /><span>{outcome}</span></div>)}</div></div>
        </div>
      </section>

      <section className="case-section reflection-section">
        <div className="page-shell case-grid">
          <span className="case-index">05 / 复盘</span>
          <div><h2>如果重来，会更早做什么。</h2><ol>{project.reflection.map((item) => <li key={item}>{item}</li>)}</ol><div className="next-note"><span>NEXT</span><p>{project.next}</p></div></div>
        </div>
      </section>

      <Link className="next-project" href={`/projects/${next.slug}`}>
        <span>下一个项目</span><strong>{next.title}</strong><ArrowUpRight />
      </Link>
      <Footer8 compact statement="想继续追问项目中的取舍、评测或协作细节？" actionLabel="联系主理人" actionHref="#contact" />
    </main>
  );
}
