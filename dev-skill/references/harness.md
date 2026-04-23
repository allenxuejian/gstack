# dev-skill · Harness 适配指南

Harness 是**自我验证 loop 的门禁**——它是唯一能声明「完成」的判据。跑绿才算完成。

## 核心原则

1. **Harness 住在项目里，不住在 skill 里**。每个项目的技术栈/构建命令不同，skill 只提供模板。
2. **首次在一个新项目用 dev-skill**，把 `templates/harness.sh.template` 拷到项目根目录 `harness.sh`，按栈编辑命令，**用 AskUserQuestion 确认**。
3. **项目已有 `harness.sh` / `Makefile` / package.json `scripts` 的**：优先用项目自带（`make check` / `bun run ci` / `pnpm verify`）。
4. **Harness 必须 `set -e`**：任一命令失败必须中断，不许"跑到底再报告"。

---

## 首次适配流程

```
Claude: 检测到项目没有 harness.sh。我准备拷贝模板并按检测到的技术栈填命令：
        [展示 detected stack + 候选命令]
        是否确认？
User:   确认 / 改一下 xxx
Claude: 写入 ./harness.sh + chmod +x
```

检测技术栈靠文件：
- `package.json` 有 `bun.lockb` / `pnpm-lock.yaml` / `package-lock.json` → Node.js
- `pyproject.toml` / `requirements.txt` → Python
- `go.mod` → Go
- `Cargo.toml` → Rust
- `deno.json` → Deno

---

## 常见栈的 harness 命令

### Node.js (Bun)
```bash
bun run lint && bun run typecheck && bun test && bun run build
```

### Node.js (pnpm)
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

### Python
```bash
ruff check . && mypy . && pytest && python -m build
# 或无打包
ruff check . && mypy . && pytest
```

### Go
```bash
go vet ./... && go test ./... && go build ./...
```

### Rust
```bash
cargo clippy -- -D warnings && cargo test && cargo build --release
```

---

## Harness 失败处理（对应 CLAUDE.md 失败升级协议）

- **第 1 次失败** → 读 log，定位，修，重跑。
- **第 2 次失败** → 换**本质不同**的方法。说明新方法为什么避开了前次失败原因。
- **第 3 次失败** → 列 3 个独立假设，逐一验证排除，再行动。
- **第 4 次失败** → **暂停**，`AskUserQuestion` 汇报已试方法 + 已排除假设 + 建议替代方案。

**禁止**：连续用相同思路重试；跳级。

---

## 调 fork-verifier（Stage 2）

Stage 1 harness 跑绿后，异步 fork 一个独立审查。**不等结果，直接结束回合**。

```python
Agent(
  subagent_type="code-auditor",
  model="opus",   # CLAUDE.md 铁律
  description="Dev diff audit",
  prompt="""
  本轮 diff：<关键改动概述 + 涉及文件>

  请审查：
  1. 安全问题（injection / auth / data leak）
  2. 回归风险（是否破坏已有 API / behavior）
  3. 复杂度（是否过度抽象 / 冗余）
  4. 破坏性改动（是否影响生产）

  报告 ≤200 字，严重度标记 (Critical / High / Medium / Low)。
  """
)
```

**备选 subagent**：`architect-reviewer`（架构角度）、`code-reviewer-pro`（资深全面审查）、`security-auditor`（仅涉及权限/加密时）。

---

## Harness 不是 CI

Harness 是**本地快速门禁**（通常 <2 分钟），目标是在本地就挡住 80% 问题。CI 跑完整矩阵（多平台、多版本、E2E），harness 不替代 CI。

- ✅ harness: lint + typecheck + unit test + build
- ❌ harness: E2E browser test（太慢）、docker build（太慢）、performance benchmark
- ✅ CI: 以上所有 + 跨平台 + 集成测试

如果 harness 跑 >5 分钟 → 拆分 `harness.sh` + `harness-full.sh`，skill 默认用前者。
