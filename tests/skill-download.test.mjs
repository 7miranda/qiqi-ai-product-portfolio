// Run after npm run build; the ZIP decryption checks use the private packaging workflow.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const records = JSON.parse(await readFile(new URL("../lib/method-insights.json", import.meta.url), "utf8"));
const article = records.find((entry) => entry.slug === "ai-content-workbench-seven-steps");
assert.ok(article?.download, "the practical article must include its real download metadata");
const download = article.download;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const html = await readFile(new URL(`../out/insights/${article.slug}/index.html`, import.meta.url), "utf8");

function zipEntries(bytes) {
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50
      && offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length) {
      end = offset;
      break;
    }
  }
  assert.notEqual(end, -1, "ZIP end record must be present");
  const count = bytes.readUInt16LE(end + 10);
  assert.ok(count > 0 && count < 65535, "expected a nonempty standard ZIP");
  let cursor = bytes.readUInt32LE(end + 16);
  const entries = [];
  for (let index = 0; index < count; index++) {
    assert.equal(bytes.readUInt32LE(cursor), 0x02014b50, "central directory entry must be valid");
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    entries.push({
      name: bytes.toString("utf8", cursor + 46, cursor + 46 + nameLength),
      flags: bytes.readUInt16LE(cursor + 8),
      method: bytes.readUInt16LE(cursor + 10),
      extra: bytes.subarray(cursor + 46 + nameLength, cursor + 46 + nameLength + extraLength),
    });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

test("the article offers an encrypted ZIP and the exact public Douyin account", () => {
  assert.equal(download.href, "/downloads/77miranda-agent-content-workbench-v1.zip");
  assert.equal(download.fileName, "77miranda-agent-content-workbench-v1.zip");
  assert.equal(download.douyinHandle, "77AIART");
  assert.equal(download.messageKeyword, "工作流");
  assert.equal(download.douyinUrl, "https://www.douyin.com/user/MS4wLjABAAAA3yQ7LsB3NZ5ZoqqZ9J_nKSmTiSPqOC6B369xwpJs3PFRhtMlc7kBYXGT7Aotq-in");
  assert.match(download.sha256, /^[a-f0-9]{64}$/);
  const card = html.match(/<section id="skill-download"[\s\S]*?<\/section>/)?.[0];
  assert.ok(card, "download guidance must be exported with the complete article");
  assert.ok(card.includes(`href="${download.href}" download="${download.fileName}"`));
  assert.ok(card.includes(`href="${download.douyinUrl}" target="_blank" rel="noopener noreferrer"`));
  for (const text of ["下载文件", "领取密码", "解压使用", "77AIART", "工作流", "不核验关注状态", "不会自动发送私信"]) {
    assert.ok(card.includes(text), `missing practical instruction: ${text}`);
  }
  assert.doesNotMatch(card, /\/user\/self|type="password"|<form\b/);
});

test("downloaded export is the exact AES-256 encrypted archive identified by SHA-256", async () => {
  const source = await readFile(new URL(`../public${download.href}`, import.meta.url));
  const exported = await readFile(new URL(`../out${download.href}`, import.meta.url));
  assert.equal(sha256(source), download.sha256, "published metadata must identify the actual ZIP");
  assert.deepEqual(exported, source, "static export must preserve the downloadable bytes");
  const files = zipEntries(source).filter((entry) => !entry.name.endsWith("/"));
  assert.ok(files.some((entry) => entry.name.endsWith("/SKILL.md")), "archive must include a Skill entrypoint");
  for (const entry of files) {
    assert.ok((entry.flags & 1) === 1, `${entry.name} must require a password`);
    assert.equal(entry.method, 99, `${entry.name} must use AES ZIP rather than legacy ZipCrypto`);
    let aes;
    for (let offset = 0; offset + 4 <= entry.extra.length;) {
      const field = entry.extra.readUInt16LE(offset);
      const length = entry.extra.readUInt16LE(offset + 2);
      assert.ok(offset + 4 + length <= entry.extra.length, "ZIP extra fields must be complete");
      if (field === 0x9901) aes = entry.extra.subarray(offset + 4, offset + 4 + length);
      offset += 4 + length;
    }
    assert.ok(aes?.length >= 7, `${entry.name} must declare its AES encryption`);
    assert.equal(aes.toString("ascii", 2, 4), "AE");
    assert.equal(aes[4], 3, `${entry.name} must use a 256-bit AES key`);
  }
});

test("step prompts survive export as readable code blocks without adding downloads to old articles", async () => {
  const prompts = article.sections.filter((section) => section.prompt);
  assert.ok(prompts.length > 0, "the tutorial must include directly usable instructions");
  for (const section of prompts) {
    assert.ok(html.includes(`<pre class="insight-prompt" aria-label="可复制操作指令"><code>${escapeHtml(section.prompt)}</code></pre>`));
  }
  const previous = await readFile(new URL("../out/insights/publishing-snapshot/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(previous, /id="skill-download"|class="insight-prompt"/);
});
