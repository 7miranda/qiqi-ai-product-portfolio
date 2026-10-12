import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import RadialLiquid from "@/components/react-bits/radial-liquid";
import StaggeredText from "@/components/react-bits/staggered-text";
import Footer8 from "@/components/blocks/footer-8";
import type { InsightArticle } from "@/lib/october-insights";

export default function InsightArticlePage({ article }: { article: InsightArticle }) {
  const displayDate = article.date.replaceAll("-", ".");

  return (
    <main className="secondary-page insight-page">
      <article>
        <header className="insight-hero">
          <div className="insight-hero-liquid" aria-hidden="true">
            <RadialLiquid
              width="100%"
              height="100%"
              speed={0.34}
              color1="#caff52"
              color2="#273314"
              color3="#0c0f09"
              backgroundColor="#070806"
              iterations={4}
              position="right"
              overallOpacity={0.86}
              scale={1.06}
              quality="medium"
              enableCursorInteraction
            />
          </div>
          <div className="insight-hero-scrim" aria-hidden="true" />
          <div className="page-shell insight-hero-inner">
            <div className="insight-kicker">
              <Link className="insight-back-link" href="/insights">
                最新资讯 / PRODUCT NOTES {article.number}
              </Link>
              <time dateTime={article.date}>{displayDate}</time>
            </div>
            <StaggeredText
              as="h1"
              text={article.desktopTitle}
              segmentBy="lines"
              className="insight-title insight-title-desktop"
              direction="bottom"
              delay={38}
              duration={0.78}
              blur
            />
            <StaggeredText
              as="h1"
              text={article.mobileTitle}
              segmentBy="lines"
              className="insight-title insight-title-mobile"
              direction="bottom"
              delay={34}
              duration={0.72}
              blur
            />
            <div className="insight-hero-bottom">
              <p>{article.summary}</p>
              <div><span>作者</span><strong>祁宁 Miranda</strong><small>AI 商业化产品经理</small></div>
            </div>
          </div>
        </header>

        <div className="page-shell insight-layout">
          <aside className="insight-rail" aria-label="文章目录">
            <span>READING MAP</span>
            {article.sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                {String(index + 1).padStart(2, "0")} / {section.title}
              </a>
            ))}
            <a href="#sources">资料来源</a>
          </aside>

          <div className="insight-body">
            <div className="insight-lead">
              <span className="insight-section-no">CORE JUDGMENT</span>
              <p className="insight-opening">{article.opening}</p>
            </div>
            {article.sections.map((section, index) => (
              <section key={section.id} id={section.id} className="insight-section">
                <span className="insight-section-no">
                  {String(index + 1).padStart(2, "0")} / PRODUCT ANALYSIS
                </span>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
            <div className="insight-conclusion"><span>PRODUCT TAKE</span><p>{article.takeaway}</p></div>
            <section id="sources" className="insight-sources" aria-labelledby="source-title">
              <span className="insight-section-no">SOURCES / PUBLIC MATERIALS</span>
              <h2 id="source-title">资料来源</h2>
              {article.sources.map((source) => (
                <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
                  <span>{source.title}</span><ArrowUpRight aria-hidden="true" />
                </a>
              ))}
              <p>本文基于 {displayDate} 及此前公开资料。案例与示例数字仅用于说明方法，不对应真实企业。</p>
            </section>
          </div>
        </div>
      </article>

      <Footer8
        dense
        statement="把任务说清楚，让结果可验证。"
        actionLabel="阅读更多文章"
        actionHref="/insights"
        copyright="© 2026 QI NING / AI PRODUCT NOTES"
      />
    </main>
  );
}
