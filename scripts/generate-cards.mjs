import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = join(ROOT, "src", "content", "posts");
const CARDS_DIR = join(ROOT, "src", "content", "cards");
const ALLOWED_CATEGORIES = ["AI 与机器学习", "编程与工具", "写作与思考", "英语", "其他"];
const BASE_URL = process.env.SENSENOVA_BASE_URL ?? "https://token.sensenova.cn/v1";
const MODEL = process.env.SENSENOVA_MODEL ?? "sensenova-6.7-flash-lite";
const API_KEY = process.env.SENSENOVA_API_KEY ?? "";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const slugArgs = args.filter((a) => !a.startsWith("--") && a.trim().length > 0);
let maxCards = 5;
const mcArg = args.find((a) => a.startsWith("--max-cards="));
if (mcArg) maxCards = Math.max(1, Math.min(8, Number.parseInt(mcArg.split("=")[1], 10) || 5));

if (!API_KEY) {
  console.error("缺少环境变量 SENSENOVA_API_KEY");
  process.exit(1);
}

function changedPostPaths() {
  let base = process.env.GITHUB_EVENT_BEFORE;
  if (!/^[0-9a-f]{40}$/.test(base ?? "")) base = "HEAD~1";
  try {
    const out = execFileSync(
      "git",
      ["diff", "--name-only", "-z", base, "HEAD", "--", "src/content/posts"],
      { encoding: "utf8", cwd: ROOT },
    );
    return out.split("\0").filter(Boolean);
  } catch {
    return [];
  }
}

function parsePost(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  let title = "";
  if (m) {
    const t = m[1].match(/^title:\s*(.+)$/m);
    if (t) title = t[1].trim().replace(/^["']|["']$/g, "");
  }
  return { title, body: m ? raw.slice(m[0].length) : raw };
}

function yaml(value) {
  return JSON.stringify(String(value ?? ""));
}

function cardContent(postSlug, card) {
  const lines = [
    "---",
    `question: ${yaml(card.question)}`,
    `answer: ${yaml(card.answer)}`,
    `post: ${yaml(postSlug)}`,
    `category: ${yaml(card.category)}`,
  ];
  if (card.tags.length > 0) {
    lines.push("tags:");
    for (const tag of card.tags) lines.push(`  - ${yaml(tag)}`);
  } else {
    lines.push("tags: []");
  }
  lines.push("status: 待复习", `created: ${new Date().toISOString().slice(0, 10)}`, "---", "");
  return lines.join("\n");
}

async function askCards(title, body) {
  const prompt = [
    "你是一位经验丰富的知识整理专家。请阅读下面的博客文章，提炼出 3-5 个最重要的知识点，生成「主动回忆式」复习卡片。",
    "",
    "要求：",
    "1. 每张卡片一个知识点，包含 question（触发回忆的问题）和 answer（答案）；",
    "2. question 要短而有力，能让人先在大脑里回忆，不能把答案直接写进问题里，不要用选择题；",
    "3. answer 要准确、自包含、简洁（50-120 字），可以包含 markdown 语法（**加粗**、箭头 ->、代码片段）；",
    "4. 覆盖文章的核心概念、原理、应用或易错点，宁缺毋滥，不要流水账，不要臆造文章里没有的内容；",
    `5. category 必须从以下选项里选一个最合适的：${ALLOWED_CATEGORIES.join("、")}；`,
    '6. tags 给 1-4 个简短标签；',
    '7. 只输出一个 JSON 对象，不要输出任何其他文字，格式：',
    '{"cards":[{"question":"...","answer":"...","category":"...","tags":["..."]}]}',
    "",
    `文章标题：${title}`,
    "文章正文（可能被截断）：",
    body.slice(0, 8000),
  ].join("\n");

  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "你只输出 JSON。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
    signal: AbortSignal.timeout(90000),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`API ${resp.status}: ${text.slice(0, 200)}`);
  }
  let content = "";
  try {
    content = JSON.parse(text)?.choices?.[0]?.message?.content ?? "";
  } catch {
    throw new Error("无法解析 API 响应");
  }
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1] : content;
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI 响应中没有找到 JSON");
  const parsed = JSON.parse(jsonText.slice(start, end + 1));
  const cards = Array.isArray(parsed?.cards) ? parsed.cards : [];
  return cards
    .filter(
      (c) =>
        c &&
        typeof c.question === "string" &&
        c.question.trim() &&
        typeof c.answer === "string" &&
        c.answer.trim(),
    )
    .slice(0, maxCards)
    .map((c) => ({
      question: c.question.trim().replace(/\s*\n\s*/g, " "),
      answer: c.answer.trim().replace(/\s*\n\s*/g, " "),
      category: ALLOWED_CATEGORIES.includes(c.category) ? c.category : "其他",
      tags: (Array.isArray(c.tags) ? c.tags : [])
        .filter((t) => typeof t === "string" && t.trim())
        .slice(0, 4)
        .map((t) => t.trim().replace(/\s*\n\s*/g, " ")),
    }));
}

function existingCards() {
  if (!existsSync(CARDS_DIR)) return [];
  return readdirSync(CARDS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = readFileSync(join(CARDS_DIR, f), "utf8");
      const q = raw.match(/^question:\s*(.+)$/m)?.[1]?.trim() ?? "";
      const p = raw.match(/^post:\s*(.+)$/m)?.[1]?.trim() ?? "";
      return {
        file: f,
        question: q.replace(/^["']|["']$/g, ""),
        post: p.replace(/^["']|["']$/g, ""),
      };
    });
}

function main() {
  mkdirSync(CARDS_DIR, { recursive: true });
  const index = existingCards();
  const knownQuestions = new Set(index.map((c) => c.question));

  const slugs =
    slugArgs.length > 0
      ? slugArgs
      : changedPostPaths().map((p) => basename(p, ".md"));
  const targets = slugs
    .filter((s) => s && existsSync(join(POSTS_DIR, `${s}.md`)))
    .map((s) => ({ slug: s, path: join(POSTS_DIR, `${s}.md`) }));

  if (targets.length === 0) {
    console.log("没有需要处理的文章（未检测到新的文章推送）。");
    return;
  }

  for (const target of targets) {
    (async () => {
      try {
        const existing = index.filter((c) => c.post === target.slug);
        if (existing.length > 0 && !force) {
          console.log(`⏭  ${target.slug}：已有 ${existing.length} 张卡片，跳过（用 --force 重新生成）`);
          return;
        }
        const { title, body } = parsePost(target.path);
        const cards = await askCards(title || target.slug, body);
        if (cards.length === 0) {
          console.log(`✗ ${target.slug}：AI 没有返回有效卡片`);
          return;
        }
        const fresh = force ? cards : cards.filter((c) => !knownQuestions.has(c.question));
        if (fresh.length === 0) {
          console.log(`⏭  ${target.slug}：生成的问题与现有卡片重复，未写入`);
          return;
        }
        const baseNumber = force ? 1 : existing.length + 1;
        let written = 0;
        for (let i = 0; i < fresh.length; i++) {
          const file = `${target.slug}-${baseNumber + i}.md`;
          if (!dryRun) writeFileSync(join(CARDS_DIR, file), cardContent(target.slug, fresh[i]), "utf8");
          written++;
        }
        const prefix = dryRun ? "[dry-run] " : "";
        console.log(`✔ ${prefix}${target.slug}：生成 ${written} 张卡片（${title || ""}）`);
        for (const c of fresh) {
          console.log(`   Q: ${c.question}`);
          console.log(`   A: ${c.answer.slice(0, 80)}${c.answer.length > 80 ? "…" : ""} [${c.category}]`);
        }
      } catch (err) {
        console.error(`✗ ${target.slug}：${err.message}`);
      }
    })();
  }
}

main();