// Run after npm run build: node --test tests/insights.test.mjs
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

const articles = [
  ["agent-task-completion", "2026-10-12", "Agent 的最后一公里：谁来证明“已完成”？"],
  ["ad-data-context", "2026-10-09", "同样的 ROI，为什么会得到相反的判断？"],
  ["agent-excel-workflows", "2026-10-06", "企业 Agent 的第一道门槛，藏在 Excel 里"],
];

const publicationDate = "2026-11-08";
const practiceEntries = [
  ["publishing-snapshot", "006"],
  ["feishu-readback-verification", "007"],
  ["metrics-history-projection", "008"],
  ["skill-execution-engine", "009"],
  ["skill-resource-bundles", "010"],
  ["unit-economics-as-code", "011"],
  ["local-workbench-recovery", "012"],
  ["code-driven-hardware-film", "013"],
  ["artifact-handoffs", "014"],
  ["video-audio-clock", "015"],
];
const published = [...practiceEntries].reverse();
const practiceArticles = (await Promise.all(["a", "b", "c"].map(async (part) =>
  JSON.parse(await readFile(new URL(`../lib/practice-content-${part}.json`, import.meta.url), "utf8"))
))).flat();
const escapeHtml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

test("all ten practice articles publish on November 8 with distinct article numbers", () => {
  assert.deepEqual(practiceArticles.map(({ slug, number, date }) => [slug, number, date]),
    practiceEntries.map(([slug, number]) => [slug, number, publicationDate]));
  assert.equal(new Set(practiceArticles.map(({ slug }) => slug)).size, 10);
});

test("exported index lists the new practical tutorial and all fifteen existing articles", async () => {
  const html = await readFile(new URL("../out/insights/index.html", import.meta.url), "utf8");
  const list = html.match(/<ul\b[\s\S]*?<\/ul>/)?.[0];
  assert.ok(list, "article list must exist in exported HTML");
  const links = [...list.matchAll(/class="news-card" href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(links, [
    "/insights/ai-content-workbench-seven-steps/",
    ...published.map(([slug]) => `/insights/${slug}/`),
    ...articles.map(([slug]) => `/insights/${slug}/`),
    "/insights/kimi-k3/",
    "/insights/gpt-5-6/",
  ]);
  const dates = [...list.matchAll(/<time dateTime="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(dates, [
    "2026-11-09",
    ...published.map(() => publicationDate),
    "2026-10-12", "2026-10-09", "2026-10-06", "2026-07-17", "2026-07-09",
  ]);
  assert.ok(html.includes("<strong>16</strong>"));
});

for (const [slug] of published) {
  test(`${slug} exports its complete practice record with the publication date`, async () => {
    const html = await readFile(new URL(`../out/insights/${slug}/index.html`, import.meta.url), "utf8");
    const source = practiceArticles.find((entry) => entry.slug === slug);
    assert.ok(html.includes(`<time dateTime="${publicationDate}">${publicationDate.replaceAll("-", ".")}</time>`));
    assert.ok(html.includes(escapeHtml(source.title)));
    const body = html.match(/<article>[\s\S]*?<\/article>/)?.[0];
    assert.ok(body);
    for (const section of source.sections) {
      assert.ok(body.includes(`id="${section.id}"`));
      assert.ok(body.includes(escapeHtml(section.paragraphs.at(-1))), "last paragraph must survive export");
    }
    assert.ok(body.replace(/<[^>]*>/g, "").length > 1000);
    assert.doesNotMatch(body, /不对应真实企业|\/Users\/|file:\/\//);
    assert.ok(body.includes(escapeHtml(source.sourceNote)), "practice record must keep its evidence boundary");
  });
}

test("a nonexistent article has no exported route", async () => {
  await assert.rejects(access(new URL("../out/insights/this-article-does-not-exist/index.html", import.meta.url)), { code: "ENOENT" });
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
