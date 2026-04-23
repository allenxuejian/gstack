# test-skill · Chaos Patterns · harness Step 5 追加轮

> 混沌工程 = "让它挂掉看怎么挣扎"。目标不是让测试通过，而是**发现系统在故障下真实行为**。
>
> ⚠️ **只在隔离环境执行**。永不对生产 DB / 真外部 API 做这些。

---

## 🎯 五大故障注入类别

| 类别 | 工具候选 | 典型故障 |
|---|---|---|
| **网络** | toxiproxy / pumba / tc / iptables | 延迟 / 丢包 / 断连 / 乱序 / 带宽限 |
| **时间** | sinon fakeTimers / libfaketime | DST 跳变 / 闰秒 / 时钟漂移 / 超时触发 |
| **进程 / 系统** | `kill -9` / `killall` / `stress-ng` | OOM / 磁盘满 / fd 耗尽 / CPU 100% |
| **数据库** | admin 命令 / migrations inject | 连接断 / 主从切换 / 锁 / 慢查询 |
| **并发 / Race** | Promise.all N / threads / asyncio | 双花 / TOCTOU / 事务隔离违反 |

---

## 🌐 1. 网络故障（toxiproxy · 最实用）

**toxiproxy** 是 Shopify 开源的 TCP 代理，在应用和下游之间插一层，通过 HTTP API 注入故障。

### 安装 + 启动
```bash
# mac
brew install toxiproxy
toxiproxy-server &
toxiproxy-cli create mongo -l localhost:27018 -u localhost:27017
```

### 常用故障
```bash
# 延迟 2 秒
toxiproxy-cli toxic add mongo -t latency -a latency=2000

# 断连（直接拒绝新连接）
toxiproxy-cli toxic add mongo -t down

# 带宽限 1KB/s（模拟差网络）
toxiproxy-cli toxic add mongo -t bandwidth -a rate=1

# 下游被截断一半数据
toxiproxy-cli toxic add mongo -t slice_close -a average_size=100 -a size_variation=50

# 清除
toxiproxy-cli toxic remove mongo -n <toxic_name>
```

### Vitest 集成示例
```ts
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import Toxiproxy from 'toxiproxy-node-client';

const tp = new Toxiproxy('http://localhost:8474');

describe('chaos · MongoDB 2s latency', () => {
  let proxy;
  beforeAll(async () => {
    proxy = await tp.createProxy({ name: 'mongo_test', upstream: 'localhost:27017', listen: 'localhost:27018' });
    await proxy.addToxic({ name: 'delay', type: 'latency', attributes: { latency: 2000 } });
  });
  afterAll(() => proxy.remove());

  it('diagnosisController retries gracefully under 2s DB latency', async () => {
    // 连接到 toxiproxy:27018 而不是 mongo:27017
    const res = await apiCall('/api/diagnosis/image', { /* ... */ });
    expect(res.status).toBe(200);  // 不能挂
    expect(res.meta.retried).toBe(true); // 应该有重试
  });
});
```

### 备选：pumba（docker 环境）
```bash
pumba netem --duration 30s delay --time 3000 <container>
pumba netem --duration 30s loss --percent 20 <container>
pumba kill <container>
```

---

## ⏰ 2. 时间故障

### JavaScript · sinon fakeTimers
```ts
import sinon from 'sinon';

it('handles DST spring forward', () => {
  const clock = sinon.useFakeTimers(new Date('2026-03-09T01:59:00-05:00'));
  const before = getScheduleForToday();
  clock.tick(2 * 60 * 1000); // 跨越 DST 边界
  const after = getScheduleForToday();
  expect(after.length).toBe(before.length); // 不能因 DST 跳失任务
  clock.restore();
});

it('handles 2038 overflow', () => {
  const clock = sinon.useFakeTimers(new Date('2038-01-19T03:14:07Z'));
  const ts = getTimestamp();
  expect(ts).toBeGreaterThan(0); // 不溢出为负
  clock.restore();
});
```

### Python · freezegun
```python
from freezegun import freeze_time

@freeze_time("2024-02-29 23:59:59")
def test_leap_day():
    assert tomorrow() == date(2024, 3, 1)
```

### 系统级 · libfaketime
```bash
LD_PRELOAD=/usr/lib/libfaketime.so FAKETIME='2038-01-20 00:00:00' ./my-app
```

---

## 💀 3. 进程 / 系统故障

### OOM 模拟
```bash
# 分配 1GB 不释放
stress-ng --vm 1 --vm-bytes 1G --timeout 30s
```

### fd 耗尽
```bash
ulimit -n 10  # 限制最多 10 个 fd
./my-app &
# 压测看应用是否正确处理 EMFILE
```

### 磁盘满
```bash
# 创建 1GB 临时文件填满 /tmp（在隔离环境）
dd if=/dev/zero of=/tmp/filler bs=1M count=1024
# 或创建 1GB tmpfs 并挂载
```

### 强杀进程
```bash
# 在写入中途 kill
./my-app &
PID=$!
sleep 2  # 让它开始处理请求
kill -9 $PID
# 重启后检查数据一致性
```

---

## 🗄️ 4. 数据库故障

### MongoDB
```bash
# 测试中切换 primary（副本集环境）
mongosh --eval "rs.stepDown()"

# 杀连接
mongosh admin --eval "db.killOp(<opId>)"

# 慢查询模拟：注入 $where 带 sleep
db.coll.find({ $where: 'sleep(5000) || true' })
```

### Postgres
```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='testdb';
-- 主从切换
SELECT pg_promote();
```

### Redis
```bash
redis-cli DEBUG SLEEP 5      # 卡 5 秒
redis-cli CLIENT KILL <addr>  # 杀连接
redis-cli DEBUG OOM          # 强制 OOM 响应
```

---

## 🏃 5. 并发 / Race

Kevin 踩过 issue #8（BudgetGuard CAS race），必测。

### 通用模板 · N 个并发写同一资源
```ts
import { describe, it, expect } from 'vitest';

describe('chaos · race · budgetGuard', () => {
  it('100 concurrent reserve($10) against budget=$500 never overspends', async () => {
    await seedBudget(500);
    const attempts = Array(100).fill(0).map(() => reserveBudget(10));
    const results = await Promise.allSettled(attempts);
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    expect(succeeded).toBeLessThanOrEqual(50); // 500/10
    const finalBudget = await getRemainingBudget();
    expect(finalBudget).toBeGreaterThanOrEqual(0); // 不能出现负预算（双花）
    expect(finalBudget + succeeded * 10).toBe(500); // 守恒
  });
});
```

### TOCTOU 模式
```ts
it('check-then-act race on username uniqueness', async () => {
  const [r1, r2] = await Promise.allSettled([
    registerUser({ username: 'same' }),
    registerUser({ username: 'same' }),
  ]);
  const successes = [r1, r2].filter(r => r.status === 'fulfilled').length;
  expect(successes).toBe(1); // 绝不能两个都成功
});
```

### 循环多次跑（race 是概率性的，跑 1 次可能偶过）
```ts
for (let i = 0; i < 20; i++) {
  await runRaceScenario();  // 每次都必须断言
}
```

---

## 🧰 chaos-harness.sh 结构

见 `templates/chaos-harness.sh`。大致是在标准 harness 之后追加：

```bash
# Step 4 · Chaos Round
echo "[4/5] chaos round · network + time + DB..."
toxiproxy-cli create ... && sleep 1
TEST_DB_PROXY=localhost:27018 bun test tests/chaos/**/*.test.ts

# Step 5 · Race Round
echo "[5/5] race round · N=100 concurrent..."
bun test tests/race/**/*.test.ts --repeat 20 # 反复跑以抓概率性 bug
```

---

## 📝 Chaos 报告模板

```markdown
## Chaos Round · {project} · {YYYY-MM-DD}

### 测试场景
- 网络：MongoDB 2s latency / 完全断连 / 20% 丢包
- 时间：DST spring forward / 2038 overflow / 闰日
- 进程：master kill -9 / fd=10 耗尽
- DB：连接池耗尽 / 慢查询 / 主从切换
- Race：budgetGuard 100 并发 × 20 轮

### 发现的问题
- [P0] 网络断连后 API 永不 recover（需重启服务）· file:line
- [P1] DST 跳变时调度任务少执行 1 次 · file:line
- [P1] kill -9 master 后 lock 文件未清理 · file:line

### 未触发的场景（模型正常）
- 2038 overflow 正确降级
- 闰日日期处理正确
- 100 并发 budget 守恒（issue #8 修复有效）
```

---

## 🚫 红线
- **NEVER** 在生产环境跑 chaos
- **NEVER** 让 chaos 测试连真外部 API（成本 + ToS）
- **NEVER** 把 toxiproxy / pumba 端口暴露公网
- **CRITICAL** chaos 找到的 bug 必须进 gap-tracking，不许只在测试报告里自嗨

---

## 🔗 See also
- `templates/chaos-harness.sh` · harness 追加轮脚本
- `references/harness.md` · 标准 harness 三步门禁
- `references/threat-modeling.md` · 并发 / 故障类威胁作为 STRIDE 的 D
- toxiproxy · https://github.com/Shopify/toxiproxy
- pumba · https://github.com/alexei-led/pumba
- chaos-toolkit · https://chaostoolkit.org/（大型编排）
