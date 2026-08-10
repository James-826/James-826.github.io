import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
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

async function callLLM(prompt, maxTokens) {
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
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(120000),
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
  return extractJson(jsonText);
}

function extractJson(text) {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') inStr = !inStr;
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(i, j + 1);
          try { return JSON.parse(candidate); } catch { break; }
        }
      }
    }
  }
  throw new Error(`AI 响应中没有找到合法 JSON：${text.slice(0, 200).replace(/\s+/g, " ")}`);
}

async function askCards(title, body) {
  const prompt = [
    "你是一位经验丰富的知识整理专家。请阅读下面的博客文章，提炼出 3-5 个最重要的知识点，生成「主动回忆式」复习卡片。",
    "",
    "工作步骤（不要输出思考过程）：",
    "1. 先在心里概括文章的核心论点与主线；",
    "2. 只从核心论点、关键概念、重要结论中挑选知识点；",
    "3. 为每个知识点生成一张卡片。",
    "",
    "要求：",
    "1. question 要短而有力，能触发主动回忆，不能把答案直接写进问题里，不要用选择题；",
    "2. answer 要准确、自包含、简洁（50-120 字），必须完全基于文章内容，不得臆造文章里没有的事实、数字或观点；",
    "3. 宁可少而精，不要为了凑数量生成边角料知识点；",
    `4. category 必须从以下选项里选一个最合适的：${ALLOWED_CATEGORIES.join("、")}；`,
    "5. tags 给 1-4 个简短标签；",
    "6. source 是答案所依据的文章原文关键词或短句（1-3 个），必须是文章里原样出现过的文字，供机器校验；",
    "7. 只输出一个 JSON 对象，不要输出任何其他文字，格式：",
    '{"cards":[{"question":"...","answer":"...","category":"...","tags":["..."],"source":["..."]}]}',
    "",
    `文章标题：${title}`,
    "文章正文（可能被截断）：",
    body.slice(0, 8000),
  ].join("\n");
  const parsed = await callLLM(prompt, 8000);
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
      source: (Array.isArray(c.source) ? c.source : [])
        .filter((s) => typeof s === "string" && s.trim())
        .slice(0, 3)
        .map((s) => s.trim().replace(/\s*\n\s*/g, " ")),
    }));
}

async function verifyCards(title, body, cards) {
  const prompt = [
    "你是一位严格的复习卡片审核员。下面有一篇文章和根据它生成的复习卡片，请逐张审核。",
    "",
    "审核标准：",
    "1. 核心性：该知识点是否是文章的核心内容（核心论点、关键概念、重要结论），而不是边角料或与主题无关的内容；",
    "2. 准确性：答案是否准确、自包含，且完全由文章内容支撑，没有臆造、夸大或过度推断；",
    "3. 回忆价值：问题是否适合主动回忆复习。",
    "",
    '只输出 JSON，格式：{"results":[{"index":0,"keep":true,"reason":"一句话理由"}]}',
    "keep=true 表示通过审核。宁可少留，也不要放过不准确或非核心的卡片。",
    "",
    `文章标题：${title}`,
    "文章正文（可能被截断）：",
    body.slice(0, 8000),
    "",
    "待审核卡片：",
    JSON.stringify(cards.map((c, i) => ({ index: i, question: c.question, answer: c.answer, category: c.category, tags: c.tags, source: c.source })), null, 2),
  ].join("\n");
  const parsed = await callLLM(prompt, 4000);
  const results = Array.isArray(parsed?.results) ? parsed.results : [];
  const keep = new Set();
  const reasons = {};
  const rawKeep = {};
  for (const r of results) {
    if (r && typeof r.index === "number") {
      rawKeep[r.index] = r.keep;
      if (r.keep === true || r.keep === "true" || r.keep === 1) keep.add(r.index);
      if (typeof r.reason === "string") reasons[r.index] = r.reason;
    }
  }
  return { keep, reasons, rawKeep };
}

function normText(s) {
  return s
    .replace(/\s+/g, "")
    .replace(/[，。！？、：；,.!?;:'"“”‘’（）()[]【】\-—_#*·—]/g, "");
}

function grounded(card, body) {
  const sources = Array.isArray(card.source) ? card.source.filter((s) => s.trim()) : [];
  if (sources.length === 0) return false;
  const normBody = normText(body);
  return sources.some((s) => normBody.includes(normText(s)));
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

        const { keep, reasons, rawKeep } = await verifyCards(title || target.slug, body, cards);
        const passed = cards.filter((c, i) => keep.has(i));
        const groundedPassed = passed.filter((c) => grounded(c, body));
        const dropped = cards.filter((c, i) => !keep.has(i) || !grounded(c, body));

        if (dropped.length > 0) {
          console.log(`!  ${target.slug}：${dropped.length} 张未通过审核`);
          for (const [idx, c] of cards.entries()) {
            const g = grounded(c, body);
            if (keep.has(idx) && g) continue;
            if (keep.has(idx)) {
              console.log(`   ✗ 原文校验未命中 ${c.question.slice(0, 40)} source=${JSON.stringify(c.source)}`);
            } else {
              console.log(`   ✗ 审核拒绝 keep=${JSON.stringify(rawKeep[idx])} ${c.question.slice(0, 40)} — ${reasons[idx] ?? "未给理由"}`);
            }
          }
        }

        if (groundedPassed.length === 0) {
          console.log(`✗ ${target.slug}：全部卡片未通过审核，未写入任何文件`);
          return;
        }

        const fresh = force
          ? groundedPassed
          : groundedPassed.filter((c) => !knownQuestions.has(c.question));
        if (fresh.length === 0) {
          console.log(`⏭  ${target.slug}：通过审核的问题与现有卡片重复，未写入`);
          return;
        }

        if (force && !dryRun) {
          for (const f of index.filter((c) => c.post === target.slug).map((c) => c.file)) {
            unlinkSync(join(CARDS_DIR, f));
          }
        }
        const baseNumber = force ? 1 : existing.length + 1;
        for (let i = 0; i < fresh.length; i++) {
          const file = `${target.slug}-${baseNumber + i}.md`;
          if (!dryRun) writeFileSync(join(CARDS_DIR, file), cardContent(target.slug, fresh[i]), "utf8");
        }
        const prefix = dryRun ? "[dry-run] " : "";
        console.log(`✔ ${prefix}${target.slug}：生成 ${fresh.length} 张卡片（${title || ""}）`);
        for (const c of fresh) {
          console.log(`   Q: ${c.question}`);
          console.log(`   A: ${c.answer.slice(0, 100)}${c.answer.length > 100 ? "…" : ""} [${c.category}]`);
        }
      } catch (err) {
        console.error(`✗ ${target.slug}：${err.message}`);
      }
    })();
  }
}

main();