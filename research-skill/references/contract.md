# research-skill · 完整契约清单

> **Kevin 环境专属 CRITICAL**（MongoDB 红线 / worktree / GPU `/data5` / Opus subagent / 失败升级）统一在 `~/.claude/skills/_shared/kevin-personal-constraints.md`。本文只列本 skill 领域特有的通用规则 + skill 特有 CRITICAL。
> 分享给别人时，删掉 `_shared/kevin-personal-constraints.md` 引用即可。

每条契约带 **Why** + **How to apply**。

---

## 产品契约

### MUST

- **MUST 每个技术断言有来源。**
  - Why: 调研的价值在可验证。没来源 = 可疑断言 = 用户无法审核你的工作。CLAUDE.md 铁律"断言前查证"。
  - How: 每个 "MUST / 应该 / 推荐 / 建议" 后 300 字符内必须有：官方 URL、源码路径:行号、或自己跑过的 snippet 引用。Stage 1 harness 自动检查。

- **MUST 提供 ≥3 候选方案 + 决策矩阵。**
  - Why: 单方案不叫调研叫推销。Claude Design 原文"多个维度提供 3+ 变体"。
  - How: 每次报告开头列候选 A/B/C（及以上），在表格里按 ≥4 维度（性能、心智成本、生态、维护性、成本）打分。

- **MUST 最后给单一推荐。**
  - Why: 用户要决策，不要免责声明。"视情况而定"等于没调研。
  - How: 报告末尾一段"推荐 X，因为 Y"。如果真的无法决策，说明**需要什么信息才能决策**，而不是甩回给用户。

- **MUST 每个方案都有"不适合什么"小节。**
  - Why: 只列优点会误导选型。诚实分析 trade-off 才是价值。
  - How: 每个候选方案标一个 "适合：<场景>" 和一个 "不适合：<场景>"。

- **MUST 先读用户现有代码再给建议。**
  - Why: Claude Design 原文"好的高保真设计不是从零开始的——扎根于已有设计上下文"。软件同理。
  - How: Step 2 必须 Grep 用户代码库相关路径；如果现有代码风格 / 依赖 / 架构强影响决策，必须在报告里提到。

- **MUST 并发调用无依赖工具。**
  - Why: 速度。
  - How: Step 2 的 WebSearch / WebFetch / context7 / Grep 并行发出。

### NEVER

- **NEVER 凭记忆断言库行为。**
  - Why: 库版本变化快，训练数据可能过时。全局指令铁律。
  - How: 提到任何库的具体行为 / API / 版本号前必须 WebSearch / WebFetch / context7 / 读源码验证。

- **NEVER 从零构造架构建议。**
  - Why: 脱离用户上下文 = 产出没用。
  - How: 不读用户代码就不给"推荐架构是 XXX"；至少 Grep 一下现有 pattern。

- **NEVER 只列优点。**
  - Why: 双盲，让用户无法做出信息完整的决策。
  - How: 每个方案强制"不适合什么"小节。

- **NEVER 堆链接当结论。**
  - Why: "这里有 10 个链接"不叫调研。
  - How: 报告结构是 **结论先行**，链接只是证据。读者读完前 3 段就能知道推荐什么。

- **NEVER 写 "视情况而定" 作为最终推荐。**
  - Why: 没价值。
  - How: 如果真的需要更多信息才能决策，写"推荐暂 A，但如果 <条件 X>，则改 B；目前证据倾向 A 因为..."。

- **NEVER 跨项目引用外部资源而不拷贝进来。**
  - Why: Claude Design 原文："跨项目文件不能在 HTML 输出中直接引用——把你要用的拷到当前项目里"。调研同理，关键引用如果是外部资源，要在 `sources/` 下存本地快照（长期价值 ≥3 的）。
  - How: 长期价值高的文章用 `defuddle` 抓取存本地。短期引用放 URL 即可。

### CRITICAL

- **CRITICAL 版本号 / API 签名 / config 字段必须与官方文档逐字一致。**
  - Why: 用户会照着你的报告写代码。写错一个字母就白调研。
  - How: 引用这类内容时 copy-paste，不要手抄。cite 的 URL 要能跳到精确章节（用 anchor）。

- **CRITICAL 链接要么 HEAD 200 要么删。**
  - Why: 悬空引用比没引用更糟（用户点进去 404）。
  - How: Stage 1 harness 自动检查；4xx/5xx 必须修或删。

- **CRITICAL 调研不改代码。**
  - Why: research-skill 是只读 skill。如果需要 PoC 编码，该用 dev-skill。避免调研中手滑改了用户代码。
  - How: 组合 `research-only` skill 防护；snippets/ 只是示例代码不是可运行项目。

**其余 CRITICAL（失败升级 / Opus subagent / MongoDB 只读）见 `_shared/kevin-personal-constraints.md`。**
