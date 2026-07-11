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
    ["01", "人格诊断工作流", "从问题识别进入人格化建议与行动路径。"],
    ["02", "内容转化工作流", "把人格表达、信任建立与商业承接放在一条链路里。"],
    ["03", "五阶段成长引擎", "按用户阶段调度知识、任务和媒介，而不是一次性回答。"],
    ["04", "扣子自研后台", "为工作流配置、质量评测与数据回流预留后台截图位。"],
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
            </div>
            <div className="project-cover-proof">
              <span>CORE EVIDENCE</span><strong>{project.metric}</strong><small>{project.metricLabel}</small>
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

      {project.slug === "persona-agent" ? (
        <section className="workflow-showroom">
          <div className="page-shell workflow-showroom-grid">
            <div className="workflow-showroom-copy">
              <span className="case-index">WORKFLOW SHOWROOM / 04F</span>
              <h2>这不是一个聊天机器人，<br />而是一组持续运行的商业工作流。</h2>
              <p>选择一张工作流卡片，查看它如何把人格一致性、内容生产、成长阶段和转化动作连接起来。前三项可进入现有体验网站；最后一项为扣子自研后台保留正式图片展位。</p>
              <a className="workflow-live-link" href="https://sandbox-n0qp33ght-m2pzbvsv29-bots-projects.vercel.app/" target="_blank" rel="noreferrer">进入狠人工作流网站 <ArrowUpRight /></a>
            </div>
            <div className="workflow-stack-wrap">
              <ClickStack
                items={personaWorkflows.map(([index, title, body], itemIndex) => (
                  <article className="workflow-exhibit" key={title}>
                    <div className="workflow-exhibit-visual"><span>{index}</span><strong>{itemIndex === 3 ? "BACKSTAGE IMAGE SLOT" : "LIVE WORKFLOW"}</strong></div>
                    <div className="workflow-exhibit-copy"><small>狠人思维模型 / {index}</small><h3>{title}</h3><p>{body}</p>{itemIndex === 3 ? <span>等待替换后台截图</span> : <a href="https://sandbox-n0qp33ght-m2pzbvsv29-bots-projects.vercel.app/" target="_blank" rel="noreferrer">打开工作流 <ArrowUpRight /></a>}</div>
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
      ) : null}

      <section className="case-section case-problem">
        <div className="page-shell case-grid">
          <span className="case-index">01 / 问题</span>
          <div><h2>先找到结构性矛盾，<br />再决定产品形态。</h2><p>{project.problem}</p></div>
        </div>
      </section>

      <section className="case-section page-shell">
        <div className="case-grid">
          <span className="case-index">02 / 方案</span>
          <div>
            <h2>把复杂能力拆成<br />可交付的产品模块。</h2>
            <AnimatedList
              items={approachItems}
              autoAddDelay={0}
              maxItems={approachItems.length}
              startFrom="top"
              animationType="blur"
              enterFrom="bottom"
              pauseOnHover
              hoverEffect="none"
              clickEffect="none"
              fadeEdges={false}
              height={`${Math.max(420, approachItems.length * 150)}px`}
              itemGap={10}
              className="approach-list"
              itemClassName="approach-list-item"
              contentClassName="approach-list-content"
              animateInitial
              initialStagger={0.08}
            />
          </div>
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
      <Footer8 statement="想继续追问项目中的取舍、评测或协作细节？" actionLabel="发送邮件" actionHref="mailto:yourandrea77@gmail.com" />
    </main>
  );
}
