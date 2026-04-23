# pm-skill · Harness 适配指南

三项门禁：
1. **Schema 完整性** · yaml 符合 `prd-schema.yaml`
2. **AC 可测性** · 每条 AC `measurable==true` + given/when/then 非空
3. **数据引用** · 关键字段有 source

Stage 2 异步调 `product-manager` subagent 做 skeptic review。

---

## Stage 1 实现

### Schema 校验

有多种实现：
- **推荐**：`ajv-cli` 或 `check-jsonschema`（最严格）
- 次选：纯 Python `jsonschema` 包
- 兜底：Python 手写必填字段检查

模板里用的**兜底 + 关键字段手写**方案（不依赖外部工具链）。

```python
import yaml, sys, os

SCHEMA_ROOT = os.path.expanduser('~/.claude/skills/gstack/_shared/schemas/prd-schema.yaml')
with open(os.environ['PRD']) as f:
    prd = yaml.safe_load(f)

# 顶层必填
top_required = ['feature', 'problem', 'users', 'scenarios', 'solution',
                'acceptance_criteria', 'metrics', 'rollout', 'ui_brief']
for k in top_required:
    if k not in prd:
        print(f"❌ missing top field: {k}"); sys.exit(1)

# 深层：feature
for k in ['id', 'title', 'owner', 'status']:
    if not prd['feature'].get(k):
        print(f"❌ feature.{k} 为空"); sys.exit(1)

# problem.user_pain.source 必须非空
if not prd['problem'].get('user_pain', {}).get('source'):
    print(f"❌ problem.user_pain.source 必须有来源引用"); sys.exit(1)

# non_goals 至少 1
if len(prd['problem'].get('non_goals', [])) < 1:
    print(f"❌ problem.non_goals 至少 1 条"); sys.exit(1)

# alternatives_rejected 至少 1
if len(prd['solution'].get('alternatives_rejected', [])) < 1:
    print(f"❌ solution.alternatives_rejected 至少 1 个"); sys.exit(1)

# AC Gherkin + measurable
for i, ac in enumerate(prd['acceptance_criteria']):
    for field in ['given', 'when', 'then']:
        if not ac.get(field, '').strip():
            print(f"❌ AC #{i+1} 缺 {field}"); sys.exit(1)
    if ac.get('measurable') is not True:
        print(f"❌ AC #{i+1} measurable 必须为 true"); sys.exit(1)

# metrics.north_star 必须唯一对象
ns = prd['metrics'].get('north_star')
if not (isinstance(ns, dict) and ns.get('name') and ns.get('target')):
    print(f"❌ metrics.north_star 必须是 {{name, target, rationale}} 对象"); sys.exit(1)

# guardrails ≥ 1
if len(prd['metrics'].get('guardrails', [])) < 1:
    print(f"❌ metrics.guardrails 至少 1 个"); sys.exit(1)

# rollout.rollback_plan 非空
if not prd['rollout'].get('rollback_plan', '').strip():
    print(f"❌ rollout.rollback_plan 不能留空"); sys.exit(1)

# ui_brief 完整
ub = prd['ui_brief']
for k in ['screens', 'flow', 'design_system_ref']:
    if not ub.get(k):
        print(f"❌ ui_brief.{k} 必填 (下游 UI skill 门禁)"); sys.exit(1)
for s in ub['screens']:
    for k in ['id', 'goal', 'primary_action', 'states', 'variants_desired', 'priority_axes']:
        if not s.get(k):
            print(f"❌ ui_brief.screens[{s.get('id','?')}].{k} 必填"); sys.exit(1)
    if s.get('variants_desired', 0) < 3:
        print(f"❌ ui_brief.screens[{s['id']}].variants_desired 必须 ≥3"); sys.exit(1)

print("✅ schema validation passed")
```

### AC 可测性检查

已在 schema 校验里覆盖（每条 AC 必须有 given/when/then + measurable:true）。

额外可选增强：对每条 AC 的 then 做**动词检查**——不能只是"用户应该觉得..."这种主观感受，要是**可观察到的状态变化或系统动作**。

```python
VAGUE_VERBS = ['觉得', '认为', '感到', 'feel', 'think', 'perceive']
for i, ac in enumerate(prd['acceptance_criteria']):
    then_lower = ac['then'].lower()
    if any(v in then_lower for v in VAGUE_VERBS):
        print(f"⚠️  AC #{i+1} then 含主观词 `{v}` · 改成可观察的状态变化"); 
        # warning 不 fail，但提示
```

### 数据引用检查

不仅 user_pain.source 强制，metrics 里的定量表述也要溯源：

```python
# metrics 里每个带 "%" 或数字的 rationale / target 要有 source 或 baseline
import re
NUMERIC = re.compile(r'(\d+(\.\d+)?%|\d+[kKmM]?\b)')

def needs_source(text):
    return NUMERIC.search(text) is not None

if needs_source(ns.get('target', '')):
    if not ns.get('rationale') and not prd['problem']['business_value'].get('metric_baseline'):
        print(f"❌ north_star.target '{ns['target']}' 带数字但无基线 / rationale"); sys.exit(1)
```

---

## Stage 2 · fork-verifier（异步）

```
Agent(
  subagent_type="product-manager",
  model="opus",
  description="PRD skeptic review",
  prompt="""
  审查 PRD · 路径：<prd.yaml 路径>

  skeptic lens：
  1. 过度承诺吗？north_star target 能达到吗？
  2. non_goals 够狠吗？还有哪些诱惑未说明不做？
  3. north_star 是 outcome 还是 output？（付费 / 任务完成是 outcome；UV / 停留是 output）
  4. AC 真测得了吗？有没有"伪可测"？
  5. 下游 UI / dev 能不问就做吗？ui_brief / AC 足够具体吗？
  6. 风险矩阵覆盖全了吗？合规 / 性能 / 依赖？

  报告 ≤200 字，严重度排序。
  """
)
```

**备选**：`business-analyst`（商业视角）、`strategic-analyst`（战略视角）、`prompt-engineer`（如 PRD 涉及 AI 产品）。

---

## 失败处理（CLAUDE.md 失败升级协议）

- **第 1 次失败** → 看具体哪项失败 → 补 source / 补 AC / 补 non_goals → 重跑
- **第 2 次失败** → 换本质方法：
  - 找不到 source → 做一次 mini user research 再写
  - AC 写不测得出 → 和下游 dev 对齐 what can we observe
  - north star 选不出 → 开 30 分钟与利益相关方对齐
- **第 3 次失败** → 3 个假设：1. PRD 本身需求不成熟 2. schema 要求过严（考虑放宽特定字段）3. 工具 bug
- **第 4 次失败** → 暂停 AskUserQuestion

---

## 生成可读 Markdown（副产物）

harness 通过后，从 yaml 生成 Markdown 方便阅读 / 贴飞书 / 分享：

```bash
# harness 末尾加一段
python3 -c "
import yaml, os
with open(os.environ['PRD']) as f: d = yaml.safe_load(f)
md_path = os.environ['PRD'].replace('.yaml', '.md')
with open(md_path, 'w') as f:
    f.write(f'# {d[\"feature\"][\"title\"]}\n\n')
    f.write(f'**Owner**: {d[\"feature\"][\"owner\"]} · Status: {d[\"feature\"][\"status\"]}\n\n')
    f.write(f'## Problem\n{d[\"problem\"][\"user_pain\"][\"statement\"]}\n\n')
    # ... 按需展开
print(f'✓ markdown → {md_path}')
"
```

---

## Harness 速度预算

- Schema 校验：< 2 秒
- AC / 数据引用检查：< 2 秒
- Markdown 生成：< 2 秒
- **总计 < 10 秒**

Stage 2 异步 fork-verifier 不计入 harness 时间。
