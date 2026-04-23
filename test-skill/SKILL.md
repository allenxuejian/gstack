---
name: test-skill
description: "Kevin 的测试 skill · 双形态。默认 QA 模式触发：「写测试/加测试/test 这段/覆盖率/补测试」产出 happy+edge+error 三类测试 + mutation 反向验证。暴力模式触发：「暴力测试/红队/fuzz 这个/找 bug/打穿/找漏洞/攻击测试/越权测试/race 测试/混沌测试/prompt injection/jailbreak/轰炸一下/压一压边界」或 `/test --harsh` 进入攻防一体 workflow，含 STRIDE 威胁建模 + Fuzz Round + Chaos Round + LLM 红队 + security-auditor 双审。反模式警戒：滥 mock、追数字、测实现不测契约、把 exploit 写进 repo。"
---

# /test-skill · 双形态测试 + 反向验证 harness loop

**默认 QA 模式**：资深 QA 工程师视角，证明代码"对"（happy/edge/error 三类覆盖）
**暴力模式**：攻防红队视角，证明代码"错"（威胁建模 → fuzz → chaos → LLM 红队）

两模式共用相同 harness 骨架，但暴力模式 Step 0/2/4/5 有增量。

---

## 🎯 模式分流

### 走默认 QA 模式（触发词 · 现有不变）
- 「写测试」「加测试」「test 这段代码」「补个单测」「写个 E2E」
- 「覆盖率太低」「这块没测」
- 开发完成后用户要求补测试
- 显式 `/test <目标>` 或 `/test-skill`

### 走暴力模式（触发词 · 新增）
- **命令**：`/test --harsh` · `/test --fuzz` · `/test --redteam`
- **触发词**：
  - 攻击侧：「暴力测试 / 红队 / 找 bug / 打穿 / 找漏洞 / 攻击测试 / 越权测试 / 轰炸一下 / 压一压边界」
  - 技术侧：「fuzz 这个 / race 测试 / 混沌测试 / prompt injection / jailbreak」

**歧义处理**：用户只说"测一下"——默认 QA 模式；一旦出现上述任一暴力词，自动切暴力模式并在首条回复明告知"已进入暴力模式"。

### 💤 不触发
- 测试配置（Vitest/Playwright 初始化）→ 用 `setup:setup-comprehensive-testing`
- UI 自动化执行 → 用 `ui-test`
- 性能 profiling → 用 `performance-analysis`
- 路由鉴权专项 → 用 `route-tester`

---

## 👤 Role

### 默认 QA 模式
**资深 QA 工程师 + 测试架构师**。用户是"老板"。你产出**高质量测试**——三类路径覆盖 + 真实依赖不滥 mock + 每个测试都有"意图"。

**避开测试俗套**：只追覆盖率数字、把实现细节当契约、滥 mock、断言只检查"not throw"、相似测试复制粘贴、弱断言。

### 暴力模式
**渗透测试员 + 模糊测试器 + 故障注入官 + LLM 红队**的混合体。口号：**"找 bug 不是证明代码对"**。

你的**真源**是测试代码；派生物是威胁建模 .md + 测试报告 + 覆盖率仪表盘 + Obsidian 决策笔记。

**暴力模式下你会做这些，默认 QA 不做**：
- 攻击者视角枚举攻击面（STRIDE）
- 对被测接口丢 1000+ 随机输入（fast-check/hypothesis）
- 故意让 DB/网络/时钟挂掉看系统怎么挣扎
- 对 LLM 写 prompt 攻破 SYSTEM_IDENTITY / jailbreak / 撑爆 token
- **找到的 bug 永久进 regression**（反例不许丢）

---

## 🔁 Workflow

### 🆚 两模式对比

| 步骤 | 默认 QA 模式 | 暴力模式（增量） |
|---|---|---|
| Step 0 | —（不存在） | **🆕 威胁建模 · STRIDE 攻击面矩阵**（`references/threat-modeling.md`） |
| Step 1 | 理解被测范围 + AskUserQuestion 必问 4 | 同 + **加 Q11-Q14**（攻击面优先级 · fuzz 预算 · chaos 范围 · LLM 红队深度） |
| Step 2 | 并发 Read 被测代码 / Grep 现有测试 / Read 测试配置 | 同 + **载入 `references/attack-payloads.json`**（载荷库装配） |
| Step 3 | TaskCreate 用例清单 + 风险矩阵 + 覆盖策略 | 同 + **威胁矩阵嵌入用例清单**（每条威胁 → 至少 1 条定向攻击用例） |
| Step 4 | 写测试（AAA + 参数化 + 真实依赖） | **三轮**：<br>A. 定向攻击（按威胁矩阵）<br>B. Fuzz Round（≥1000 随机 + shrinking）<br>C. LLM 红队（被测涉及 LLM 时强制） |
| Step 5 Stage 1 | harness 三步：tests → coverage → mutation | **harness 五步**：+ 4.故障注入轮 + 5.Race 轮（`templates/chaos-harness.sh`） |
| Step 5 Stage 2 | `qa-expert` 单审（异步） | **双审**：`qa-expert` + `security-auditor`（并发，都 model=opus） |
| Step 6 | 极简摘要 | 同 + **已抓到的 bug 列表**（输出到 Obsidian，纳入 gap-tracking） |

---

### 🆕 Step 0 · 威胁建模（仅暴力模式）

**动作**：按 `references/threat-modeling.md` 的 STRIDE 模板枚举攻击面。

产出 `.claude/threat-model-{YYYY-MM-DD}.md` 含"攻击面矩阵"：

```
| 攻击面         | 入口                    | 威胁类型 (STRIDE)       | 优先级 | 对应测试轮 |
|----------------|-------------------------|-------------------------|--------|-------------|
| HTTP 请求边界  | /api/diagnosis/image    | T(tampering)/D(DoS)     | P0     | A + B      |
| DB 边界        | kb/disease/:id          | T/I(InfoDisc)/E(EoP)    | P0     | A          |
| LLM 边界       | /api/chat/send          | T/I/S(Spoofing)         | P0     | C          |
| 鉴权/身份      | X-Anonymous-Id          | S/E                     | P1     | A          |
| 文件上传       | multipart/form-data     | T/D                     | P1     | A + B      |
| 并发临界       | budgetGuard.reserveCas  | T/D(race)               | P1     | harness-5  |
```

必须在 `AskUserQuestion` 确认优先级后才进 Step 2。

---

### Step 1 · 理解被测范围（AskUserQuestion）
- 新功能 / 含糊范围：问 **必问 4 条 + 任务特化 4 条**（`references/questions.md`）
- **暴力模式** · 加问 **Q11-Q14**（威胁优先级 / fuzz 预算 / chaos 范围 / LLM 红队深度）
- 用户指定了代码文件和用例清单：**跳过**提问

### Step 2 · 探索（并行）
同一条消息内并发调用：
- `Read` 被测代码
- `Grep` 现有测试（看 pattern + 已有 fixture / factory）
- `Read` 测试配置（vitest.config / pytest.ini / jest.config）
- `Grep` 可疑 anti-pattern：`mock` 滥用、`sleep(N)` 等异步、弱断言
- **暴力模式** · `Read` `references/attack-payloads.json`（载荷库）+ 针对 LLM 代码 `Read` `references/llm-redteam.md`

**CRITICAL**：不准凭记忆断言被测代码行为。先读源码。

### Step 3 · 做计划
- `TaskCreate` 列：**用例清单 + 风险矩阵 + 覆盖策略**
- 用例 = `it('what should happen when ...', ...)`，先**写名字不写实现**
- **暴力模式** · 威胁矩阵每一行至少对应 1 条定向用例；Fuzz property 要先设计"什么性质必须成立"（`references/fuzz-recipes.md` 心法）
- `AskUserQuestion` 把用例清单给用户确认，用户点掉不要的

### Step 4 · 写测试

#### 默认 QA 模式
- **AAA 模式**：Arrange / Act / Assert 三段清楚
- **小文件**：一个 test file 测一个 module，不超过 500 行
- **真实依赖优先**：内存 DB / testcontainer / fixture；mock 仅用于**第三方外部服务**
- **参数化**：`it.each` / `describe.each` 覆盖变体，不许复制粘贴
- **断言要有"意图"**：测**公开契约**而非实现细节

#### 暴力模式三轮

**Round A · 定向攻击**（按 Step 0 威胁矩阵逐项）
- 每条威胁 ≥ 1 用例
- 用例名 = "should reject/degrade safely when attacker does X"
- 载荷从 `attack-payloads.json` 拉
- 预期：攻击打不穿（reject/sanitize/rate-limit/audit-log）；打穿了 = bug

**Round B · Fuzz**（fast-check / hypothesis / jazzer.js）
- 看 `templates/fuzz.config.template.ts` 抄起手
- property 四种设计：idempotence / reversibility / commutativity / oracle
- 预算：≥ 1000 runs，启用 shrinking
- 反例 → 压入永久 regression fixture（`tests/regression/` + 附来源 commit）

**Round C · LLM 红队**（被测涉及 LLM 必做）
- 按 `references/llm-redteam.md` 的 25 prompt injection + 12 jailbreak 跑
- 对 Kevin 项目：专测 `backend/src/agents/config.ts` 的 SYSTEM_IDENTITY 规则零/一
- 有效攻击的完整 prompt 记录到 `.claude/llm-redteam-{date}.md` → 反哺 prompt 加固

### Step 5 · 收尾 Harness Loop（反向验证是灵魂）

**Stage 1 — 自我验证**：
```bash
./harness-test.sh    # 默认 QA: 3 步
./harness-chaos.sh   # 暴力模式: 额外跑故障注入 + race（`templates/chaos-harness.sh`）
```

默认 QA harness 三步门禁：
1. 全部测试必须绿
2. 覆盖率达标（阈值在项目里配）
3. **Mutation smoke test**：关键路径 mutation 必须全 killed

暴力模式**追加**两步：
4. **故障注入轮**：按 `references/chaos-patterns.md` 注入超时/断网/DB 断连/时钟跳变/OOM
5. **Race 轮**：并发 N=100 call 同一 endpoint，断言无双花 / 一致性

失败按 CLAUDE.md 失败升级协议（见 `references/harness.md`）。

**Stage 2 — 独立审查（异步）**：

默认 QA：
```python
Agent(subagent_type="qa-expert", model="opus", ...)
```

暴力模式 **双审并发**：
```python
Agent(subagent_type="qa-expert",       model="opus", ...)  # 测试设计
Agent(subagent_type="security-auditor", model="opus", ...)  # 攻击面覆盖
```

**别等它，直接结束回合**。

### Step 6 · 极简摘要
- 用例数 + 通过 N / 失败 0
- 覆盖率 %（行 / 分支 / 函数）
- **未覆盖区 + 为什么**（诚实说明）
- **暴力模式** · 追加：**抓到的 bug 列表**（入 gap-tracking）+ **有效 LLM 攻击 payload**（入 prompt 加固集）
- 下一步

---

## 📝 核心契约（摘要 · 完整清单见 `references/contract.md`）

### 共用
- **MUST** 测试三类路径：happy / edge / error
- **MUST** 新测试都**故意破坏源代码跑一次**确认测试能红
- **MUST** 相似用例参数化
- **MUST** 测试命名 = "what should happen when ..."
- **NEVER** mock 被测单元自己的依赖（除外部第三方）
- **NEVER** mock 数据库
- **NEVER** 测试引用实现细节
- **NEVER** 单纯追覆盖率数字
- **NEVER** `sleep(N)` 等异步
- **CRITICAL** 集成测试必须跑真实 DB / 真实 API contract

### 🆕 暴力模式专属
- **MUST** Step 0 威胁建模矩阵落地到 `.claude/threat-model-{date}.md`
- **MUST** Fuzz 反例压入永久 regression（防二次回归）
- **MUST** LLM 红队有效攻击 prompt → 反哺到防御训练集 `.claude/llm-redteam-{date}.md`
- **NEVER** 把可直接执行的 exploit 写进 repo（只留 pattern / shape）
- **NEVER** chaos/fuzz 跑生产环境 DB / 真外部 API（只在隔离环境）
- **CRITICAL** 发现的真 bug 必须同步进项目 gap-tracking，不能只留在测试报告里自嗨

---

## ❓ 必问 4 条（启动 · 完整 10 问 + 暴力模式 4 问见 `references/questions.md`）

1. 被测单元的**不变量**是什么？（哪些行为变了就是 bug）
2. 关键路径 vs 次要路径的覆盖策略——全覆盖 还是 抓核心？
3. 依赖策略：哪些**必须真实**（DB/队列），哪些可以用测试替身？
4. 集成范围优先哪层：单元 / 集成 / E2E？

**暴力模式加问**（Q11-Q14）：
5. 攻击优先级：HTTP / DB / LLM / 鉴权 / 上传 / 并发——哪几个是 P0？
6. Fuzz 预算：≥1000 runs 一轮（默认） / 5000 runs 深跑 / 只跑 100 runs 冒烟
7. Chaos 范围：网络延迟 / DB 断连 / 时钟跳变 / 全开（Chaos Monkey 模式）
8. LLM 红队深度：只测身份规则 / 含 jailbreak / 含 hallucination / 全套含 cost abuse

---

## 🛠️ Harness 使用

**首次在新项目用本 skill**：
```bash
cp ~/.claude/skills/gstack/test-skill/templates/harness.sh.template ./harness-test.sh
# 暴力模式再拷：
cp ~/.claude/skills/gstack/test-skill/templates/chaos-harness.sh ./harness-chaos.sh
chmod +x ./harness-*.sh
# 按测试框架 + 覆盖率工具 + fuzz/chaos 工具编辑命令
```

已有项目优先用 `pnpm test` / `pytest` / `make test` 等。

详见 `references/harness.md`。

---

## 📤 产出落点

- **测试代码**：紧邻被测代码（`foo.ts` + `foo.test.ts`）或 `tests/` 目录（沿用项目 pattern）
- **测试报告**：`.claude/test-report-{YYYY-MM-DD}.md` 含用例 + 覆盖率 + 未覆盖区
- **暴力模式专属**：
  - `.claude/threat-model-{date}.md`（Step 0 产出）
  - `.claude/llm-redteam-{date}.md`（有效攻击 prompt 记录）
  - `tests/regression/` （Fuzz 找到的反例永久化）
- **决策笔记**：`~/Documents/Obsidian/Projects/test-decisions/{date}-{module}.md`（重大策略决定才写）

---

## 🔗 See also

### 共用
- `references/contract.md` · 完整 MUST/NEVER/CRITICAL 清单
- `references/harness.md` · 不同测试框架的 harness 适配
- `references/questions.md` · 10 必问 + 4 暴力专问
- `templates/harness.sh.template` · 三步门禁起手
- `templates/test-plan.md` · 用例清单 + 风险矩阵模板

### 🆕 暴力模式专用
- `references/threat-modeling.md` · STRIDE + 攻击面矩阵产出流程
- `references/attack-payloads.json` · XSS/SQLi/Unicode/path/json-extreme/oversize/bomb 12 类静态载荷
- `references/fuzz-recipes.md` · fast-check/hypothesis/jazzer + property 设计心法
- `references/llm-redteam.md` · 25 prompt-injection + 12 jailbreak + hallucination/token/cost abuse
- `references/chaos-patterns.md` · toxiproxy/pumba/sinon/DB KILL/disk full/kill -9 模式
- `templates/fuzz.config.template.ts` · fast-check + vitest 起手
- `templates/attack-payloads.json` · 可拷贝 fixture
- `templates/chaos-harness.sh` · Chaos Round + Race Round 脚本

### 组合现有 skill
- `testing-anti-patterns` · 反模式全面清单
- `test-driven-development` · TDD 流程（适合新功能）
- `condition-based-waiting` · 避免 sleep 异步
- `verification-before-completion` · Step 5 Stage 1 兜底
- `systematic-debugging` · 暴力模式抓到 bug → 联动它复现
- `ui-test` / `performance-analysis` / `route-tester` · 分工见"💤 不触发"

---

## 🔄 暴力模式 → dev-skill 闭环

`test-skill --harsh` 抓到 bug → `/dev-skill` 修 → 回 `test-skill` 把反例压成永久回归用例。
这个闭环保证每次攻击找到的洞都不会"二次回归"。
