# test-skill · 完整提问模板（≥10 问）

用 `AskUserQuestion` 一次问完。**跟进 / 「只补一两个用例」 / 用户已列清单**跳过。

---

## 必问 4 条

### Q1 · 不变量
```
问题：被测单元的不变量是什么？哪些行为变了就是 bug？
选项：
- 列在 PRD / spec 里（指路）
- 我来列：<具体行为>
- 没有强不变量，测"别 crash"就行
- 不知道，你读代码后自己推理
```

### Q2 · 覆盖策略
```
问题：关键路径 vs 次要路径的覆盖策略？
选项：
- 全路径覆盖（要求严格，适合 payment/auth）
- 抓核心（80% 关键路径即可）
- 只测新增/修改的代码（回归测试）
- 只做冒烟（最低限度）
```

### Q3 · 依赖策略
```
问题：哪些依赖必须真实，哪些可以替身？
选项：
- DB 真实 + 外部 API mock（Recommended，行业默认）
- 全真实（testcontainers 起全套）
- 全 mock（只做单元测试）
- 按业务判断，你决定后给我确认
```

### Q4 · 层次优先
```
问题：测试层次优先哪个？
选项：
- 单元测试为主（快，适合算法/工具）
- 集成测试为主（适合业务逻辑/API）
- E2E 为主（适合用户旅程）
- 金字塔：单元多 > 集成中 > E2E 少
```

---

## 特化 4 条（按任务需要补）

### Q5 · Mutation 范围
```
问题：Mutation test 对哪些路径跑？（跑全量太慢）
选项：
- 只对核心目录（src/core/*, src/payment/*）
- 对本轮 diff 涉及的文件
- 全量（接受 >10 分钟跑 harness）
- 不跑 mutation（信任传统 coverage）
```

### Q6 · Flaky 容忍
```
问题：测试不稳定（flaky）怎么处理？
选项：
- 零容忍：flaky = bug，必须修
- 自动 retry 2 次（接受偶发 flaky）
- 按模块判断
- 先写再说
```

### Q7 · 性能断言
```
问题：要不要加性能断言？
选项：
- 要：关键函数 < XX ms
- 只断言相对关系（新版不能比旧版慢 > 10%）
- 不要，性能交给 profiler
- 按模块判断
```

### Q8 · 测试数据来源
```
问题：测试数据从哪来？
选项：
- factory / builder pattern 生成（Recommended）
- fixture 文件（.json / .yaml）
- 真实 prod 采样 + 脱敏
- 随机 (property-based)
```

---

## 补充 2 条凑 10

### Q9 · Snapshot 测试
```
问题：用 snapshot 测试吗？
选项：
- 不用（snapshot 容易乱改 + 失去意图）
- 只对 UI / 序列化输出用
- 全面用（适合 regression heavy）
- 按模块判断
```

### Q10 · 失败诊断
```
问题：测试失败时要怎么打印？
选项：
- 默认输出就够
- 失败时 dump 完整 state（ DB / context）
- 接入 error tracking（Sentry）
- 按严重度分级
```

---

## 🔴 暴力模式专属 Q11-Q14（v2 新增）

仅当进暴力模式（`/test --harsh` / 红队触发词）时追加。

### Q11 · 攻击优先级
```
问题：本轮暴力测试的攻击优先级？（多选，对应威胁建模 P0）
选项：
- HTTP 边界（请求参数 / body / header）
- DB 边界（SQLi / NoSQLi / IDOR）
- LLM 边界（prompt injection / jailbreak / 身份规则）
- 鉴权 / 会话（token / cookie / anonymous_id）
- 文件上传（MIME 伪造 / 路径穿越 / zip bomb）
- 并发临界（race / TOCTOU / 双花）
- 依赖供应链（SSRF / npm 投毒 / 第三方 API 伪造）
```

### Q12 · Fuzz 预算
```
问题：Round B Fuzz 跑多久？
选项：
- 冒烟：100 runs · < 5 秒（只确认 property 成立）
- 常规：1000 runs · < 30 秒（Recommended · 抓中度 bug）
- 深度：5000 runs · < 3 分钟（适合发版前 / 关键路径）
- Nightly：50000 runs · < 30 分钟（CI 异步跑）
```

### Q13 · Chaos 范围
```
问题：harness 第 4 轮故障注入做哪些？（多选）
选项：
- 网络延迟 / 断连（toxiproxy）
- 时间故障（DST / 2038 / 闰日）
- 进程 kill -9 + 重启一致性
- DB 连接耗尽 / 慢查询 / 主从切换
- 资源耗尽（fd / 磁盘满 / OOM）
- 全开 · Chaos Monkey 模式（随机注入，适合大版本）
```

### Q14 · LLM 红队深度
```
问题：Round C LLM 红队测到哪一层？
选项：
- 只测身份规则（规则一：不承认是 GPT/Claude）· 快
- 身份 + 合规红线（规则一 + 规则四：不提供危害公共安全信息）
- 身份 + 合规 + jailbreak（+ 25 prompt injection + 12 jailbreak 全套）
- 全套含 hallucination + resource abuse（+ 编造法规检测 + token/cost 炸弹）
- N/A（被测代码不涉及 LLM）
```

---

## 提问时机决策树（v2 · 含暴力模式分流）

```
用户给了明确用例清单? ──Y──▶ 跳过提问
     │
     N
     │
     ▼
进暴力模式? ──Y──▶ 必问 4 + Q11-Q14 暴力专问（共 8 个）
     │                                │
     N                                 ▼
     │                          Step 0 威胁建模后才进 Step 2
     ▼
单文件 / 已有 pattern 可参考? ──Y──▶ 只问必问 4 条
     │
     N
     │
     ▼
新模块 / 关键模块 / 无现成 pattern? ──Y──▶ 必问 4 + 特化 4（共 8 个）
```

```
用户给了明确用例清单? ──Y──▶ 跳过提问
     │
     N
     │
     ▼
单文件 / 已有 pattern 可参考? ──Y──▶ 只问必问 4 条
     │
     N
     │
     ▼
新模块 / 关键模块 / 无现成 pattern? ──Y──▶ 必问 4 + 特化 4（共 8 个）
```
