---
name: research-checkpoint
description: 把当前会话的进展写回记忆——整篇重写 state.md，必要时追加决策/实验日志。只能手动用 /research-checkpoint 触发。
disable-model-invocation: true
---

按 `.claude/skills/research-memory/SKILL.md` 的"核心规则一"，把这次会话的进展落盘：

1. 回顾这次会话里发生的**实质性进展**（不是逐句复述对话，是提炼出"结论变了什么、下一步变了什么"）。
2. **整篇重写** `.research/state.md`（用 Write 工具整篇替换，不要用 Edit 追加）：
   - 硬性上限 200 行；
   - 顶部术语表：新出现的编号/代号先解释再用；
   - 旧的、已经被这次进展取代的内容直接删除，不要叠加"本节优先于以下所有内容"这类标注；
   - 有查证价值的旧内容移到 `.research/archive/<今天日期>.md`，不要留在 `state.md` 里。
3. **写完立刻自己检查行数**（`wc -l .research/state.md`）。没有 hook 会替你做这件事，超过 200 行当场删/压缩重写，不要留到下次。
4. 如果这次会话里有需要单独记一笔的决策（否决了什么方向、确认了什么、改变了什么判断），在 `.research/decisions.log.md` 追加一行。
5. 如果这次会话跑了新实验，确认 `.research/experiments.log.md` 有对应的一行索引（`outputs/...` 路径 + 一句话结论）。
6. 完成后用一两句话告诉用户这次 `state.md` 记录了什么、和之前比改了什么。

如果这次会话没有任何实质性进展（纯讨论、没有结论），不要为了"用了这个命令"硬凑内容进 `state.md`——告诉用户没什么可记的就行。
