# ui-skill · Harness 适配指南

两阶段验证门禁：
1. **静态检查**（< 10 秒）— HTML 语法 / 变体数量 / Tweaks / handoff schema
2. **Playwright smoke**（< 30 秒）— 打开页面 / console.error == 0 / 截图回传

Stage 2 是异步 fork-verifier，不等。

---

## Stage 1 静态检查

### 检查项

1. **HTML parse**：用 Python `html.parser` 或 `xmllint --html` 能解析不报错
2. **≥3 variants**：正则扫描 `option-a/b/c` 或 `variant-1/2/3` 或 `<section data-variant=` 至少出现 3 次
3. **Tweaks 块**：
   - 如果代码里用了 Tweaks：`/*EDITMODE-BEGIN*/.../*EDITMODE-END*/` 有且仅有 1 处
   - 块内必须是合法 JSON（双引号 key / 双引号 string）
4. **Style 对象命名**：grep 不能出现 `const styles = {` 裸名
5. **pinned 版本**：React / Babel script 必须带 integrity 属性
6. **Handoff YAML**：如果 `.design/*/handoff.yaml` 存在，校验对 `_shared/schemas/handoff-schema.yaml`

### 实现模板

```bash
# 静态段（harness.sh.template 的 Stage 1）
python3 <<'PY'
import re, sys, os, json
from html.parser import HTMLParser

FILE = os.environ['PROTO']
with open(FILE) as f:
    html = f.read()

# 1. HTML parse
class SilentParser(HTMLParser): pass
try: SilentParser().feed(html)
except Exception as e:
    print(f"❌ HTML parse: {e}"); sys.exit(1)

# 2. variants ≥ 3
variants = len(re.findall(r'(option-[a-c]|variant-[1-9]|data-variant=)', html, re.I))
if variants < 3:
    print(f"❌ only {variants} variants (need ≥3)"); sys.exit(1)

# 3. Tweaks block（if present）
tweaks = re.findall(r'/\*EDITMODE-BEGIN\*/(.*?)/\*EDITMODE-END\*/', html, re.S)
if tweaks:
    if len(tweaks) > 1:
        print(f"❌ multiple EDITMODE blocks (must be exactly 1)"); sys.exit(1)
    try: json.loads(tweaks[0].strip())
    except Exception as e:
        print(f"❌ EDITMODE block not valid JSON: {e}"); sys.exit(1)

# 4. naming collision protection
if re.search(r'\bconst\s+styles\s*=\s*\{', html):
    print(f"❌ found `const styles = {{`（会导致命名冲突）"); sys.exit(1)

# 5. pinned versions with integrity
scripts = re.findall(r'<script[^>]*src="[^"]*(?:react|babel)[^"]*"[^>]*>', html)
for s in scripts:
    if 'integrity=' not in s:
        print(f"❌ missing integrity: {s[:80]}"); sys.exit(1)

print("✅ static checks passed")
PY
```

---

## Stage 1 动态（Playwright）

### 首次运行自动装 chromium

```bash
# 检测 playwright / chromium 是否已装
if ! bunx playwright --version > /dev/null 2>&1; then
  echo "  → installing playwright..."
  bun add -D playwright
fi
if [ ! -d ~/Library/Caches/ms-playwright/chromium* ] 2>/dev/null && \
   [ ! -d ~/.cache/ms-playwright/chromium* ] 2>/dev/null; then
  echo "  → installing chromium (首次 ~100MB)..."
  bunx playwright install chromium
fi
```

### 核心检查脚本

```javascript
// playwright-smoke.mjs
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.resolve(process.argv[2] || 'prototype.html');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', r => {
    // 忽略 file:// 本地资源（期望的）
    if (!r.url().startsWith('file://')) errors.push(`req failed: ${r.url()}`);
  });

  await page.goto(url);
  await page.waitForTimeout(1500);  // 让 React 渲染
  await page.screenshot({ path: 'harness-screenshot.png', fullPage: true });
  await browser.close();

  if (errors.length) {
    console.error('❌ runtime errors:');
    errors.forEach(e => console.error('  ' + e));
    process.exit(1);
  }
  console.log('✅ no console errors · screenshot → harness-screenshot.png');
})();
```

### 截图回传给用户

Claude Code 里用 `Read` 工具打开 `harness-screenshot.png` —— Claude 能直接 "看到"（多模态）。相当于 Claude Design 原 prompt 里 `show_to_user`。

---

## Stage 2 · fork-verifier（异步）

```
Agent(
  subagent_type="ui-designer",
  model="opus",
  description="UI review fork",
  prompt="""
  审查本轮 UI 原型 · 文件：<prototype.html 路径>

  重点：
  1. 视觉层级（主次关系明确？）
  2. 对比度 / 可读性（WCAG AA？）
  3. 变体差异是否实质（不是换色装饰）
  4. 符合上下文约束（设计系统 / 品牌色使用）
  5. 交互 feedback 是否完整（hover / click / error 状态）

  报告 ≤200 字，严重度标记。
  """
)
```

**备选 subagent**：
- `ux-designer`（偏用户视角）
- `frontend-design`（偏工程可行性）
- `brand-guidelines`（涉及品牌严格度）

---

## 失败处理（CLAUDE.md 失败升级协议）

- **第 1 次失败** → 读错误日志 → 修 HTML / 补变体 / 改 JSON → 重跑
- **第 2 次失败** → 换本质方法：
  - 从 pinned versions 完全重来（别改 integrity）
  - 从 starter 重新搭骨架
  - 拆文件（多 babel script + window.* 挂载）
- **第 3 次失败** → 3 个假设：1. CDN 挂了 2. Playwright 版本不兼容 3. 本地文件路径有空格
- **第 4 次失败** → 暂停 AskUserQuestion

**常见故障**：
| 症状 | 原因 | 修 |
|------|------|-----|
| `Cannot use import statement outside a module` | 用了 `type="module"` | 去掉 |
| `styles is undefined` | 两个 babel script 都定义 `const styles` | 改 `cardStyles` / `buttonStyles` |
| blank screen, no console error | React root 没挂 | 检查 `<div id="root">` + `createRoot` |
| "failed to fetch" integrity | CDN 返回不同 bytes | 不要改 integrity，等 CDN 恢复 |

---

## Harness 速度预算

- 静态：< 10 秒
- Playwright（含冷启动 chromium）：首次 ~15 秒 / 后续 < 5 秒
- **总计 < 30 秒**

如果 > 1 分钟拆 `harness-ui-full.sh`（含多 viewport 截图 / 交互 flow 录制）。
