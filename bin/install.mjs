#!/usr/bin/env node
/**
 * research-memory-skill installer.
 *
 * 用法：
 *   npx github:<user>/<repo>              # 安装到当前目录
 *   npx github:<user>/<repo> /path/to/proj
 *   npx github:<user>/<repo> --help
 *
 * 把 SKILL.md / templates / hooks 复制进 <target>/.claude/skills/research-memory/，
 * 并把 PostToolUse hook 合并进 <target>/.claude/settings.json（不覆盖已有的其它 hook）。
 * 可重复运行：skill 文件整份覆盖更新，hook 条目不会重复插入。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url))); // repo root

function printHelp() {
  console.log(`research-memory-skill installer

用法:
  npx github:<user>/<repo> [目标目录]

参数:
  目标目录   要安装进去的项目根目录，默认是当前目录 (.)

会做的事:
  1. 把 SKILL.md / templates/ / hooks/ 复制到 <目标目录>/.claude/skills/research-memory/
  2. 把状态文件大小检查 hook 合并进 <目标目录>/.claude/settings.json（已有内容不会被覆盖）

可以重复运行来更新到最新版本。`);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function mergeSettings(targetDir, skillDirRelative) {
  const settingsPath = path.join(targetDir, ".claude", "settings.json");
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    } catch {
      console.warn(
        `⚠️  ${settingsPath} 不是合法 JSON，跳过 hook 合并，请手动添加（见 README）。`
      );
      return;
    }
  }

  settings.hooks ??= {};
  settings.hooks.PostToolUse ??= [];

  const command = `node "\${CLAUDE_PROJECT_DIR}/${skillDirRelative}/hooks/check-state-size.mjs"`;
  const alreadyRegistered = settings.hooks.PostToolUse.some((entry) =>
    (entry.hooks || []).some((h) => h.command === command)
  );

  if (!alreadyRegistered) {
    settings.hooks.PostToolUse.push({
      matcher: "Write",
      hooks: [{ type: "command", command, timeout: 10 }],
    });
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const targetDir = path.resolve(args[0] || ".");
  const skillDest = path.join(targetDir, ".claude", "skills", "research-memory");
  const skillDestRelative = path.relative(targetDir, skillDest);

  console.log(`安装 research-memory skill 到: ${skillDest}`);

  for (const item of ["SKILL.md", "templates", "hooks"]) {
    const src = path.join(SELF_DIR, item);
    const dest = path.join(skillDest, item);
    if (fs.statSync(src).isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }

  mergeSettings(targetDir, skillDestRelative);

  const commandsDest = path.join(targetDir, ".claude", "commands");
  copyDir(path.join(SELF_DIR, "commands"), commandsDest);

  console.log(`✅ 完成。
  - skill 文件: ${skillDest}
  - hook 已合并进: ${path.join(targetDir, ".claude", "settings.json")}
  - 斜杠命令: ${commandsDest}/{research-init,research-resume,research-checkpoint}.md

第一次在这个项目里用，且还没有 .research/ 目录：/research-init（扫描仓库 + 问几个问题，建立初始记忆）
新会话恢复上下文：/research-resume
把这次会话进展写回记忆：/research-checkpoint
（不用命令也行，Claude Code 会在你说"恢复上下文"“记录进展”这类话时自动触发 research-memory 这个 skill）`);
}

main();
