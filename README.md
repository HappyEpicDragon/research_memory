# research-memory

一个给 [Claude Code](https://claude.com/claude-code) 用的科研项目 skill：只做记忆恢复和实验执行两件事,不做文献调研、不做论文写作、不做 review。

## 这是什么 / 为什么会有这个

这个 skill 是为了取代 [Oh My Paper](https://github.com/LigphiDonk/Oh-my--paper) 而做的。Oh My Paper 是个功能很全的科研插件(34 个 skill、5 个 agent、文献调研/写作/review/实验管理全都有),但实际长期使用下来,只有"维护一份记忆、长会话之间靠它恢复上下文"这一小块是真正常用的,而这一小块自己也有明显问题:

- **记忆文件只会变长,不会变短**——状态文件本该是"当前情况的快照",实际变成了不断往上叠加"本节优先于以下所有内容"的历史堆栈,几千行很常见。
- **恢复出来的东西看不懂**——写状态文件的是模型在跟"未来的自己"交接,充满只有它自己认得的编号和黑话。
- **实验代码没有约定**——每次现场决定文件怎么放,超参数直接编进文件名,长期下来一堆脚本、日志、`__pycache__` 混在一起。
- **部署很重**——依赖桌面 App 管理的本地配置和"本地目录型" marketplace,在 devcontainer 里要手动挂载好几条路径才能用。
- **算力信息容易丢**——长会话跑到后面,模型会"忘了"服务器怎么连,或者不问就默认本地跑。

`research-memory` 只解决这五个问题,不追求功能全。设计和取舍的完整过程见仓库外的对话记录;这里只给使用说明。

## 安装

### 方式一:在项目里直接跑(推荐)

```bash
npx github:HappyEpicDragon/research_memory
```

会把 skill 安装到当前目录的 `.claude/skills/research-memory/`,并把一个 hook 合并进 `.claude/settings.json`。可以重复运行来更新到最新版本,已有的 `.claude/settings.json` 内容不会被覆盖。

也可以指定目标目录:

```bash
npx github:HappyEpicDragon/research_memory /path/to/project
```

### 方式二:在 devcontainer 里自动安装

在 `.devcontainer/devcontainer.json` 里加一行,容器每次创建时自动装好,不需要任何 bind mount:

```jsonc
{
  // ...
  "postCreateCommand": "npx github:HappyEpicDragon/research_memory"
}
```

这是这个 skill 相比 Oh My Paper 的一个直接改进:Oh My Paper 因为是"本地目录型" marketplace、又依赖桌面 App 写在宿主机的配置文件,在 devcontainer 里必须手动挂载源码目录和 `~/.viewerleaf` 才能用。`research-memory` 通过 npx 直接从 GitHub 拉取安装,不需要挂载任何东西。

### 方式三:手动复制

克隆本仓库,把 `SKILL.md`、`templates/`、`hooks/` 复制到目标项目的 `.claude/skills/research-memory/`,再把 `hooks/check-state-size.mjs` 注册进 `.claude/settings.json` 的 `PostToolUse`(参考本仓库根目录下自己的 hook 注册方式,或看 `bin/install.mjs` 里 `mergeSettings` 的写法)。

## 安装之后会发生什么

Claude Code 读到 `.claude/skills/research-memory/SKILL.md` 后,会在你说"恢复上下文"“这个项目到哪了”“开始新实验”一类的话时自动触发这个 skill。第一次真正使用时,会在项目里创建:

```
.research/
  state.md              # 唯一的"当前状态"文件
  decisions.log.md       # 追加型日志:决策记录
  experiments.log.md     # 追加型日志:实验索引
  compute_nodes.md       # 手动维护的算力登记表
  archive/                # state.md 压缩时,被换下来的旧快照存这里
```

## 两个斜杠命令

自然语言触发 skill 不够可靠时,可以用这两个显式命令(装好后在 `.claude/commands/` 下):

- **`/research-resume`** —— 新会话开始时用,对应 Oh My Paper 的 `/omp:plan`。读 `state.md` + `compute_nodes.md` + 日志尾部,用人话讲一遍现在到哪了。
- **`/research-checkpoint`** —— 这次会话有实质性进展、准备结束或切换任务时用。把进展整篇重写进 `state.md`(不是追加),必要时往决策/实验日志加一行。

## 核心规则(完整版见 `SKILL.md`)

1. **`state.md` 只能整篇重写,不能追加。** 有硬性 200 行上限,旧的、被取代的内容直接删除,不允许用"本节优先"这种堆叠式写法。有个真正会执行的 hook(`hooks/check-state-size.mjs`)在超限时追加警告,不是只停留在文档里说说而已。
2. **`state.md` 面向完全不了解背景的人写。** 文件顶部固定一个术语表,任何编号/代号第一次出现必须先解释。检验标准:一个不知道项目背景的人,只读这一个文件就该看懂现状。
3. **执行留在主线 agent,只有决策关卡才升级到更强的模型。** 写代码、跑实验、调试都由当前 agent 直接做;只有"方案是否合理""结果是否达标""要不要转向"这几个判断点才调用 `advisor()` 或转给 Codex 求第二意见。
4. **新实验用 Hydra 骨架**,超参数进 `conf/` 配置组,不进文件名;每次运行自动落到 `outputs/<date>/<time>/`;`experiments.log.md` 只记一行索引,不复制内容。
5. **开始实验前先看 `compute_nodes.md`**,显式问一次本地还是远程,不默认本地、也不会长会话跑到中途"忘了"服务器怎么连。

## 这个 skill 明确不做的事

- 不做文献调研、论文写作、同行评审
- 不做"读 memory 切换人格"这种角色扮演式 UX,也不会话开头强制弹窗选模式
- 不回填改造你已有的旧实验代码,Hydra 骨架只对新写的实验生效
- 不处理 `compute_nodes.md` 里凭证的加密/脱敏——按明文手动维护设计,自己权衡安全性

## 目录结构(本仓库)

```
research-memory/
  SKILL.md                    # skill 定义,Claude Code 实际读的文件
  templates/
    state.md.tmpl              # state.md 的初始骨架
    compute_nodes.md.tmpl      # compute_nodes.md 的初始骨架
  hooks/
    check-state-size.mjs       # PostToolUse hook:state.md 超 200 行时追加警告
  commands/
    research-resume.md          # /research-resume
    research-checkpoint.md      # /research-checkpoint
  bin/
    install.mjs                 # npx 安装脚本
  package.json
```

## License

MIT
