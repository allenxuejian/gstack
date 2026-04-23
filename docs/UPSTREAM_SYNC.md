# Upstream Sync — rebase allenxuejian/gstack onto garrytan/gstack

这个 fork 承载 Kevin 的 5 个自定义 skill（research / dev / pm / ui / test）+ `_shared/` schemas。
每次 Garry Tan 发布新 upstream 版本时，按下面流程同步。

---

## 一次性 remote 配置（已完成，仅供参考）

```bash
cd ~/.claude/skills/gstack
git remote -v
# origin    https://github.com/allenxuejian/gstack.git (fetch/push)
# upstream  https://github.com/garrytan/gstack.git    (fetch/push)
```

---

## 日常升级流程

### Step 1 · 抓 upstream 新变更
```bash
cd ~/.claude/skills/gstack
git fetch upstream
git log upstream/main --oneline | head -10
```

### Step 2 · 预看 diff
```bash
# Kevin 自定义文件是否会受影响？
git log upstream/main..HEAD --oneline    # 我的本地 commits (Kevin skill)
git diff HEAD..upstream/main -- setup     # upstream setup 脚本有无改动
```

### Step 3 · Merge upstream
```bash
git merge upstream/main
# 解决冲突（Kevin skill 和 gstack 官方 skill 互不接触，正常情况零冲突）
# 如有冲突：
#   - 保留两边都有的（如 setup 脚本）走 upstream 版本
#   - Kevin skill 目录冲突 → 保留 ours（自己的）
```

### Step 4 · Push 更新到 fork
```bash
git push origin main
```

### Step 5 · 触发 gstack-upgrade
```bash
/gstack-upgrade     # 在 Claude Code 里执行
```
或命令行：
```bash
export PATH="$HOME/.bun/bin:$PATH"
cd ~/.claude/skills/gstack && ./setup --host claude
```

---

## Kevin skill 清单（fork 自有，升级时必保留）

```
~/.claude/skills/gstack/
├── research-skill/    # 技术调研
├── dev-skill/         # 开发 + harness
├── pm-skill/          # PRD + schema 门禁
├── ui-skill/          # 交互原型 + Playwright smoke
├── test-skill/        # 双形态测试（含暴力模式）
└── _shared/
    ├── kevin-personal-constraints.md
    └── schemas/
        ├── prd-schema.yaml
        └── handoff-schema.yaml
```

---

## 当冲突不可避免时

如果某次 upstream 改动**和 Kevin skill 目录命名冲突**（极低概率：upstream 新增同名 skill）：
1. 重命名 Kevin skill（如 `research-skill` → `kv-research-skill`）
2. 全量替换 SKILL.md 和 references/ 里的路径引用
3. 更新 CLAUDE.md 路由规则

---

## 不可做

- ❌ **不要 rebase**（会改写 commit history，后面难收拾）
- ❌ **不要 `git reset --hard upstream/main`**（会丢 Kevin skill）
- ❌ **不要直接推 upstream**（你没权限，也不应该污染 Garry 的 repo）
- ❌ **不要在 fork 的 `main` 上做实验**（开 feature branch，merge 回来）

---

## 如果搞砸了

`/gstack-upgrade` 会跑 `git reset --hard origin/main`，**但 origin = 你的 fork**，所以：
- 只要 fork 远端 `allenxuejian/gstack:main` 里有 Kevin skill，**怎么都丢不了**
- fork 远端被自己不小心 force-push 搞坏 → GitHub 保留 ref log 30 天，能恢复

**真正的"最后防线"**：Kevin skill 的原文件在 session 起点 commit `656df0e3` 之前存在于 `~/.claude/skills/{dev,test,ui,pm,research}-skill/.bak`，但已删除。未来要备份：
```bash
# 每季度跑一次（参考）
mkdir -p ~/Documents/backup-kevin-skills-$(date +%Y%m%d)
cp -R ~/.claude/skills/gstack/{research-skill,dev-skill,pm-skill,ui-skill,test-skill,_shared} \
  ~/Documents/backup-kevin-skills-$(date +%Y%m%d)/
```
