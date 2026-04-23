# test-skill · Harness 适配指南

测试 skill 的 harness 有**三步门禁**（比 dev-skill 多一步反向验证）：
1. 所有测试绿
2. 覆盖率达标
3. **Mutation smoke test**（关键路径故意破坏，测试必须红）

## 核心原则

1. **反向验证是灵魂**：测试通过 + 覆盖率达标 ≠ 测试有效。必须证明测试能抓 bug。
2. **Harness 住在项目里**，skill 只给模板。
3. **mutation 慢**：只对关键路径（`src/core/*`、`src/payment/*` 等）跑 mutation，不全量。

---

## 常见栈的 harness 三步

### Node.js (Vitest + Stryker)
```bash
bun test --coverage --run       # 步骤 1+2
bunx stryker run --mutate "src/core/**/*.ts"  # 步骤 3（只关键路径）
```

### Python (pytest + mutmut)
```bash
pytest --cov=src --cov-fail-under=80        # 步骤 1+2
mutmut run --paths-to-mutate=src/core/       # 步骤 3
mutmut results  # 检查 survived
```

### Go (testing + go-mutesting)
```bash
go test -cover ./...                         # 步骤 1+2
go-mutesting ./src/core/...                  # 步骤 3
```

---

## 覆盖率阈值怎么定

**全局默认**：80% lines / 70% branches（行业共识）。

**关键模块单独提高**：
- payment / auth / migration：100% lines + 100% branches
- business logic core：≥ 90%
- utility helpers：≥ 80%
- boilerplate / generated code：不要求

阈值写在项目的 config 里（`vitest.config.ts` / `pytest.ini` / `go.mod`），不在 skill 里。

---

## Mutation Testing 实战

**什么是 mutation test**：工具自动在源码里改一个条件（`>` 改 `<`、`+` 改 `-`、删 `!`），看测试有没有能捕获到。能捕获到 = "mutation killed"；漏网 = "survived"。

**survived 的处理**：
- 补测试加强断言
- 或显式标记 "这个 mutation 改变了行为但业务上可接受"（极少见，需明文记录）

**慢**：全量 mutation 可能 >30 分钟。解决方案：
- Harness 只跑**本轮改动涉及的核心模块**
- CI 跑全量 mutation（nightly）
- skill 只对"核心目录 + diff 涉及的文件"跑 mutation

---

## Harness 失败处理（对应 CLAUDE.md 失败升级协议）

- **第 1 次失败** → 看 log：是测试 bug / 代码 bug / 覆盖率差 / mutation survived？逐一修。
- **第 2 次失败** → 换**本质不同**方法：比如从单元测试改集成测试；从增加测试改重构代码让其可测。
- **第 3 次失败** → 列 3 个独立假设：1. 测试设计错 2. 代码有真 bug 3. 工具配置问题。逐一排除。
- **第 4 次失败** → 暂停 AskUserQuestion 汇报。

**CLAUDE.md 相关 skill**：`systematic-debugging` 帮诊断复杂失败。

---

## 调 fork-verifier（Stage 2）

```python
Agent(
  subagent_type="qa-expert",
  model="opus",
  description="Test design audit",
  prompt="""
  本轮新增/修改测试：<files>

  请审查：
  1. 意图清晰度：测试命名 + assert 能看出测什么吗？
  2. 断言强度：除了 "not throw" 还测了什么实质？
  3. Mock 必要性：哪些 mock 应该被替换成真实依赖？
  4. 覆盖策略：漏掉的路径？

  报告 ≤200 字，严重度 (Critical / High / Medium / Low)。
  """
)
```

**备选**：`test-automator`（自动化策略）、`code-reviewer-pro`（资深全面）。

---

## Harness 速度预算

- 单元测试：< 30 秒
- 集成测试：< 2 分钟
- Mutation（核心目录）：< 3 分钟
- **总计 < 5 分钟**。超过就拆分 `harness-test.sh` 和 `harness-test-full.sh`。

Skill 默认用 fast 版本；Stage 2 fork verifier 可以跑 full 版本（异步不阻塞）。
