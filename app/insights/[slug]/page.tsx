import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InsightArticlePage from "@/components/site/insight-article";
import { publishedInsights } from "@/lib/insights";

export const dynamicParams = false;

export function generateStaticParams() {
  return publishedInsights.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = publishedInsights.find((entry) => entry.slug === slug);
  if (!article) notFound();
  return { title: article.title, description: article.summary };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = publishedInsights.find((entry) => entry.slug === slug);
  if (!article) notFound();
  return <InsightArticlePage article={article} />;
}
