import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import BlurHighlight from "@/components/react-bits/blur-highlight";
import Footer8 from "@/components/blocks/footer-8";
import { projects } from "@/lib/project-data";

export const metadata: Metadata = { title: "项目案例" };

export default function ProjectsPage() {
  return (
    <main className="secondary-page projects-page">
      <section className="secondary-hero">
        <div className="page-shell secondary-hero-grid">
          <span className="page-index">01 / SELECTED WORK</span>
          <div>
            <h1>不是功能清单，<br />是产品判断的证据。</h1>
            <BlurHighlight
              highlightedBits={["连续的产品能力演进线"]}
              highlightColor="#c7ff3d"
              blurAmount={6}
              inactiveOpacity={0.26}
              highlightDelay={0.35}
              highlightDuration={0.8}
            >
              <p className="secondary-highlight">从数据结构、内容产线、人格信任到企业级可信执行，五个项目构成一条连续的产品能力演进线。</p>
            </BlurHighlight>
          </div>
        </div>
      </section>

      <section className="project-directory page-shell" aria-label="全部项目">
        {projects.map((project) => (
          <Link className="project-directory-row" href={`/projects/${project.slug}`} key={project.slug}>
            <span className="project-no">{project.index}</span>
            <div className="project-title-block">
              <span>{project.category}</span>
              <h2>{project.title}</h2>
            </div>
            <p>{project.summary}</p>
            <div className="project-evidence">
              <strong>{project.metric}</strong>
              <span>{project.metricLabel}</span>
            </div>
            <ArrowUpRight />
            <i style={{ background: project.accent }} aria-hidden="true" />
          </Link>
        ))}
      </section>
      <Footer8
        statement="复杂能力需要被组织成清晰的产品判断，才有机会真正进入业务。"
        actionLabel="联系祁宁"
        actionHref="mailto:yourandrea77@gmail.com"
      />
    </main>
  );
}
