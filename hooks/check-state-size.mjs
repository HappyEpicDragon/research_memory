/**
 * PostToolUse(Write) hook.
 * 只关心 .research/state.md 的写入：行数超过阈值就在文件末尾追加一条警告，
 * 提醒下次更新前必须先压缩（见 SKILL.md 核心规则一）。
 * 只做计数 + 提醒，不解析内容、不阻断写入。
 */
import fs from "node:fs/promises";
import path from "node:path";

const MAX_LINES = 200;
const TARGET_SUFFIX = path.join(".research", "state.md");
const WARNING_MARK = "<!-- research-memory: 行数超限提醒 -->";

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) return;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  const filePath =
    payload?.tool_input?.file_path || payload?.tool_input?.path || "";
  if (!filePath || !filePath.endsWith(TARGET_SUFFIX)) return;

  let content;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }

  if (content.includes(WARNING_MARK)) return; // 已经提醒过，避免重复叠加

  const lineCount = content.split("\n").length;
  if (lineCount <= MAX_LINES) return;

  const warning = [
    "",
    WARNING_MARK,
    `⚠️ state.md 已经 ${lineCount} 行，超过 ${MAX_LINES} 行上限。`,
    "下次更新前必须先压缩：把过时内容删掉或移到 archive/<日期>.md，不要继续叠加。",
    "",
  ].join("\n");

  await fs.appendFile(filePath, warning, "utf8");
}

main().catch(() => process.exit(0));
