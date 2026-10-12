// Run after npm run build: node --test tests/insights.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const articles = [
  ["agent-task-completion", "2026-10-12", "Agent 的最后一公里：谁来证明“已完成”？"],
  ["ad-data-context", "2026-10-09", "同样的 ROI，为什么会得到相反的判断？"],
  ["agent-excel-workflows", "2026-10-06", "企业 Agent 的第一道门槛，藏在 Excel 里"],
];

test("news index lists all five articles with October 12 first", async () => {
  const html = await readFile(new URL("../out/insights/index.html", import.meta.url), "utf8");
  const list = html.match(/<ul\b[\s\S]*?<\/ul>/)?.[0];
  assert.ok(list, "article list must exist in exported HTML");
  const links = [...list.matchAll(/class="news-card" href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(links, [
    ...articles.map(([slug]) => `/insights/${slug}/`),
    "/insights/kimi-k3/",
    "/insights/gpt-5-6/",
  ]);
  const dates = [...list.matchAll(/<time dateTime="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(dates, ["2026-10-12", "2026-10-09", "2026-10-06", "2026-07-17", "2026-07-09"]);
  assert.match(html, /<strong>05<\/strong>/);
});

for (const [slug, date, title] of articles) {
  test(`${slug} exports a complete article with correct date, links and generic examples`, async () => {
    const html = await readFile(new URL(`../out/insights/${slug}/index.html`, import.meta.url), "utf8");
    assert.ok(html.includes(`<title>${title} | 祁宁 Miranda</title>`));
    assert.ok(html.includes(`<time dateTime="${date}">${date.replaceAll("-", ".")}</time>`));
    const article = html.match(/<article>[\s\S]*?<\/article>/)?.[0];
    assert.ok(article, "article body must exist");
    assert.ok(article.includes("虚构"), "examples must be identified as fictional");
    assert.doesNotMatch(article, /傲基|ONBRILL|TikTok|\bTK\b|320|9 张表|我公司|我的公司/);
    const text = article.replace(/<[^>]*>/g, "");
    assert.ok(text.length > 900, "full article must be exported, not just its excerpt");
    const anchors = [...article.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
    for (const anchor of anchors) assert.ok(article.includes(`id="${anchor}"`), `missing section ${anchor}`);
    const sourceSection = article.match(/<section id="sources"[\s\S]*?<\/section>/)?.[0];
    assert.ok(sourceSection?.includes("https://"), "public source links must be available");
    for (const match of sourceSection.matchAll(/2026\.(\d{2})\.(\d{2})/g)) {
      assert.ok(`2026-${match[1]}-${match[2]}` <= date, "source cannot postdate the article");
    }
  });
}
