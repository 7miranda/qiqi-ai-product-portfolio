import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import Footer8 from "@/components/blocks/footer-8";
import { enterpriseModules, getEnterpriseModule } from "@/lib/enterprise-agent-modules";

const labUrl = "/projects/enterprise-agent/trace-lab/#trace";

export function generateStaticParams() {
  return enterpriseModules.map((item) => ({ module: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const item = getEnterpriseModule((await params).module);
  return { title: item ? `${item.title} · 招商银行 AI 经营助手` : "招商银行 AI 经营助手" };
}

export default async function EnterpriseModulePage({ params }: { params: Promise<{ module: string }> }) {
  const item = getEnterpriseModule((await params).module);
  if (!item) notFound();
  const related = item.related.map(getEnterpriseModule).filter(Boolean);

  return (
    <main className="secondary-page enterprise-module-page">
      <section className="enterprise-module-hero">
        <div className="page-shell">
          <div className="enterprise-module-breadcrumb"><Link href="/projects/enterprise-agent/"><ArrowLeft /> 返回项目全景</Link><span>{item.index} / 06</span></div>
          <span className="enterprise-module-eyebrow">{item.eyebrow}</span>
          <h1>{item.titleLines[0]}<br />{item.titleLines[1]}</h1>
          <p>{item.thesis}</p>
          <div className="enterprise-module-flow">{item.flow.map((step, index) => <div key={step}><span>0{index + 1}</span><strong>{step}</strong>{index < item.flow.length - 1 ? <ArrowRight /> : null}</div>)}</div>
        </div>
      </section>

      <section className="enterprise-module-section enterprise-module-problem"><div className="page-shell enterprise-module-split"><span>01 / 问题与判断</span><div><h2>为什么要这样设计</h2><p>{item.problem}</p></div></div></section>

      <section className="enterprise-module-section"><div className="page-shell enterprise-module-split"><span>02 / AI PM OWNERSHIP</span><div><h2>我在这个模块里具体做了什么</h2><p>{item.pmRole}</p><div className="enterprise-module-decisions">{item.decisions.map((decision, index) => <article key={decision.title}><span>0{index + 1}</span><h3>{decision.title}</h3><p>{decision.body}</p></article>)}</div></div></div></section>

      <section className="enterprise-module-section enterprise-module-assets"><div className="page-shell"><header><span>03 / DELIVERABLES</span><h2>交付物与验收证据</h2></header><div className="enterprise-module-asset-grid"><div><strong>我交付的产品资产</strong>{item.deliverables.map(value => <p key={value}><ArrowRight />{value}</p>)}</div><div><strong>可以被验证的结果</strong>{item.evidence.map(value => <p key={value}><CheckCircle2 />{value}</p>)}</div></div></div></section>

      {item.hasTraceLab ? <section className="enterprise-module-lab"><div className="page-shell enterprise-module-lab-grid"><div><span>INTERNAL SUBPROJECT / TRACE LAB</span><h2>进入招行评测回归与 Bad Case 实验页</h2><p>继续在招商银行项目内部查看完整 Trace、召回片段、版本过滤、Chunk 策略和修复前后对比。</p></div><Link href={labUrl}>打开招行 Trace 实验页 <ArrowUpRight /></Link></div></section> : null}

      <section className="enterprise-module-related"><div className="page-shell"><span>RELATED MODULES / 关联模块</span><div>{related.map(module => module ? <Link key={module.slug} href={`/projects/enterprise-agent/${module.slug}/`}><small>{module.index}</small><strong>{module.title}</strong><ArrowUpRight /></Link> : null)}</div></div></section>
      <Footer8 compact statement="返回项目全景，继续查看招行 AI 经营助手的完整交付链路。" actionLabel="返回项目全景" actionHref="/projects/enterprise-agent/" />
    </main>
  );
}
