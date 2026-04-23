# test-skill · Fuzz Recipes · Round B 专用

> Round A 是你"想得到的攻击"，Round B 是"你想不到的"。把随机性 + shrinking 当第三个眼睛用。

---

## 🎯 Fuzz 的四种 Property 心法

写 fuzz 不是"丢随机数看崩不崩"——这叫 monkey。**Property-based testing** 的灵魂是找**必须成立的数学性质**：

| 性质 | 含义 | 例子 |
|---|---|---|
| **Idempotence（幂等）** | f(f(x)) == f(x) | `sanitize(sanitize(s)) == sanitize(s)`；`dedupe(dedupe(arr)) == dedupe(arr)` |
| **Reversibility（可逆）** | decode(encode(x)) == x | `JSON.parse(JSON.stringify(obj))` 应近似 == obj（时区/Date 除外）；`base64Decode(base64Encode(s)) == s` |
| **Commutativity（可交换）** | f(x,y) == f(y,x) | `union(a, b) == union(b, a)`；排序/合并操作 |
| **Oracle（参考实现对比）** | f_new(x) == f_ref(x) | 新版实现与旧版对跑；自己实现 vs 第三方库 |

还有**单元不变量**：
- 排序后顺序不变 `sorted(arr).length === arr.length`
- 过滤不引入新元素 `filter(arr, p).every(x => arr.includes(x))`
- 解析不崩 `() => parse(anyInput)` 不抛未声明异常
- 幅度守恒 `sum(mapped) === sum(arr) * factor`

**Kevin 项目实战 property 示例**：
- `qwenVlAdapter.parseResponse(x)` · 永不抛未捕获异常（只能返回 ok/insufficient/low_confidence）
- `escapeHtml(x)` · 幂等：`escapeHtml(escapeHtml(x)) === escapeHtml(x)`（放松版：两次后稳定）
- `budgetGuard.reserveCas(b, amt)` · 并发 N 次每次 reserve k，总 spent ≤ budget（无双花）
- `safeUrl(x)` · 对任何字符串要么返回 ''，要么返回 http(s)

---

## 🧰 三大栈快手模板

### TypeScript · fast-check + vitest

```ts
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../src/utils/escape';

describe('escapeHtml · property', () => {
  it('idempotent: escapeHtml twice == once', () => {
    fc.assert(
      fc.property(fc.string(), s => escapeHtml(escapeHtml(s)) === escapeHtml(s)),
      { numRuns: 1000, verbose: true }
    );
  });

  it('never contains raw < > " \' & after escape', () => {
    fc.assert(
      fc.property(fc.string(), s => {
        const out = escapeHtml(s);
        return !/[<>"'&](?!(?:amp|lt|gt|quot|#39);)/.test(out);
      }),
      { numRuns: 2000 }
    );
  });

  it('unicode + emoji + BiDi stay safe', () => {
    const evilString = fc.oneof(
      fc.unicodeString(),
      fc.string().map(s => '\u202E' + s + '\u202D'),
      fc.string().map(s => s + '\u200B' + s),
    );
    fc.assert(
      fc.property(evilString, s => typeof escapeHtml(s) === 'string'),
      { numRuns: 1000 }
    );
  });
});

// Oracle：新旧实现对跑
describe('diagnoseNew · oracle vs v4', () => {
  it('same input produces same top-1 disease as legacy', () => {
    fc.assert(
      fc.asyncProperty(validDiagnosisInput, async input => {
        const [oldR, newR] = await Promise.all([diagnoseV4(input), diagnoseV5(input)]);
        expect(newR.top1.disease).toBe(oldR.top1.disease);
      }),
      { numRuns: 100 } // 慢路径 · 少跑点
    );
  });
});
```

**常用 arbitrary**：
```ts
fc.string()            // ASCII
fc.unicodeString()     // Unicode
fc.nat()               // 0..2^31
fc.integer({ min, max })
fc.double({ noNaN, noDefaultInfinity }) // 开 noNaN:false 专门测 NaN
fc.record({ id: fc.nat(), name: fc.string() })
fc.array(fc.nat(), { minLength, maxLength })
fc.oneof(a1, a2, a3)   // union
fc.tuple(a1, a2)
fc.constant(x)
fc.json()              // 任意 JSON 值（含嵌套）
fc.date({ min, max })  // Date · 含 DST 边界
```

### Python · hypothesis + pytest

```python
from hypothesis import given, strategies as st, settings, example
from src.sanitize import sanitize

@given(st.text())
@settings(max_examples=1000, deadline=None)
@example('')
@example('<script>alert(1)</script>')
@example('\u202E' + 'evil' + '\u202D')  # BiDi
def test_sanitize_idempotent(s):
    assert sanitize(sanitize(s)) == sanitize(s)

@given(st.text(min_size=0, max_size=10_000))
def test_sanitize_no_raw_script_tag(s):
    out = sanitize(s)
    assert '<script' not in out.lower()

# Oracle 模式
@given(st.lists(st.integers(), min_size=0, max_size=100))
def test_mysort_matches_stdlib(arr):
    assert my_sort(arr) == sorted(arr)
```

### Node.js (generic) · jazzer.js（覆盖率制导 fuzz · 更接近 AFL）

```js
// fuzz/target.js
const { parseDisease } = require('../src/parser');

module.exports.fuzz = (buffer) => {
  const input = buffer.toString();
  try {
    parseDisease(input);
  } catch (e) {
    // 只允许特定的 expected exception
    if (!(e instanceof SyntaxError || e instanceof ValidationError)) {
      throw e; // 报告 crash
    }
  }
};
// npx jazzer fuzz/target.js corpus/ --sync -- -max_total_time=60
```

---

## ⚙️ Shrinking 的威力

找到反例后，fast-check/hypothesis 会自动**最小化**到最短复现。

例：丢 1M 个随机字符 crash → shrinker 缩到 `"'><"` 这样的 3 字符反例。**永远用 shrinking**，不要 seed 固定。

查看最小反例：`VITEST_FUZZ_VERBOSE=1 bun test`。

---

## 📦 反例永久化 · CRITICAL

Fuzz 找到的反例 **必须压入永久 regression**，否则下次修 bug 容易回归。

```ts
// tests/regression/fuzz-findings.test.ts
describe('regression · fuzz findings', () => {
  // commit abc123 · fuzz 2026-04-22 · qwenVlAdapter parses empty JSON confidence
  it('parseResponse on empty confidence does not throw', () => {
    expect(() => parseResponse('{"confidence":}')).not.toThrow();
  });

  // commit def456 · BiDi override crashes sanitize
  it('sanitize handles U+202E override', () => {
    expect(sanitize('\u202Etext\u202D')).toMatch(/^[^\u202E]*$/);
  });
});
```

命名格式：`commit-hash · 发现时间 · 一句描述`。每条反例一个 `it`。

---

## 🎛️ 预算与速度

| 场景 | numRuns | 时长 |
|---|---|---|
| 冒烟 | 100 | < 5 秒 |
| 常规 CI | 1000 | < 30 秒 |
| 深度 | 5000 | < 3 分钟 |
| nightly | 50000 | < 30 分钟 |

项目默认 `numRuns: 1000`。关键路径（payment/auth/LLM）提到 2000-5000。

---

## 🚫 反模式

- ❌ **没 property，只 `() => f(x)` 跑 1000 次**——这是 monkey，不叫 fuzz
- ❌ **Property 里不断言**——`fc.property(s => { doStuff(s); return true; })` 等于没测
- ❌ **seed 固定不 shrinking**——错过最小反例
- ❌ **反例不永久化**——bug 还能回归
- ❌ **把 fuzz 跑在真生产 DB 上**——数据会被灌脏

---

## 🔗 See also
- `templates/fuzz.config.template.ts` · fast-check + vitest 起手模板
- `references/attack-payloads.json` · 载荷库 · 适合当 seed
- `references/threat-modeling.md` · 威胁矩阵 · 决定 fuzz 哪些接口
- fast-check 官方文档 https://fast-check.dev/
- hypothesis 官方文档 https://hypothesis.readthedocs.io/
- jazzer.js https://github.com/CodeIntelligenceTesting/jazzer.js
