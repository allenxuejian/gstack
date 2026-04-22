# research-skill · Harness 适配指南

研究 skill 的 harness 有**三项门禁**：
1. Citation 完整性（每个断言有来源）
2. Link 可达性（所有 URL HEAD 200）
3. Code snippet 语法正确（能被 parser 解析）

---

## 核心原则

1. **Harness 跑在报告上，不跑在代码上**（区别于 dev/test skill）。
2. Citation 检查用 **regex + 上下文距离**（断言词 + 300 字符内必须有 URL 或 src 路径）。
3. Link 检查**并发**（不然调研完要等几分钟）。
4. Snippet 检查按代码块语言分派到对应 parser。

---

## harness.sh 三步实现（参考模板）

### 步骤 1 · Citation 密度

```bash
# 抽出所有断言词所在行，检查附近是否有引用
ASSERT_PATTERN='\<(MUST|应该|必须|推荐|建议|should|must|recommend)\>'
CITATION_PATTERN='https?://|`src/|`\./|\[.*\]\(.*\)|<cite'

# 每个断言行的前后 3 行窗口要有引用
python3 -c "
import re, sys
with open('$REPORT') as f:
    lines = f.read().split('\n')
bad = []
for i, line in enumerate(lines):
    if re.search(r'$ASSERT_PATTERN', line, re.I):
        window = '\n'.join(lines[max(0,i-3):min(len(lines), i+4)])
        if not re.search(r'$CITATION_PATTERN', window):
            bad.append(i+1)
if bad:
    print(f'❌ {len(bad)} 个断言缺引用: lines {bad[:10]}')
    sys.exit(1)
print(f'✅ citations OK')
"
```

### 步骤 2 · Link 可达性（并发）

```bash
# 抽出所有 URL 并发检查
grep -oE 'https?://[^ )\"'\''<>]+' "$REPORT" | sort -u | \
  xargs -P 10 -I{} sh -c '
    code=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$1" || echo "TIMEOUT")
    if [ "$code" != "200" ] && [ "$code" != "301" ] && [ "$code" != "302" ]; then
      echo "❌ [$code] $1"
      exit 1
    fi
  ' sh {}
```

### 步骤 3 · Snippet 语法检查

按代码块语言分派：
```bash
# 抽出 ```ts 块 → 用 tsc --noEmit 检查
# 抽出 ```python 块 → 用 python -c "compile(open('...').read(), '<string>', 'exec')"
# 抽出 ```go 块 → 用 gofmt -e
# 等等
```

完整模板见 `templates/harness.sh.template`。

---

## Citation 格式约定

报告里引用推荐以下格式之一（harness 都能识别）：

```markdown
- 推荐使用 `react-query`，因为其缓存策略优于 SWR。[^1]

[^1]: React Query docs, https://tanstack.com/query/v5/docs/introduction (accessed 2026-04-18)
```

或内联：
```markdown
推荐 Bun 因其启动速度快 10x ([官方 benchmark](https://bun.sh/benchmarks))。
```

或源码引用：
```markdown
现有项目已用 Zustand（见 `src/store/user.ts:1`），统一栈首选继续用。
```

---

## Link 处理

**4xx/5xx/Timeout 的处理策略**：
- **4xx 404** → URL 写错了 / 页面被删除 → 找替代 URL 或删断言
- **5xx** → 服务挂了 → retry 一次，仍失败标记为"待确认"
- **Timeout** → 源站慢 → 接受（不算失败）但记录

**排除清单**（有些 URL 会阻止 HEAD）：
- `localhost` / 内网 IP → 跳过
- 需要 auth 的 URL（如 Notion / 内部 wiki）→ 跳过（标注）

---

## Snippet 快速语法检查

```bash
# TypeScript
echo "$TS_CODE" | bunx tsc --noEmit --allowJs /dev/stdin 2>&1

# Python  
python3 -c "import ast; ast.parse('''$PY_CODE''')"

# JSON
echo "$JSON" | python3 -m json.tool

# Bash
bash -n /dev/stdin <<< "$BASH_CODE"

# Go
echo "$GO_CODE" | gofmt -e
```

**注意**：harness 只检查**语法**，不检查**运行时正确性**。跑通 snippet 是 Step 2 探索时由人工确认的。

---

## Harness 失败处理（对应 CLAUDE.md 失败升级协议）

- **第 1 次** → 定位具体失败 citation / link / snippet → 修。
- **第 2 次** → 换本质方法：citation 找更权威的源；link 找替代 URL；snippet 换示例。
- **第 3 次** → 列 3 个假设：1. 引用源本身错 2. 报告措辞歧义 3. 工具检测误报。逐一验证。
- **第 4 次** → AskUserQuestion 汇报，讨论是否降低某项阈值。

---

## 调 fork-verifier (Stage 2)

```python
Agent(
  subagent_type="architect-reviewer",
  model="opus",
  description="Research skeptic review",
  prompt="""
  这份调研报告：<报告路径 + 核心结论>

  请做 skeptic review：
  1. 每个结论挑一个反面证据（存在吗？报告忽略了吗？）
  2. 如果你站反方支持候选 B（报告推荐的不是 B），你会怎么攻击推荐？
  3. 决策矩阵的维度是否选得合理？漏掉什么关键维度？
  4. 用户上下文是否被充分考虑？

  报告 ≤200 字，按严重度排序。
  """
)
```

**备选**：`search-specialist`（引用质量）、`code-reviewer-pro`（涉及代码选型时）。

---

## Harness 速度预算

- Citation 检查：< 5 秒
- Link 检查（并发）：< 30 秒（取决于链接数量和网速）
- Snippet 检查：< 10 秒
- **总计 < 1 分钟**

如果链接多，单独加 `harness-research-full.sh` 跑完整 link archive.org 检查。
