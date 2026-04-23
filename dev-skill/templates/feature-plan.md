# {Feature 名} · 实现计划

> 由 dev-skill Step 3 产出。给用户确认后才进入 Step 4 写代码。

## 1. 不变量（引用 Q1 答案）
- <行为 A 不能退化>
- <行为 B 的 SLA 不能降>

## 2. 文件树改动

```
src/
├── foo/
│   ├── bar.ts          [NEW]    新增 barFn
│   ├── baz.ts          [EDIT]   signature 变化
│   └── baz.old.ts      [BACKUP] 大改前的原版
└── tests/
    └── bar.test.ts     [NEW]    happy + edge + error 三类
```

## 3. 每文件 diff 草图

### src/foo/bar.ts（NEW）
```ts
// 只写签名和 TODO，对齐后再填实现
export function barFn(input: BarInput): BarResult {
  // TODO: 实现 xxx 逻辑
}
```

### src/foo/baz.ts（EDIT）
```diff
- export function bazFn(x: string): void
+ export function bazFn(x: string, opts?: BazOpts): BazResult
```

## 4. 新增依赖
- `<pkg@version>` — 理由：<为什么需要，不能用现有替代>
- （如无则写「无」）

## 5. 变体维度（Tweaks）

能切换的：
- `BAZ_MODE` env var：`fast` / `safe` 两种（默认 safe）
- 其它可选开关 ...

## 6. 验证标准

Harness 要全绿（lint + typecheck + test + build）。

新测试：
- happy path: <具体用例>
- edge case: <边界值 / 空输入 / 最大值>
- error path: <错误输入应抛的异常>

## 7. 回滚策略
- <单 PR revert 即可 / 需 DB migration down / feature flag 关>

## 8. 预估

- 代码量：~N 行
- 测试：~M 个 case
- 预计耗时：<数字>

---

**等待用户确认此计划，确认后进入 Step 4 写代码。**
