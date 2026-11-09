import Link from "next/link";
import { ArrowUpRight, Download } from "lucide-react";
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
            {article.download && <a href="#skill-download">下载配套 Skill</a>}
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
                {section.prompt && <pre className="insight-prompt" aria-label="可复制操作指令"><code>{section.prompt}</code></pre>}
              </section>
            ))}
            <div className="insight-conclusion"><span>PRODUCT TAKE</span><p>{article.takeaway}</p></div>
            {article.download && (
              <section id="skill-download" className="insight-download" aria-labelledby="skill-download-title">
                <span className="insight-section-no">TAKE IT TO WORK / SKILL DOWNLOAD</span>
                <h2 id="skill-download-title">{article.download.title}</h2>
                <p>{article.download.description}</p>
                <ol className="insight-download-steps">
                  <li><strong>下载文件</strong><span>先保存下方的 AES 加密 ZIP 包。</span></li>
                  <li><strong>领取密码</strong><span>抖音关注 {article.download.douyinHandle}，私信“{article.download.messageKeyword}”，由我回复解压密码。</span></li>
                  <li><strong>解压使用</strong><span>收到密码后，用支持 AES 加密 ZIP 的软件解压，按包内说明调用 Skill。</span></li>
                </ol>
                <div className="insight-download-actions">
                  <a className="insight-download-primary" href={article.download.href} download={article.download.fileName}>
                    下载加密 Skill ZIP<Download aria-hidden="true" />
                  </a>
                  <a className="insight-download-secondary" href={article.download.douyinUrl} target="_blank" rel="noopener noreferrer">
                    打开抖音主页<ArrowUpRight aria-hidden="true" />
                  </a>
                </div>
                <p className="insight-download-account">抖音号：<strong>{article.download.douyinHandle}</strong> · 私信关键词：<strong>{article.download.messageKeyword}</strong></p>
                <dl className="insight-download-meta">
                  <div><dt>文件</dt><dd>{article.download.fileName}</dd></div>
                  <div><dt>版本 / 大小</dt><dd>{article.download.version} / {article.download.sizeLabel}</dd></div>
                  <div><dt>SHA-256</dt><dd><code>{article.download.sha256}</code></dd></div>
                </dl>
                <p className="insight-download-note">文章可直接阅读。解压密码由抖音私信人工提供，本页不核验关注状态，也不会自动发送私信。</p>
              </section>
            )}
            <section id="sources" className="insight-sources" aria-labelledby="source-title">
              <span className="insight-section-no">SOURCES / {article.sourceNote ? "PROJECT NOTES" : "PUBLIC MATERIALS"}</span>
              <h2 id="source-title">资料来源</h2>
              {article.sources.map((source) => (
                <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
                  <span>{source.title}</span><ArrowUpRight aria-hidden="true" />
                </a>
              ))}
              <p>{article.sourceNote ?? `本文基于 ${displayDate} 及此前公开资料。案例与示例数字仅用于说明方法，不对应真实企业。`}</p>
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
