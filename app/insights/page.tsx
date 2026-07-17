import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import AnimatedList from "@/components/react-bits/animated-list";
import StaggeredText from "@/components/react-bits/staggered-text";
import Footer8 from "@/components/blocks/footer-8";

export const metadata: Metadata = {
  title: "最新资讯",
  description: "从 AI 产品经理视角，持续记录模型更新、产品变化与行业判断。",
};

const articles = [
  {
    slug: "kimi-k3",
    number: "001",
    date: "2026.07.17",
    dateTime: "2026-07-17",
    category: "模型观察",
    title: "Kimi K3 不是更大的聊天模型，而是一台正在成形的任务机器",
    summary: "从 K2.6、K2.7 Code 到 K3，拆解长上下文、Coding、原生多模态和知识工作如何汇成一个任务闭环。",
    tags: ["Kimi K3", "Agent", "AI 产品"],
    readingTime: "约 8 分钟",
  },
  {
    slug: "gpt-5-6",
    number: "002",
    date: "2026.07.09",
    dateTime: "2026-07-09",
    category: "模型观察",
    title: "GPT-5.6 不只是 Sol 更强，而是模型开始被组织成任务系统",
    summary: "从 Sol、Terra、Luna 到 max、ultra，判断模型分层与多智能体调度如何改变 AI 产品设计。",
    tags: ["GPT-5.6", "Multi-agent", "AI 产品"],
    readingTime: "约 9 分钟",
  },
];

const articleItems = articles.map((article) => ({
  id: article.slug,
  content: (
    <Link className="news-card" href={`/insights/${article.slug}`}>
      <div className="news-card-meta">
        <span>MODEL NOTES / {article.number}</span>
        <time dateTime={article.dateTime}>{article.date}</time>
      </div>
      <div className="news-card-main">
        <span className="news-card-category">{article.category}</span>
        <h2>{article.title}</h2>
        <p>{article.summary}</p>
      </div>
      <div className="news-card-foot">
        <div>{article.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <span>{article.readingTime}</span>
        <ArrowUpRight aria-hidden="true" />
      </div>
    </Link>
  ),
}));

export default function InsightsIndexPage() {
  return (
    <main className="secondary-page news-index-page">
      <section className="news-index-hero">
        <div className="page-shell news-index-hero-inner">
          <div className="news-index-kicker">
            <span>NEWSROOM / AI PRODUCT NOTES</span>
            <span>持续更新</span>
          </div>
          <StaggeredText
            as="h1"
            text={"记录模型变化，\n判断产品方向。"}
            segmentBy="lines"
            className="news-index-title"
            direction="bottom"
            delay={52}
            duration={0.8}
            blur
          />
          <div className="news-index-intro">
            <p>不只复述参数和榜单，而是从用户任务、产品形态、商业价值与风险边界出发，判断一次 AI 更新真正改变了什么。</p>
            <div><span>已发布</span><strong>{String(articles.length).padStart(2, "0")}</strong><small>篇产品观察</small></div>
          </div>
        </div>
      </section>

      <section className="page-shell news-index-list" aria-labelledby="latest-title">
        <header>
          <span>LATEST ARTICLES</span>
          <h2 id="latest-title">最新文章</h2>
          <p>按发布时间倒序排列</p>
        </header>
        <AnimatedList
          items={articleItems}
          autoAddDelay={0}
          startFrom="top"
          animationType="blur"
          enterFrom="bottom"
          hoverEffect="none"
          clickEffect="none"
          fadeEdges={false}
          swipeToDismiss={false}
          itemGap={18}
          height="auto"
          animateInitial
          initialStagger={0.08}
          className="news-animated-list"
          itemClassName="news-list-shell"
          contentClassName="news-list-content"
        />
      </section>

      <Footer8
        dense
        statement="记录变化，更重要的是形成判断。"
        actionLabel="查看项目实践"
        actionHref="/projects"
        copyright="© 2026 QI NING / LATEST NEWS"
      />
    </main>
  );
}
