# {模块名} · 测试计划

> 由 test-skill Step 3 产出。用户确认后才写测试。

## 1. 不变量（引用 Q1 答案）
- <行为 A 不能退化>
- <边界 B 的处理必须一致>

## 2. 用例清单（先写名字，后写实现）

### Happy Path
- [ ] `should return X when given normal input Y`
- [ ] `should call dependency Z with correct args`

### Edge Cases
- [ ] `should return 0 when empty input`
- [ ] `should handle max allowed value`
- [ ] `should handle unicode / special chars`

### Error Path
- [ ] `should throw ValidationError when input is null`
- [ ] `should propagate error when dependency fails`
- [ ] `should timeout after 5s`

### 参数化（如需）
- [ ] `should compute correctly for each [input, expected]`: 10 个 combinations

## 3. 风险矩阵

| 路径 | 影响 | 概率 | 优先级 | 是否覆盖 | 备注 |
|------|------|------|--------|----------|------|
| happy path 主干 | 高 | 高 | P0 | ✅ | 必测 |
| 并发条件 race | 高 | 中 | P1 | ✅ | 需 concurrent test |
| migration 失败 | 极高 | 低 | P0 | ✅ | 集成测试 + rollback |
| UI rendering 细节 | 低 | 中 | P3 | ❌ | 手测即可 |

## 4. 依赖策略

| 依赖 | 策略 | 理由 |
|------|------|------|
| MongoDB | testcontainers 真实 | 迁移能跑过才算过 |
| Stripe API | mock | 第三方，稳定的 contract |
| Redis | in-memory fake | 快 + 行为一致 |
| 本地 util 函数 | 真实调用 | 测公开契约 |

## 5. 覆盖率目标

- lines: ≥ 80%（全局）/ 100%（核心 `src/core/*`）
- branches: ≥ 70%
- 未覆盖区：
  - `src/utils/logger.ts` — log 格式化，手测过
  - `src/generated/*` — 自动生成代码

## 6. Mutation 范围

对 `src/core/*` 跑 mutation。预期全 killed；survived 需修或标注。

## 7. 层次分布

- 单元测试：约 N 个（主体）
- 集成测试：约 M 个（DB / API / 外部依赖）
- E2E：约 K 个（关键用户旅程）

## 8. 预估

- 测试文件数：~F 个
- 用例总数：~C 个
- 预计跑 harness 时长：< X 分钟

---

**等待用户确认此计划，确认后进入 Step 4 写测试。**
