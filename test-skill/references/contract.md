# test-skill · 完整契约清单

> **Kevin 环境专属 CRITICAL**（MongoDB 测试隔离 / Opus subagent / 失败升级）统一在 `~/.claude/skills/gstack/_shared/kevin-personal-constraints.md`。本文只列通用测试规则 + skill 特有 CRITICAL。
> 分享给别人时删掉 `_shared/` 引用即可。

每条契约带 **Why**（原因）+ **How to apply**（怎么用），方便遇到边界情况判断。

---

## 产品契约

### MUST

- **MUST 三类路径覆盖：happy / edge / error。**
  - Why: 只测 happy 等于没测安全边界。bug 大多出在 edge 和 error 上。
  - How: 每个被测函数至少 3 个测试：正常输入（happy）、边界值/空/最大（edge）、错误输入/异常路径（error）。

- **MUST 新测试必须故意破坏源代码跑一次确认能红。**
  - Why: CLAUDE.md 全局"完成必验证"扩展到测试：测试真能抓 bug 才叫测试。
  - How: 写完测试 → 在源码里 invert 一个条件（`> ` 改 `< `）→ `bun test` → 必须红。红了再改回来。

- **MUST 相似用例用参数化。**
  - Why: 维护成本。复制 5 遍改一处要改 5 次。
  - How: `it.each([[1, 2, 3], [5, 5, 10]])('%d + %d = %d', (a, b, expected) => ...)`。

- **MUST 测试命名 = "what should happen when ..."。**
  - Why: 测试名是给**未来的人**看的（包括 CI 报告）。"test_add" 没意义。
  - How: `it('should return 0 when empty array', ...)` 而不是 `it('test_sum_empty', ...)`。

- **MUST 断言公开契约。**
  - Why: 实现会变，契约是稳的。测实现 = 每次重构测试都红。
  - How: 只断言 function 的输入/输出 + 对 DB/外部的可观察效应。不访问 `._private`、`.internal`。

- **MUST 覆盖率阈值是"结果"不是"目标"。**
  - Why: 追数字会诱导写无效测试。
  - How: 阈值在 harness 里硬锁（默认 80% lines），但**关键模块**单独 100%。未达标的模块显式说明为什么。

- **MUST 并发调用无依赖工具。**
  - Why: 速度。Step 2 探索并行执行。
  - How: Read 被测代码 + Grep 现有测试 + Read 测试配置 放在同一条消息里发。

### NEVER

- **NEVER mock 被测单元自己的依赖。**
  - Why: mock 了 = 你在测 mock 不是测真实行为。重构 mock 也要一起改，维护地狱。
  - How: 只有**外部第三方**（Stripe、OpenAI API、外部 SMTP）才 mock。内部 service / util / repo 不 mock。

- **NEVER mock 数据库。**
  - Why: CLAUDE.md 全局反面教训：「integration tests must hit a real database, not mocks. Prior incident where mock/prod divergence masked a broken migration」。
  - How: 用 testcontainers / sqlite 内存模式 / docker-compose 起真实 DB。

- **NEVER 测试引用实现细节。**
  - Why: 实现细节变动时测试误报红色——噪音。
  - How: 不 `spyOn` 私有方法。不测 "this class has a _cache member"。测行为。

- **NEVER 单纯追覆盖率数字。**
  - Why: 覆盖率 100% 的代码照样有 bug（弱断言 / 没测 error path）。
  - How: 报告里**未覆盖区**要列出 + 说原因（"这段是 log 格式化，手测过"、"这段是 migration，集成测试覆盖"）。

- **NEVER `sleep(N)` 等异步。**
  - Why: flaky。CI 上有时快有时慢，测试会"偶尔"红。
  - How: 用条件轮询（`waitFor` / `eventually`）；组合 `condition-based-waiting` skill。

- **NEVER 写"smoke test"当完整测试。**
  - Why: `expect(result).toBeDefined()` 不叫测试，叫"看代码没崩"。
  - How: 每个 assert 必须是**具体的**期望值 / 关系 / 副作用。

- **NEVER 无断言的测试。**
  - Why: 测试不报红 = 没价值。
  - How: 每个 `it` / `test` 至少一个 `expect` / `assert`。只测 "not throw" 的要明确说明为什么这就是契约。

- **NEVER 测试互相依赖。**
  - Why: 顺序一乱就红，随机执行顺序会发现。
  - How: 每个测试自己 setup + teardown。`beforeEach` 重置全局状态。

### CRITICAL（skill 特有）

- **CRITICAL 集成测试必须跑真实 DB / 真实 API contract。**
  - Why: 呼应 CLAUDE.md 全局 feedback memory："mock 测试通过但 prod migration 挂"的事故。
  - How: 用 docker-compose 起 MongoDB / Postgres，跑完拆。API contract 用 Pact / schema 校验。

- **CRITICAL Mutation test 抓不住 = 测试必须加强。**
  - Why: mutation testing 是"反向验证"的自动化——证明测试能红。没抓住 = 弱断言。
  - How: `stryker run --mutate "src/core/**"`；未 killed 的 mutation 要么加测试要么标"活着但可接受"并说明理由。

**其余 CRITICAL（MongoDB 测试隔离 / Opus subagent / 失败升级）见 `_shared/kevin-personal-constraints.md`。**

---

## 🔴 暴力模式专属契约（v2 新增）

暴力模式（`/test --harsh` / 红队触发词）生效时叠加以下规则。默认 QA 模式不受影响。

### MUST（暴力模式）

- **MUST 进暴力模式第一步必须做威胁建模 · STRIDE 攻击面矩阵。**
  - Why: 不先枚举攻击面直接丢 fuzz 等于乱射——找到的 bug 多半是边缘噪音。
  - How: 按 `references/threat-modeling.md` 模板产出 `.claude/threat-model-{date}.md`，通过 `AskUserQuestion` 确认 P0 后才进 Step 2。

- **MUST Fuzz 找到的反例永久化到 regression。**
  - Why: CLAUDE.md 全局反面教训扩展：不永久化 = 下次修 bug 还能回归。
  - How: `tests/regression/fuzz-findings.test.ts` 每条反例一个 `it`，命名格式 `commit-hash · 发现日期 · 一句描述`。

- **MUST LLM 红队的有效攻击 prompt 必须落档。**
  - Why: 这些是 prompt 加固训练集，丢了 = 下次 prompt 升级没参考。
  - How: 存 `.claude/llm-redteam-{date}.md`，分类记录（A/B/C/D 四大类），注明被攻破的规则编号（规则零/一/二/三/四）。

- **MUST 暴力模式下 Property-based 测试必须设计明确 property。**
  - Why: 没 property 的 fuzz 叫 monkey。只跑 1000 次什么都抓不到有意义的。
  - How: 见 `references/fuzz-recipes.md` 四种 property 设计（idempotence / reversibility / commutativity / oracle）。每个 property 必须断言。

- **MUST Chaos 找到的 bug 必须同步进项目 gap-tracking。**
  - Why: chaos 报告只记录在 `.claude/` 本地容易自嗨，没闭环。
  - How: `x-dev-workspace/gap-tracking.md` 追加条目，优先级 / 影响 / 建议修法。

### NEVER（暴力模式）

- **NEVER 把可直接执行的 exploit 写进 repo。**
  - Why: repo 泄露了就是真武器。
  - How: `attack-payloads.json` 里只存 pattern / shape / 截短版本；完整 exploit（working SQLi chain / real jailbreak full prompt）只在本地加密笔记或 `.gitignore` 路径。

- **NEVER 把 chaos / fuzz 跑在生产环境。**
  - Why: chaos 会真的弄挂 DB / 真的发 API 请求花钱。
  - How: `chaos-harness.sh` 起手先 pre-flight 检查 MONGO_URL / NODE_ENV，不是 prod 才继续。

- **NEVER 对第三方生产 LLM 做红队测试。**
  - Why: 违反 ToS（OpenAI / Anthropic / 阿里 Qwen 都明确禁止）。
  - How: LLM 红队只对自家部署的模型或 sandbox 测试环境做。

- **NEVER 把真实用户的对话记录用作红队数据。**
  - Why: 隐私 + 合规风险。
  - How: 用生成的 synthetic 输入或公开红队 benchmark。

- **NEVER 默认模式下跑 fuzz / chaos。**
  - Why: context 爆炸 + CI 时长翻倍。
  - How: 只有暴力触发词命中才进这些轮次；否则跑标准三步门禁。

### CRITICAL（暴力模式）

- **CRITICAL 发现 P0 漏洞必须 AskUserQuestion 即时通报，不等 Step 6 摘要。**
  - Why: 生产环境可能已有在野攻击，等你跑完再报告可能已经被利用。
  - How: 任何命中 "auth bypass / RCE / 数据泄露 / SYSTEM_IDENTITY 规则一攻破 / 真金钱损失" → 立即 AskUserQuestion 通报 + 建议临时缓解。

- **CRITICAL 暴力模式产出必须过双审（qa-expert + security-auditor）。**
  - Why: 单个 qa 角度审查不到攻击面覆盖完整性。
  - How: Step 5 Stage 2 同时 spawn 两个 subagent（都 `model: opus`），并发不等待。

- **CRITICAL Chaos harness 执行前必须 pre-flight 检查环境。**
  - Why: 错跑生产 = 事故。
  - How: 见 `templates/chaos-harness.sh` 脚本顶部的 `MONGO_URL` / `NODE_ENV` 检查块，不通过直接 exit 2。
