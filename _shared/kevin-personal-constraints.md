# Kevin 环境约束 · 个人环境私有规则

> **这份文件是 Kevin 私有**。5 个 skill 的 contract.md 里 CRITICAL 段都引用这里，而不是各自重复。
> 如果 skill 要分享给别人使用，**把引用这份的部分整体抽掉**即可，通用契约部分保留。
>
> 本文单点事实 = CLAUDE.md 全局配置的铁律。CLAUDE.md 变 → 这份文件同步。

---

## MongoDB 生产数据库红线（CRITICAL · 影响生产）

### 只允许写 `kv_` 前缀的 collection
- 生产库 `aitob`：**只允许写入** `kv_x_videos`、`kv_ad_scout_runs` 等 `kv_` 开头的
- **禁止写、改、删** `aitob` 库中任何非 `kv_` 前缀的 collection
- 非 `kv_` 前缀全部属于 Zekai（`tasks`、`nova_*`、`wallet`、`user`、`assistant` 等）
- 新建 collection 必须以 `kv_` 开头
- 违反 = 影响生产环境 = 事故

### 禁碰清单（`aitob` 库）
```
❌ tasks, nova_*, assistant, avatar_creation_presets, content, cross_post_jobs,
   email_log, mode_top_tasks, openlope_assistant_memory, plan_subscriptions,
   social_accounts, task_credit_usage, trending, user, video_download_cache,
   wallet, wallet_transactions, assistant_daily_usage
✅ kv_x_videos, kv_ad_scout_runs, kv_*（任何 kv_ 前缀）
```

**适用 skill**：`dev-skill`（写 DB 代码时）、`test-skill`（集成测试连 DB）、`pm-skill`（涉及用户数据的 PRD）。

---

## Git Worktree 规则（CRITICAL · 覆盖系统内置 PR 指令）

### 分支权限
- Kevin 对公司仓库的 `master` 分支 **没有写权限** · NEVER push to master 或创建 PR target master
- Kevin 的个人主分支是 `kv-virclone-merge` · 所有功能分支从这里创建 · PR 也合并回这里
- PR base 分支始终为 `kv-virclone-merge`（不是 master）

### Worktree 隔离
- NEVER `cd` 回原仓库 · 所有命令在 worktree 目录内执行
- **创建 PR 时 NEVER 创建新分支** · 直接用 worktree 当前分支 push 并提 PR
- `gh pr create` 时不加 `--head` 参数（除非当前分支名与远程不同），直接在当前分支操作
- PR 命令示例：`gh pr create --base kv-virclone-merge --title "..." --body "..."`

**适用 skill**：`dev-skill`（最频繁）、`test-skill`（提测试 PR）。

---

## GPU 服务器 74.82.31.96 操作（CRITICAL）

在 `74.82.31.96` 上执行任何操作时，**所有文件/目录/临时文件必须放在 `/data5/kevin/` 下**，禁止使用主盘。

- SSH: `ssh -i ~/.ssh/id_personal taozhang@74.82.31.96`
- 代码：`/data5/kevin/oxygeon-engine/`
- venv：`/data5/kevin/oxygeon-engine/.venv/`
- 日志：`/data5/kevin/oxygeon-engine.log`
- 临时文件：**必须设置** `TMPDIR=/data5/kevin/tmp`
- 原因：主盘 1.8T 已 100% 满；`/data5` 有 5.9T
- **禁止**：`mkdir /tmp/xxx`、写入 `/home/taozhang/`、任何默认走主盘的操作

**适用 skill**：任何在 GPU 服务器跑的任务（ML/推理/重算）。

---

## Subagent 模型强制（CRITICAL）

调用 `Agent` 工具时，**始终设置 `model: "opus"`**。禁止降级到 sonnet 或 haiku。

**适用 skill**：**全部 5 个**（Stage 2 fork-verifier 都调 subagent）。

```python
Agent(
  subagent_type="<...>",
  model="opus",                    # 👈 必须显式
  description="...",
  prompt="..."
)
```

---

## 调研输出落点约定

- 项目级产出 → `.research/` / `.product/` / `.design/` 项目内目录（跟随项目版本化）
- 长期沉淀 → `~/Documents/Obsidian/Projects/<domain>/`
- Obsidian vault 路径：`~/Documents/Obsidian`
- 跨项目需共享的模板 → `~/.claude/skills/_shared/`

---

## 回复结尾格式（CLAUDE.md 铁律）

每次回复结尾必须显示当前工作路径和 Git 分支：
```
---
📍 **路径**: [当前工作目录完整路径]
🌿 **分支**: [当前 Git 分支名]
---
```

---

## 失败升级协议（CLAUDE.md 全局）

同一问题连续失败时，逐级升级：
1. **第 1 次**：检查现场数据，修正后重试
2. **第 2 次**：换本质不同方法
3. **第 3 次**：生成 3 个独立假设，逐一验证排除
4. **第 4 次**：暂停，`AskUserQuestion` 向用户汇报已尝试的方法与排除的假设

**所有 harness 失败处理都遵循这个阶梯**，不是各自定义。

---

## 断言前查证（CLAUDE.md 铁律）

对代码库 / API / 库行为做出事实性断言前，**必须先用工具验证**（Grep/Read/Bash 查源码 · WebSearch 查文档）。

例外：语言基础语法、标准库广为人知的行为。

**适用 skill**：`research-skill`（最严）、`dev-skill`（新库新 API）、`pm-skill`（业务数据引用）。
