// Run after npm run build: node --test tests/insights.test.mjs
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { getPublicationDate } from "../lib/publication-date.mjs";

const articles = [
  ["agent-task-completion", "2026-10-12", "Agent 的最后一公里：谁来证明“已完成”？"],
  ["ad-data-context", "2026-10-09", "同样的 ROI，为什么会得到相反的判断？"],
  ["agent-excel-workflows", "2026-10-06", "企业 Agent 的第一道门槛，藏在 Excel 里"],
];

const schedule = [
  ["publishing-snapshot", "2026-11-08"],
  ["feishu-readback-verification", "2026-11-10"],
  ["metrics-history-projection", "2026-11-13"],
  ["skill-execution-engine", "2026-11-16"],
  ["skill-resource-bundles", "2026-11-18"],
  ["unit-economics-as-code", "2026-11-22"],
  ["local-workbench-recovery", "2026-11-25"],
  ["code-driven-hardware-film", "2026-11-28"],
  ["artifact-handoffs", "2026-12-02"],
  ["video-audio-clock", "2026-12-06"],
];
const buildDate = getPublicationDate(new Date(), process.env.INSIGHTS_BUILD_DATE);
const due = schedule.filter(([, date]) => date <= buildDate).reverse();
const future = schedule.filter(([, date]) => date > buildDate);
const practiceArticles = (await Promise.all(["a", "b", "c"].map(async (part) =>
  JSON.parse(await readFile(new URL(`../lib/practice-content-${part}.json`, import.meta.url), "utf8"))
))).flat();
const escapeHtml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

test("the ten practice articles retain the agreed staggered publication dates", () => {
  assert.deepEqual(practiceArticles.map(({ slug, date }) => [slug, date]), schedule);
  assert.equal(new Set(practiceArticles.map(({ slug }) => slug)).size, 10);
});

test("exported index lists only due articles in newest-first order", async () => {
  const html = await readFile(new URL("../out/insights/index.html", import.meta.url), "utf8");
  const list = html.match(/<ul\b[\s\S]*?<\/ul>/)?.[0];
  assert.ok(list, "article list must exist in exported HTML");
  const links = [...list.matchAll(/class="news-card" href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(links, [
    ...due.map(([slug]) => `/insights/${slug}/`),
    ...articles.map(([slug]) => `/insights/${slug}/`),
    "/insights/kimi-k3/",
    "/insights/gpt-5-6/",
  ]);
  const dates = [...list.matchAll(/<time dateTime="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(dates, [
    ...due.map(([, date]) => date),
    "2026-10-12", "2026-10-09", "2026-10-06", "2026-07-17", "2026-07-09",
  ]);
  assert.ok(html.includes(`<strong>${String(due.length + 5).padStart(2, "0")}</strong>`));
});

for (const [slug, date] of due) {
  test(`${slug} exports its complete practice record with the publication date`, async () => {
    const html = await readFile(new URL(`../out/insights/${slug}/index.html`, import.meta.url), "utf8");
    const source = practiceArticles.find((entry) => entry.slug === slug);
    assert.ok(html.includes(`<time dateTime="${date}">${date.replaceAll("-", ".")}</time>`));
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

for (const [slug] of future) {
  test(`${slug} has no exported route before its publication day`, async () => {
    await assert.rejects(access(new URL(`../out/insights/${slug}/index.html`, import.meta.url)), { code: "ENOENT" });
  });
}

test("a nonexistent article has no exported route", async () => {
  await assert.rejects(access(new URL("../out/insights/this-article-does-not-exist/index.html", import.meta.url)), { code: "ENOENT" });
});

test("future article text is absent from exported client JavaScript", async () => {
  async function javascriptFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => {
      const path = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
      return entry.isDirectory() ? javascriptFiles(path) : path.pathname.endsWith(".js") ? [path] : [];
    }))).flat();
  }
  const files = await javascriptFiles(new URL("../out/_next/", import.meta.url));
  const contents = await Promise.all(files.map((file) => readFile(file, "utf8")));
  for (const [slug] of future) {
    const source = practiceArticles.find((entry) => entry.slug === slug);
    for (const content of contents) {
      assert.ok(!content.includes(source.opening), `${slug} leaked into a client bundle`);
    }
  }
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
