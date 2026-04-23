# dev-skill · 完整契约清单

> **Kevin 环境专属 CRITICAL**（MongoDB `kv_` 红线 / worktree 规则 / master 不 push / GPU `/data5/` / Opus subagent / 失败升级）统一在 `~/.claude/skills/gstack/_shared/kevin-personal-constraints.md`。本文只列通用开发规则 + skill 特有 CRITICAL。
> 分享给别人时删掉 `_shared/` 引用即可。

遵守以下所有规则。每条规则都有 **Why**（原因）和 **How to apply**（怎么用）。

---

## 产品契约（输出质量）

### MUST

- **MUST 先读现有代码/pattern 再写。**
  - Why: 风格不一致是后期维护地狱。Claude Design 原文：「给已有 UI 做增量时，先理解现有视觉词汇并遵循之」，软件工程同理。
  - How: Step 2 探索时 `Grep` 相似功能的已有实现，`Read` 2-3 个样本，对齐命名/目录/错误处理。

- **MUST 大改文件先复制旧版。**
  - Why: 回滚和对比方便。Claude Design 原文 HR-2：「大改某文件时先复制一份再改，保留旧版本」。
  - How: `cp foo.ts foo.old.ts` 再 edit。交付完成后再 `rm foo.old.ts`，commit 前清理。

- **MUST 代码文件 >500 行必拆分。**
  - Why: 可读性 + 可编辑性。Claude Design 原文 HR-5：「>1000 行必拆」，对代码更严（500 行）。
  - How: 拆成多个小文件 + 一个 index 汇总 export。

- **MUST 先 show 骨架再填肉。**
  - Why: 早期对齐避免整体返工。Claude Design 原文：「开头先写假设+上下文+推理，像一个 junior 向经理汇报初稿」。
  - How: 先写空函数签名 + TODO 占位符 → show_to_user → 用户 OK 后填实现。

- **MUST 声称完成前跑 harness 确认全绿。**
  - Why: CLAUDE.md 铁律「完成必验证」。
  - How: 运行 `./harness.sh`；任何一项红就不算完成。

- **MUST Tweaks 模式处理可选项。**
  - Why: Claude Design 原文：「新版本作为 Tweaks 加到原文件，单主文件+可切换优于多散文件」。
  - How: 用 feature flag / env var / config 切换；不要 `foo-v2.ts`、`foo-experimental.ts`。

- **MUST 并发调用无依赖工具。**
  - Why: 速度。Claude Design 原文：「鼓励并发调用文件探索类工具以提升速度」。
  - How: Step 2 的 Read + Grep + Glob 都在**同一条消息内**发出。

### NEVER

- **NEVER 跳过 build/test 直接报告完成。**
  - Why: 会让用户浪费来回确认的时间。
  - How: Step 5 Stage 1 是硬门禁。

- **NEVER 写"预防将来可能发生的错误"的兜底。**
  - Why: 全局指令明确：「Don't add error handling for scenarios that can't happen. Only validate at system boundaries」。边界里面信任内部代码 + 框架保证。
  - How: try/catch 只在外部 IO/用户输入处；内部函数不做 defensive programming。

- **NEVER 引入新依赖而不说明理由。**
  - Why: 每个依赖都是长期维护负担。
  - How: 计划阶段（Step 3）必须列出要新增的依赖 + 理由，用户确认。

- **NEVER 写无用注释。**
  - Why: 全局指令：「Default to writing no comments. Only add when WHY is non-obvious」。
  - How: 不写 "increment counter"、"return result"、"// used by X flow" 这类。只写隐含约束、subtle invariant、workaround。

- **NEVER 用 emoji 除非用户明确要求。**
  - Why: 全局指令明确。Claude Design 原文 Emoji usage: only if design system uses。
  - How: 代码和 commit message 都不加。

- **NEVER 写 backwards-compatibility shims 除非用户明确要求。**
  - Why: 全局指令：「Don't use feature flags or backwards-compatibility shims when you can just change the code」。
  - How: 删除废弃函数 → 直接删 + 同步更新所有 caller，不留 deprecated alias。

### CRITICAL（skill 特有）

- **CRITICAL harness 全绿是"完成"的唯一判据。**
  - Why: 不跑 harness 就声称完成 = 跳过 CLAUDE.md 完成必验证铁律。
  - How: Step 5 Stage 1 硬门禁 · 任何一步红都不算完成。

**其余 CRITICAL（MongoDB `kv_` / master / worktree / GPU / Opus / 失败升级）见 `_shared/kevin-personal-constraints.md`。**
