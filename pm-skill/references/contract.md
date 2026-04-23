# pm-skill · 完整契约清单

> **Kevin 环境专属 CRITICAL**（Opus subagent / 失败升级协议 / Linear 同步等）统一在 `~/.claude/skills/gstack/_shared/kevin-personal-constraints.md`。本文只列通用 PM 规则 + skill 特有 CRITICAL。
> 分享给别人时删掉 `_shared/` 引用即可。

每条契约带 **Why** + **How to apply**。

---

## 产品契约

### MUST

- **MUST 每个"用户..."断言有来源。**
  - Why: 无来源 = 臆测。Claude Design 原文 "好设计扎根于已有上下文" 对应 PM 就是 "好 PRD 扎根于真实用户/数据"。
  - How: `user_pain.source` / `users.current_workaround` 必须引用访谈记录路径 / 数据 query / 竞品行为截图 / 支持工单编号。

- **MUST north_star 只有 1 个。**
  - Why: 多 north star = 没 north star。团队知道为哪个指标牺牲其他。
  - How: schema 强制 `north_star` 为单对象；guardrails 放其他不能退化的指标。

- **MUST non_goals 至少 1 条。**
  - Why: 什么都做 = 没优先级。明示"不做什么"是 PM 的核心工作之一。
  - How: schema 强制 `non_goals.minItems: 1`。诱人但本期刻意不碰的写进来。

- **MUST alternatives_rejected 至少 1 个。**
  - Why: 证明你真考虑过其他方案。Claude Design 原文 "≥3 候选" 对应 PM 就是至少考虑过 1 个替代方案。
  - How: schema 强制。每个 `{name, why_no}` 结构。

- **MUST 每条 AC Gherkin 可测性。**
  - Why: AC 不可测 = dev 不知道做到什么程度算过 = test 不知道写什么测试。
  - How: 每条 AC 必须 `measurable: true` + given/when/then 三项非空 + 可选 `test_hint` 给 test-skill 用。

- **MUST ui_brief 段完整（7 字段必填）。**
  - Why: UI skill 启动门禁。不完整 = UI skill 要反向问 PM，流水线断。
  - How: 所有 screens 必含 id/goal/primary_action/states/variants_desired/priority_axes；flow + design_system_ref 必填。

- **MUST rollout.rollback_plan 不能留空。**
  - Why: 没有回滚计划的上线 = 赌博。
  - How: 至少一句话具体怎么回滚（feature flag 关 / DB down script / code revert）。

- **MUST 决策变更同步 prd.yaml + Linear。**
  - Why: 契约漂移会让下游做错。业务说"改方向了"但 PRD 没改 = 下游按旧版做 = 浪费。
  - How: 方向变更立即 edit prd.yaml；跑 harness 重新通过；同步 Linear comment。

- **MUST 并发调用无依赖工具。**
  - Why: Step 2 探索速度。
  - How: Grep + Read + mcp__linear 在同一条消息。

### NEVER

- **NEVER 用"可能 / 也许 / 大概 / 理论上 / 应该"措辞。**
  - Why: PRD 是决策文档，要 definite。模糊措辞 = 把决策推回给下游。
  - How: 写完全文 grep 一遍 "可能|也许|大概|理论上|应该会"，找到的要么改定式要么删。

- **NEVER 把 UV/PV/停留时长当 north star。**
  - Why: 这些是 output 不是 outcome。用户能在平台停 10 小时不代表得到价值。
  - How: north star 必须是 "用户完成 X 核心动作" 或 "业务实现 Y 价值" 级别（付费转化、任务完成率、留存、NPS 等）。

- **NEVER 只列"要做什么"不列"为什么不选其他"。**
  - Why: 没对比 = 没决策质量依据。
  - How: `alternatives_rejected` 至少 1 个。

- **NEVER 写"所有用户都..."。**
  - Why: 所有用户都... = 没用户画像 = 没产品聚焦。
  - How: 用 `users[].persona` 分开写。"付费用户"和"试用用户"行为 / 需求 / 敏感度都不同。

- **NEVER 把时间估算写进 PRD。**
  - Why: PRD 是"做什么"，时间估算是 dev-skill 的事。混在一起 = PM 越权。
  - How: 时间估算放 `rollout.phases[].duration`（阶段级）而非具体 dev 任务。

- **NEVER 省略 guardrails。**
  - Why: 光追 north star 会伤其他指标（转化涨了但退款也涨了）。
  - How: schema 强制 `guardrails.minItems: 1`。至少 1 个"不能退化"的指标。

### CRITICAL

- **CRITICAL schema 校验失败 = PRD 未完成。**
  - Why: schema 是双向契约的门禁。
  - How: harness Stage 1 必须绿。不绿的 prd.yaml 不许交给 UI skill。

- **CRITICAL AC measurable 必须 true。**
  - Why: `measurable: false` 等于承认这条 AC 不可测 = 夹带私货。
  - How: schema 用 `const: true` 硬锁。想写"未来再测"的愿望 → 放 solution.key_decisions 而非 AC。

- **CRITICAL 涉及用户数据的 PRD 必须过合规检查。**
  - Why: PII / GDPR / 年龄限制等红线。
  - How: schema 里 `scenarios` 如涉及用户数据收集 / 分享 / 跨境，必须在 `risk_matrix` 列出合规风险条目。

- **CRITICAL 业务目标变更同步 prd.yaml 是强制动作。**
  - Why: 契约漂移 = 下游做错 = 浪费工时。
  - How: Linear 业务字段变了 → 立即 edit prd.yaml → 重跑 harness → 通知下游 skill 重读。

**其余 CRITICAL（失败升级 / Opus subagent）见 `_shared/kevin-personal-constraints.md`。**
