# research-memory

一个给 [Claude Code](https://claude.com/claude-code) 用的科研项目 skill 包：只做记忆恢复和实验执行两件事,不做文献调研、不做论文写作、不做 review。

## 这是什么 / 为什么会有这个

这个 skill 是为了取代 [Oh My Paper](https://github.com/LigphiDonk/Oh-my--paper) 而做的。Oh My Paper 是个功能很全的科研插件(34 个 skill、5 个 agent、文献调研/写作/review/实验管理全都有),但实际长期使用下来,只有"维护一份记忆、长会话之间靠它恢复上下文"这一小块是我自己真正常用的,而这一小块自己也有明显问题:

- **记忆文件只会变长,不会变短**——状态文件本该是"当前情况的快照",实际变成了不断往上叠加"本节优先于以下所有内容"的历史堆栈,几千行很常见。
- **恢复出来的东西看不懂**——写状态文件的是模型在跟"未来的自己"交接,充满只有它自己认得的编号和黑话。
- **实验代码没有约定**——每次现场决定文件怎么放,超参数直接编进文件名,长期下来一堆脚本、日志、`__pycache__` 混在一起。
- **部署很重**——依赖桌面 App 管理的本地配置和"本地目录型" marketplace,在 devcontainer 里要手动挂载好几条路径才能用。
- **算力信息容易丢**——长会话跑到后面,模型会"忘了"服务器怎么连,或者不问就默认本地跑。

`research-memory` 只解决这五个问题,不追求功能全。设计和取舍的完整过程见仓库外的对话记录;这里只给使用说明。

## 安装

用 [skills CLI](https://www.skills.sh)(`vercel-labs/skills`),一条命令装齐这个仓库里的全部 4 个 skill:

```bash
npx skills add HappyEpicDragon/research_memory --skill '*' -y
```

也可以只挑其中几个(不建议——这四个是配套设计的,`research-init`/`research-resume`/`research-checkpoint` 的指令里都直接引用了 `research-memory` 的规则文件):

```bash
npx skills add HappyEpicDragon/research_memory --skill research-memory --skill research-init -y
```

### 在 devcontainer 里自动安装

在 `.devcontainer/devcontainer.json` 里加一行,容器每次创建时自动装好,不需要任何 bind mount:

```jsonc
{
  // ...
  "postCreateCommand": "npx skills add HappyEpicDragon/research_memory --skill '*' -y"
}
```

这是这个 skill 相比 Oh My Paper 的一个直接改进:Oh My Paper 因为是"本地目录型" marketplace、又依赖桌面 App 写在宿主机的配置文件,在 devcontainer 里必须手动挂载源码目录和 `~/.viewerleaf` 才能用。这里换成生态标准的 `skills` CLI,不需要挂载任何东西。

### 手动复制

克隆本仓库,把 `skills/` 下的四个子目录整个复制到目标项目的 `.claude/skills/` 里(保持目录名不变)。

### 装完之后要不要重启 Claude Code

如果是在一个新项目、或者容器刚创建时装(`.claude/skills/` 之前不存在),按 [官方文档](https://code.claude.com/docs/en/skills) 的说法需要重启一次 Claude Code 才能被发现:

> If you create a top-level skills directory that didn't exist when the session started, restart Claude Code so it can watch the new directory.

如果 `.claude/skills/` 已经存在、只是新增/更新里面的某个 skill,当前会话会自动发现,不用重启。

## 安装之后会发生什么

`research-memory` 这个 skill 会在你说"恢复上下文"“这个项目到哪了”“开始新实验”一类的话时自动触发。另外三个(`research-init`/`research-resume`/`research-checkpoint`)设置了 `disable-model-invocation: true`,只能手动用斜杠命令触发,Claude 不会自己决定运行它们。第一次真正使用时,会在项目里创建:

```
.research/
  state.md              # 唯一的"当前状态"文件
  decisions.log.md       # 追加型日志:决策记录
  experiments.log.md     # 追加型日志:实验索引
  compute_nodes.md       # 手动维护的算力登记表
  archive/                # state.md 压缩时,被换下来的旧快照存这里
```

## 三个斜杠命令

- **`/research-init`** —— 项目第一次用这个 skill、还没有 `.research/` 目录时用。全量扫描仓库(git log、README、目录结构、已有实验代码/结果)+ 问几个代码看不出来的问题(项目在研究什么、现在到哪一步、有没有已知的坑),建立初始记忆,而不是给一份空模板了事。
- **`/research-resume`** —— 新会话开始时用,对应 Oh My Paper 的 `/omp:plan`。读 `state.md` + `compute_nodes.md` + 日志尾部,用人话讲一遍现在到哪了。
- **`/research-checkpoint`** —— 这次会话有实质性进展、准备结束或切换任务时用。把进展整篇重写进 `state.md`(不是追加),必要时往决策/实验日志加一行。

这三个和 `research-memory` 本体一样都是普通 skill,只是加了 `disable-model-invocation: true` 变成"只能手动触发"——`.claude/commands/*.md` 和 `.claude/skills/<name>/SKILL.md` 现在是同一套机制(官方文档原话:"Custom commands have been merged into skills"),这里选了后者,是因为它能被 `skills` CLI 一起发现安装。

## 核心规则(完整版见 `skills/research-memory/SKILL.md`)

1. **`state.md` 只能整篇重写,不能追加。** 有硬性 200 行上限,旧的、被取代的内容直接删除,不允许用"本节优先"这种堆叠式写法。这条纯靠 `/research-checkpoint`/`/research-resume` 指令里"写完/读完自己 `wc -l` 检查一下"来落实——早期版本加过一个 hook 做这件事,后来去掉了,换来的是能用生态标准的 `skills` CLI 安装,代价是压缩纪律完全靠指令执行,不靠代码强制。
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
  skills/
    research-memory/
      SKILL.md                  # 主 skill,规则本体,自然语言可自动触发
      templates/
        state.md.tmpl            # state.md 的初始骨架
        compute_nodes.md.tmpl    # compute_nodes.md 的初始骨架
    research-init/
      SKILL.md                  # /research-init，disable-model-invocation: true
    research-resume/
      SKILL.md                  # /research-resume，disable-model-invocation: true
    research-checkpoint/
      SKILL.md                  # /research-checkpoint，disable-model-invocation: true
```

## License

MIT
