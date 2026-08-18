---
description: 恢复科研项目上下文——读 state.md + compute_nodes.md + 日志尾部，人话讲一遍现状
---

按 `.claude/skills/research-memory/SKILL.md` 的"什么时候读什么"一节里"恢复上下文"那条执行：

1. 读 `.research/state.md` 全文。**如果这个文件不存在**：说明这个项目还没有初始化过，用 `templates/state.md.tmpl` 和 `templates/compute_nodes.md.tmpl` 创建空白的 `state.md` / `compute_nodes.md`，告诉用户这是第一次用，不用往下走恢复流程。
2. 读 `.research/compute_nodes.md` 全文。
3. 读 `.research/decisions.log.md` 和 `.research/experiments.log.md` 的**最后 20 条**，不要整篇加载。
4. 用人话跟用户复述一遍现状：现在在哪一步、上一步做了什么、接下来打算做什么。术语表里已经解释过的代号可以用，没解释过的不要照搬。
5. 如果 `state.md` 末尾带着 `check-state-size.mjs` 追加的"行数超限提醒"，提醒用户下次更新前要先压缩，不要直接无视。
