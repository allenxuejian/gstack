# test-skill · 威胁建模（仅暴力模式 Step 0）

> 进暴力模式第一件事：**先当攻击者**。产出"攻击面矩阵"再写测试。
>
> 核心框架：**STRIDE**（微软经典六维）。参考实现：OWASP Threat Dragon、MITRE ATT&CK。

---

## 🎯 产出物

一个 `.claude/threat-model-{YYYY-MM-DD}.md`，含：
1. 被测系统的**攻击面清单**（所有外部入口）
2. 每个攻击面对应的 **STRIDE 威胁分类**
3. 优先级打分（**DREAD** 或简化版 P0/P1/P2）
4. 每条威胁对应的**测试轮**（A 定向 / B fuzz / C LLM / harness-chaos / harness-race）

---

## 🧭 STRIDE 六维（记不住就翻）

| 字母 | 中文 | 威胁类型 | 典型攻击 |
|---|---|---|---|
| **S** | Spoofing | 身份伪造 | 冒充他人 session / 伪造 JWT / 社工 |
| **T** | Tampering | 数据篡改 | 改请求参数 / SQLi / 中间人 |
| **R** | Repudiation | 抵赖 | 无审计日志 / log 可篡改 / 操作不可追溯 |
| **I** | Information Disclosure | 信息泄露 | 越权读 / 报错吐 stack trace / timing side-channel |
| **D** | Denial of Service | 拒绝服务 | 流量洪水 / zip-bomb / 正则回溯炸 / 资源耗尽 |
| **E** | Elevation of Privilege | 权限提升 | 普通用户变管理员 / IDOR / 容器逃逸 |

---

## 🗺️ 攻击面枚举 · 七类必查清单

对任意被测系统，按这七类问一遍"这里有没有攻击面"：

1. **HTTP / API 边界** — 所有对外 endpoint · 请求参数/header/body 都是敌区
2. **数据库边界** — ORM/查询构造/迁移/备份导入
3. **LLM / 外部 AI 边界** — prompt 注入、模型输出当代码执行、工具调用劫持
4. **鉴权 / 会话** — token/cookie/anonymous_id 所有身份标识
5. **文件上传 / 外部资源** — multipart / URL fetch / 头像 / 附件
6. **并发临界区** — 任何写操作同时可能被多个客户端触发（CAS/lock/队列）
7. **依赖供应链** — npm/pip/docker-image/第三方 API（SSRF/依赖投毒）

---

## 🎲 优先级打分 · 简化 DREAD

每个威胁按 1-3 打分，取平均：

- **D**amage（危害程度）：1=体验问题 / 2=数据泄露或错误 / 3=资金或人身损失
- **R**eproducibility（复现难度）：1=需特权+工具 / 2=普通技巧 / 3=公网匿名可复现
- **E**xploitability（利用难度）：1=需高技术 / 2=中 / 3=脚本小子级
- **A**ffected users（受影响用户）：1=单用户 / 2=一批 / 3=全平台
- **D**iscoverability（发现难度）：1=闭源+混淆 / 2=逆向可见 / 3=错误信息直接暴露

**总分 ≥ 2.5 → P0**（必测） · **1.5-2.5 → P1** · **< 1.5 → P2**（记录不一定测）

**Kevin 快手版**（不用算）：
- P0：可导致资金损失 / 生产数据外泄 / LLM 被劫持发大量请求（cost abuse）/ auth 绕过
- P1：拒绝服务 / 低权越权 / 小范围数据泄露
- P2：仅体验瑕疵 / 需特殊条件

---

## 📋 攻击面矩阵模板

```markdown
# {项目名} · 威胁建模 {YYYY-MM-DD}

## 被测范围
- 入口文件：backend/src/controllers/diagnosisController.ts
- 数据流：HTTP → 鉴权 → service → qwenVlAdapter → MongoDB → response
- 涉及外部：Qwen-VL API (https://dashscope.aliyuncs.com), MongoDB

## 攻击面矩阵

| 攻击面         | 入口                          | STRIDE  | DREAD | 优先级 | 测试轮       | 用例名草稿 |
|----------------|-------------------------------|---------|-------|--------|--------------|-----------|
| HTTP body      | POST /api/diagnosis/image     | T, D    | 2.4   | P1     | A + B        | reject oversized image / reject non-image MIME |
| HTTP header    | X-Anonymous-Id (伪造)         | S, E    | 2.6   | P0     | A            | should not leak other anon's sessions when id forged |
| DB 查询        | kb/disease/:id                | T, I, E | 2.8   | P0     | A            | should reject NoSQLi payload / should enforce id format |
| LLM prompt     | agentController.send          | T, I, S | 2.8   | P0     | C (LLM 红队) | SYSTEM_IDENTITY 规则零不被 jailbreak 打穿 |
| 文件上传       | multipart image field         | T, D    | 2.4   | P1     | A + B        | zip-bomb rejected / polyglot JPG+JS rejected |
| 并发 · CAS     | budgetGuard.reserveBudget     | T, D    | 2.2   | P1     | harness-race | 100 并发 reserve 预算无双花 |
| 外部 Qwen-VL   | adapter 返回伪 JSON           | T, D    | 2.2   | P1     | B (fuzz)     | 畸形 JSON / 超长响应 / 截断不崩 |

## 本轮暴力测试预算
- Fuzz runs: 2000
- Chaos 范围: 网络延迟 + DB 断连
- LLM 红队深度: 身份规则 + jailbreak（暂不做 hallucination metrics）
- 层次分布: Round A 15 用例 / Round B 3 property / Round C 12 prompt
```

---

## 🔍 常见遗漏点（面试题式自检清单）

进 Step 2 之前过一遍，漏了就补：

- [ ] **输入编码陷阱**：Unicode BiDi / 零宽字符 / emoji ZWJ / 非法 UTF-8 byte
- [ ] **数值极端**：NaN / Infinity / -0 / 超 2^53 / 负数 / 空字符串解析成 0
- [ ] **时间陷阱**：时区漂移 / 闰秒 / DST / 超 2038 / 负时间戳 / 未来时间
- [ ] **长度 & 尺寸**：空 / 1 / MAX_INT / 超大（1MB body, 10^6 array len）/ 深嵌套（JSON 1000 层）
- [ ] **路径穿越**：`../`、`..\\`、绝对路径、符号链接、URL encoding double-encode
- [ ] **错误吐信息**：500 是否泄露 stack / 用户不存在 vs 密码错 响应差异（timing/text）
- [ ] **竞态**：check-then-act（TOCTOU）/ 先减库存再扣钱的倒置
- [ ] **资源耗尽**：正则 ReDoS / JSON.parse 炸栈 / 连接池泄漏 / 未关闭的 fd
- [ ] **LLM 专属**：工具调用能 bypass 权限吗？输出能被当 HTML 渲染吗？上下文能被投毒吗？

---

## 🎯 对 Kevin 现有项目的预设威胁（可直接抄）

### ding-director（AI 疫病诊断）
- `SYSTEM_IDENTITY` 规则零/一 → jailbreak / prompt injection 打穿（说"我是 GPT"）
- `qwenVlAdapter.parseResponse` → Qwen 返回畸形 JSON 导致解析崩溃
- `diagnosisController /image` → 伪造 MIME 的 polyglot 文件
- `kbShowDetail` 跳 knowledge.html → XSS via disease name
- `budgetGuard.reserveCas` → 并发超预算（已踩过 issue #8，常态化扫）
- `/api/kb/disease/:id` → NoSQLi 注入 / IDOR 越权读

### ad 项目（Meta/Newsbreak 投流）
- 脚本参数注入（用户输入未转义拼 Meta Ads API）
- Newsbreak cookie 过期后的 silent fail
- MongoDB kv_* write 被绕过前缀校验

### 通用
- JWT 伪造（`@fastify/jwt` 配置错了）
- Rate limit 能被不同 anon_id 绕过吗

---

## 🔗 See also
- `references/attack-payloads.json` · 给每条威胁匹配具体载荷
- `references/llm-redteam.md` · LLM 边界深入
- `references/chaos-patterns.md` · 并发 & 故障类威胁的执行工具
- OWASP Threat Dragon（图形化工具）· 可视化更清晰，但 markdown 也够用
