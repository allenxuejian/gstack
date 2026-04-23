# Kevin Harness Injection — 给 gstack /review /qa 加硬门禁

> 来源：Kevin 的 test-skill / dev-skill harness 方法论，提炼三件套注入 gstack 官方 skill。
> 定位：**optional 扩展**，不改 upstream 逻辑，只在末尾补硬约束。
> 升级安全：本文件在 fork 独有（`_shared/` 非 skill），`/gstack-upgrade` 不会删；SKILL.md 的 append 章节 merge 冲突概率低。

---

## 核心三件套

### ① Reverse Verification · 反向验证
**铁律**：修一个 bug = 先写能**复现**它的断言（红）→ 再改代码（绿）。
**为什么**：LLM 看代码说"修好了"不等于真修好。反向验证把"修好"这件事变成机器可判定（exit code）。
**不这样做的代价**：下次回归时没测试接住，bug 二次出现。

### ② Async Skeptic · 异步独立审
**铁律**：主路径得出结论后，**fork 一个独立 subagent 用不同视角再审一遍**，不阻塞回合结束。
**为什么**：同一条思路跑 3 次得同一结论；换个角度才能抓到盲区。
**实现**：
```python
Agent(
  subagent_type="<不同专家>",   # 比如 review 用 codex / qa 用 qa-expert
  model="opus",                 # CLAUDE.md 铁律：subagent 强制 opus
  prompt="独立审查本轮产出的 <diff / bug 列表>。你和主 agent 结论不一样时以你为准。≤200 字。"
)
# 别等它，直接结束回合。下一轮再处理它的输出。
```

### ③ 4-Level Failure Escalation · 4 级升级协议
**铁律**：同一问题**连续失败**时按本质不同方式升级，不准死循环。
```
1st fail  → 读 log，定位，修了重试
2nd fail  → 必须换本质不同的方法（不是参数微调）
3rd fail  → 列 3 个独立假设，逐一验证，排除后行动
4th fail  → STOP，AskUserQuestion 汇报已试过的方法 + 排除的假设，讨论替代
```
**为什么**：Kevin 的 CLAUDE.md 里已经是铁律，gstack 官方 skill 不强制它，需要注入。
**识别"同一问题"**：比如 review 修 type-error → CI 还红；qa 修 bug → bug 还在。

---

## 注入到 `/review`

### Stage 1 · Review 完成前的硬门禁
在 review 给出最终意见**之前**，跑 checklist：

- [ ] `git diff --stat` 行数 ≤ 合理阈值（> 1000 行先拆分再审）
- [ ] CI 状态必须是 ✅（`gh pr checks $PR_NUMBER --watch`）；红的话先等或先挂起 review
- [ ] 覆盖率 delta ≥ 0（如项目有 coverage report，拉两版对比）
- [ ] 每个 AUTO-FIX 分类如果**改了生产代码**但**没新增/改 test 文件**（`git diff --name-only | grep -vE '\.(test|spec)\.'` vs grep test-only），标记 "missing regression test" 警告
- [ ] 新增文件有 `TODO|FIXME|any|@ts-ignore` 硬门禁：grep 计数 == 0，否则列出并要求作者说明

### Stage 2 · 异步 Skeptic
在回合结束前一步，fork：
```python
Agent(subagent_type="codex", model="opus",
      prompt="对本次 PR diff 做独立审查。聚焦：安全漏洞 / 破坏性改动 / 跨模型分歧点。
              和主 review 结论冲突时标红。≤200 字。")
```
结果留给**下一回合**处理。本回合直接结束。

### 失败升级 · 同一 PR 反复红
- 1st: 作者修完又红 → 读 CI log 定位
- 2nd: 换 diff-based 分析为 **greptile / codex 独立扫**
- 3rd: 列 3 个假设（代码逻辑 / 测试 flaky / 环境差异）
- 4th: STOP，AskUserQuestion 告知作者当前堆叠的失败 + 讨论是否 revert 或换人

---

## 注入到 `/qa`

### Stage 1 · Bug 报告前的硬断言
每条 bug 在报告 / 修复之前**必须**附带：
- [ ] `$B console --errors` 输出（截屏里的证据，或 `errors == 0` 确认）
- [ ] `$B is visible|enabled|checked` 断言（而不是 LLM 看截图说"不对"）
- [ ] 如有网络问题：`$B network` 过滤 4xx/5xx，至少列 1 条
- [ ] 回归前：先 `$B snapshot` 存基线，修复后 `$B snapshot -D` 证明状态变了

### Stage 2 · Phase 8e.5 强化：反向验证
Phase 8e.5 现已生成 regression test，强化为**必须先红再绿**：
```bash
# 必须先跑一次新增的测试，它应该 FAIL（证明它真复现 bug）
pnpm test -- <new-regression-test>  # 期望 exit != 0
# 再应用修复
# 再跑，应该 PASS
pnpm test -- <new-regression-test>  # 期望 exit == 0
```
如果"新增测试一上来就绿"，说明它没抓住 bug 本质 —— 返工。

### Stage 2 · 异步 Skeptic
```python
Agent(subagent_type="qa-expert", model="opus",
      prompt="独立重测 <URL>。不看主 agent 的 bug 列表，自己跑一遍。
              结束后对比两份列表：找到主 agent 漏掉的 / 误报的。≤200 字。")
```

### 失败升级 · 同一 bug 反复修不好
- 1st: revert 重修（`/qa` 已有规则 14）
- 2nd: 换 approach（不是调参数，而是 restructure）
- 3rd: 列 3 个根因假设，逐一验证
- 4th: STOP，AskUserQuestion 汇报 + 讨论是否 descope（把这个 bug 踢出本次 qa）

---

## 边界（不要过度注入）

- ❌ 不给 `/review` 加 lint+typecheck+build — 这是 dev/test 的职责，review 只审 diff
- ❌ 不给 `/qa` 加 coverage gate — qa 只跑运行时，覆盖率是单元测试的事
- ❌ 不强制所有 review 都跑 codex skeptic — 小 PR 不值得；按 diff 行数阈值选择

## 触发本注入

**SKILL.md 末尾已加 `## Kevin Harness Extension (optional)` 指针**。Claude 在执行
`/review` 或 `/qa` 时看到指针 → 读本文件 → 按项目实际情况选择性执行。

**强制开关**：若项目 CLAUDE.md 声明 `kevin-harness: required`，则三件套都必须跑；
否则按推荐项自己裁剪。默认推荐：**反向验证 > 异步 skeptic > 4 级升级**（按重要性排）。

---

## 设计溯源

- 本方法论源自 Kevin 的 `dev-skill` / `test-skill` 的 Stage 1/Stage 2 workflow
- 最初灵感来自 Claude Design 的 `fork_verifier_agent` 模式
- 和 Karpathy 「Goal-Driven Execution」一脉相承：把"好了没"变成机器可判断的目标
- 和 CLAUDE.md 「失败升级协议」完全对齐
