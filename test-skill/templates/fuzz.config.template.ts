/**
 * test-skill · Fuzz 配置模板（TypeScript + fast-check + Vitest）
 *
 * 使用方式：
 *   1. cp ~/.claude/skills/gstack/test-skill/templates/fuzz.config.template.ts tests/fuzz/common.ts
 *   2. 按需修改 numRuns / arbitraries
 *   3. 在各测试文件里 `import { runs, evilString, jsonExtreme } from './common'`
 *
 * 参考：
 *   - references/fuzz-recipes.md · 四种 property 心法
 *   - references/attack-payloads.json · 可当 seed 喂给 shrinker
 */

import fc from 'fast-check';

// ─── 预算 ────────────────────────────────────────────────────────
// 默认 1000 跑。CI 环境变量覆盖：FUZZ_RUNS=5000 bun test
export const runs = Number(process.env.FUZZ_RUNS ?? 1000);
export const asyncRuns = Number(process.env.FUZZ_ASYNC_RUNS ?? 100);

// ─── 常用恶意字符串 arbitrary ──────────────────────────────────
// BiDi / 零宽 / emoji ZWJ / 非法 UTF-8 / 超长 / null byte
export const evilString = fc.oneof(
  { arbitrary: fc.string(), weight: 3 },
  { arbitrary: fc.unicodeString(), weight: 3 },
  // BiDi override
  { arbitrary: fc.string().map(s => '\u202E' + s + '\u202D'), weight: 1 },
  // 零宽空格
  { arbitrary: fc.string().map(s => s.split('').join('\u200B')), weight: 1 },
  // 超长（10KB · 小心别爆 CI 内存）
  { arbitrary: fc.string({ minLength: 8192, maxLength: 10_000 }), weight: 1 },
  // null byte 截断
  { arbitrary: fc.string().map(s => s + '\u0000.jpg'), weight: 1 },
  // 常见 XSS 种子
  { arbitrary: fc.constantFrom(
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '\'"><script>alert(1)</script>',
      'javascript:alert(1)'
    ), weight: 2 },
);

// ─── JSON 极端值 arbitrary ─────────────────────────────────────
// 专门用于测 JSON.parse 链路（qwenVlAdapter 级）
export const jsonExtreme = fc.oneof(
  fc.constantFrom(
    '{"confidence": NaN}',
    '{"score": Infinity}',
    '{"n": -0}',
    '{"a": 1,}',
    '{"a": 1, "a": 2}',
    '{"__proto__": {"isAdmin": true}}',
    '{"constructor": {"prototype": {"x": 1}}}',
    '',
    '{',
    '{"unterminated": "xxx',
    '\uFEFF{"a":1}',
  ),
  // 深嵌套 100 层（1000 层常常让 CI 超时）
  fc.integer({ min: 1, max: 100 }).map(depth => {
    let s = '0';
    for (let i = 0; i < depth; i++) s = `{"a":${s}}`;
    return s;
  }),
  // 随机字节流
  fc.uint8Array({ minLength: 0, maxLength: 1024 }).map(arr =>
    Buffer.from(arr).toString('utf-8')
  ),
);

// ─── 数值边界 arbitrary ────────────────────────────────────────
export const evilNumber = fc.oneof(
  fc.constantFrom(0, -0, 1, -1, NaN, Infinity, -Infinity),
  fc.constantFrom(
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_VALUE,
    Number.MIN_VALUE,
    2 ** 31,
    2 ** 31 - 1,
    2 ** 53,
  ),
  fc.double({ noNaN: false, noDefaultInfinity: false }),
  fc.integer(),
);

// ─── 日期/时间边界 arbitrary ───────────────────────────────────
export const evilDate = fc.oneof(
  fc.constantFrom(
    new Date(0),                          // 1970
    new Date(-1),                         // 负时间
    new Date(2 ** 31 * 1000),             // 2038 溢出
    new Date('9999-12-31T23:59:59Z'),     // 远未来
    new Date('2024-02-29T00:00:00Z'),     // 闰日
    new Date('2026-03-09T02:30:00-05:00'),// DST spring forward
    new Date('2016-12-31T23:59:60Z'),     // 闰秒
  ),
  fc.date({ min: new Date(0), max: new Date('2100-01-01') }),
);

// ─── 常见"合法但刁钻"的输入 ───────────────────────────────────
// 对 Kevin ding-director 的 disease_name / animal_type 特化
export const chineseDiseaseName = fc.oneof(
  fc.constantFrom(
    '非洲猪瘟',
    '口蹄疫',
    '高致病性禽流感（H5N1）',
    '布鲁氏菌病',
    '小反刍兽疫',
    '尼帕病毒性脑炎',
    // 边界：含括号 / 空格 / emoji
    '非洲猪瘟 (ASF)',
    '高致病性禽流感\u00A0H5N1',  // NBSP
    '🐷非洲猪瘟',
    '',
    ' ',
  ),
  fc.unicodeString({ minLength: 1, maxLength: 50 }),
);

// ─── Helper: 常用 assertion shim ──────────────────────────────
/**
 * 断言 `fn(input)` 不抛 **未声明** 异常。允许指定 allowedExceptions 白名单。
 */
export function assertNoUnexpectedThrow<T>(
  fn: (input: T) => unknown,
  allowedExceptions: Array<new (...args: unknown[]) => Error> = []
) {
  return (input: T): boolean => {
    try { fn(input); return true; }
    catch (e) {
      return allowedExceptions.some(Exc => e instanceof Exc);
    }
  };
}

// ─── 导出常用组合 ─────────────────────────────────────────────
export const propertyRun = <T>(arbitrary: fc.Arbitrary<T>, predicate: (value: T) => boolean) =>
  fc.assert(fc.property(arbitrary, predicate), { numRuns: runs, verbose: true });

export const asyncPropertyRun = <T>(
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => Promise<boolean>
) => fc.assert(fc.asyncProperty(arbitrary, predicate), { numRuns: asyncRuns, verbose: true });
